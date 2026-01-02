import { DynamicFieldItem } from "@/models";
import { ProfileFormData, ProfileFormScreen } from "@/screens/auth/ProfileFormScreen";
import { useUpdateProfileFull } from "@/utils/hook";
import { UpdateProfileFullBody } from "@/utils/service/models/RequestModels";
import { Button, Host } from "@expo/ui/swift-ui";
import { router, useNavigation } from "expo-router";
import React, { useCallback, useLayoutEffect, useRef } from "react";
import { UseFormHandleSubmit } from "react-hook-form";

export default function CompleteProfile() {
    const formRef = useRef<{
        handleSubmit: UseFormHandleSubmit<ProfileFormData>;
        getFormData: () => {
            formData: ProfileFormData;
            phones: DynamicFieldItem[];
            emails: DynamicFieldItem[];
            addresses: DynamicFieldItem[];
            urls: DynamicFieldItem[];
            uploadedFilename: string | null;
        };
    } | null>(null);
    const navigation = useNavigation();

    const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfileFull(() => {
        router.push("/(auth)/select-role");
    });

    const handleFormReady = useCallback((form: any) => {
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
                        const phonesData = formData.phones.length > 0 ? formData.phones.map((phone) => ({ label: phone.label, value: typeof phone.value === "string" ? phone.value : "" })) : undefined;
                        const emailsData = formData.emails.length > 0 ? formData.emails.map((email) => ({ label: email.label, value: typeof email.value === "string" ? email.value : "" })) : undefined;
                        const addressesData = formData.addresses.length > 0 ? formData.addresses.map((address) => ({ label: address.label, value: address.value })) : undefined;
                        const urlsData = formData.urls.length > 0 ? formData.urls.map((url) => ({ label: url.label, value: typeof url.value === "string" ? url.value : "" })) : undefined;

                        // Build metadata object
                        const metadataObject: any = {};
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
                    console.log("Validation errors:", errors);
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
        });
    }, [navigation, handleNext, isUpdating]);

    return <ProfileFormScreen mode="create" title="Complete Your Profile" subtitle="Start by completing your profile." onFormReady={handleFormReady} />;
}

CompleteProfile.displayName = "CompleteProfile";
