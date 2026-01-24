import { DynamicFieldItem } from "@/models";
import { ProfileFormData, ProfileFormScreen } from "@/screens/auth/ProfileFormScreen";
import { toE164 } from "@/utils/helper/phoneUtils";
import { useUpdateProfileFull } from "@/utils/hook";
import { UpdateProfileFullBody } from "@/utils/service/models/RequestModels";
import { Button, Host } from "@expo/ui/swift-ui";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useCallback, useLayoutEffect, useRef } from "react";
import { UseFormHandleSubmit } from "react-hook-form";
import { Alert } from "react-native";

interface ProfileFormRef {
    handleSubmit: UseFormHandleSubmit<ProfileFormData>;
    getFormData: () => {
        formData: ProfileFormData;
        phones: DynamicFieldItem[];
        emails: DynamicFieldItem[];
        addresses: DynamicFieldItem[];
        urls: DynamicFieldItem[];
        uploadedFilename: string | null;
    };
}

interface MetadataObject {
    phones?: Array<{ label: string; value: string }>;
    emails?: Array<{ label: string; value: string }>;
    addresses?: Array<{ label: string; value: string }>;
    urls?: Array<{ label: string; value: string }>;
}

export default function CompleteProfile() {
    const formRef = useRef<ProfileFormRef | null>(null);
    const navigation = useNavigation();
    const params = useLocalSearchParams<{ requireCompleteProfile?: string }>();
    const requireCompleteProfile = params.requireCompleteProfile === "1";

    const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfileFull(
        () => {
            router.push("/(auth)/select-role");
        },
        (error) => {
            Alert.alert("Error", error?.message || "Failed to update profile. Please try again.");
        },
    );

    const handleFormReady = useCallback((form: ProfileFormRef) => {
        formRef.current = form;
    }, []);

    const handleNext = useCallback(() => {
        if (formRef.current?.handleSubmit) {
            // Use handleSubmit from react-hook-form to trigger validation
            formRef.current.handleSubmit(
                (data: ProfileFormData) => {
                    // Validation successful, get all form data
                    const formData = formRef.current?.getFormData();
                    if (formData) {
                        // Map DynamicFieldItem arrays to the format expected by API and include in metadata
                        const phonesData =
                            formData.phones.length > 0
                                ? formData.phones
                                      .map((phone) => {
                                          // Ensure phone value is in E.164 format
                                          const phoneValue = typeof phone.value === "string" ? phone.value : "";
                                          const e164Value = phoneValue ? toE164(phoneValue) || phoneValue : "";
                                          return {
                                              label: phone.label,
                                              value: e164Value,
                                          };
                                      })
                                      .filter((phone) => phone.value) // Filter out empty values
                                : undefined;
                        const emailsData = formData.emails.length > 0 ? formData.emails.map((email) => ({ label: email.label, value: typeof email.value === "string" ? email.value : "" })) : undefined;
                        const addressesData =
                            formData.addresses.length > 0
                                ? formData.addresses
                                      .map((address) => ({
                                          label: address.label,
                                          value: typeof address.value === "string" ? address.value : JSON.stringify(address.value),
                                      }))
                                      .filter((address) => address.value)
                                : undefined;
                        const urlsData = formData.urls.length > 0 ? formData.urls.map((url) => ({ label: url.label, value: typeof url.value === "string" ? url.value : "" })) : undefined;

                        // Build metadata object
                        const metadataObject: MetadataObject = {};
                        if (phonesData) metadataObject.phones = phonesData;
                        if (emailsData) metadataObject.emails = emailsData;
                        if (addressesData) metadataObject.addresses = addressesData;
                        if (urlsData) metadataObject.urls = urlsData;

                        const payload: UpdateProfileFullBody = {
                            first_name: data.first_name,
                            last_name: data.last_name,
                            ...(data.birth_date && { birth_date: data.birth_date }),
                            // Ensure gender is lowercase for backend
                            ...(data.gender && { gender: data.gender.toLowerCase() as "male" | "female" | "other" }),
                            ...(Object.keys(metadataObject).length > 0 && { metadata: JSON.stringify(metadataObject) }),
                            ...(formData.uploadedFilename && { profile_photo: formData.uploadedFilename }),
                        };
                        updateProfile(payload);
                    }
                },
                (errors) => {
                    // Validation failed - errors are handled by form
                },
            )();
        }
    }, [updateProfile]);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <Host style={{ width: 65, height: 35 }}>
                    <Button onPress={handleNext} disabled={isUpdating}>
                        {isUpdating ? "Next" : "Next"}
                    </Button>
                </Host>
            ),
            ...(requireCompleteProfile && {
                headerLeft: () => null,
                gestureEnabled: false,
                fullScreenGestureEnabled: false,
            }),
        });
    }, [navigation, handleNext, isUpdating, requireCompleteProfile]);

    return <ProfileFormScreen mode="create" title="Complete Your Profile" subtitle="Start by completing your profile." onFormReady={handleFormReady} />;
}

CompleteProfile.displayName = "CompleteProfile";
