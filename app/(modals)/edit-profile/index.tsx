import { BaseText } from "@/components";
import { DynamicFieldItem } from "@/models";
import { ProfileFormData, ProfileFormScreen } from "@/screens/auth/ProfileFormScreen";
import { toE164 } from "@/utils/helper/phoneUtils";
import { useUpdateProfileFull } from "@/utils/hook";
import { UpdateProfileFullBody } from "@/utils/service/models/RequestModels";
import { People } from "@/utils/service/models/ResponseModels";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { UseFormHandleSubmit } from "react-hook-form";
import { Alert, TouchableOpacity } from "react-native";

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
    phones?: Array<{ type: string; value: string }>;
    emails?: Array<{ type: string; value: string }>;
    addresses?: Array<{ type: string; value: string }>;
    urls?: Array<{ type: string; value: string }>;
}

export default function EditProfileScreen() {
    const navigation = useNavigation();
    const params = useLocalSearchParams<{ profile?: string }>();

    // Parse profile data from params
    const profile: People | null = useMemo(() => {
        if (params.profile) {
            try {
                return JSON.parse(params.profile);
            } catch {
                return null;
            }
        }
        return null;
    }, [params.profile]);

    const formRef = useRef<ProfileFormRef | null>(null);

    const { mutate: updateProfile, isPending } = useUpdateProfileFull(
        () => {
            router.back();
        },
        (error) => {
            Alert.alert("Error", error?.message || "Failed to update profile. Please try again.");
        },
    );

    const handleFormReady = useCallback((form: ProfileFormRef) => {
        formRef.current = form;
    }, []);

    const handleSave = useCallback(() => {
        if (!formRef.current) {
            return;
        }

        formRef.current.handleSubmit(
            (data: ProfileFormData) => {
                const formData = formRef.current?.getFormData();
                if (!formData) {
                    return;
                }

                // Build metadata object from dynamic fields
                const metadataObject: MetadataObject = {};

                if (formData.phones?.length > 0) {
                    const phonesData = formData.phones
                        .map((phone) => {
                            // Ensure phone value is in E.164 format
                            const e164Value = phone.value ? toE164(String(phone.value)) || String(phone.value) : "";
                            return {
                                type: String(phone.label),
                                value: e164Value,
                            };
                        })
                        .filter((phone) => phone.value);
                    if (phonesData.length > 0) metadataObject.phones = phonesData;
                }

                if (formData.emails?.length > 0) {
                    const emailsData = formData.emails
                        .map((email) => ({
                            type: String(email.label),
                            value: String(email.value),
                        }))
                        .filter((email) => email.value);
                    if (emailsData.length > 0) metadataObject.emails = emailsData;
                }

                if (formData.addresses?.length > 0) {
                    const addressesData = formData.addresses
                        .map((address) => {
                            const value =
                                typeof address.value === "string"
                                    ? address.value
                                    : typeof address.value === "object" && address.value !== null
                                      ? JSON.stringify(address.value)
                                      : String(address.value);
                            return { type: String(address.label), value };
                        })
                        .filter((address) => address.value && address.value !== "[object Object]");
                    if (addressesData.length > 0) metadataObject.addresses = addressesData;
                    // Debug: what we send for addresses
                    if (__DEV__) {
                        console.log("[EditProfile] addresses from form (raw):", JSON.stringify(formData.addresses, null, 2));
                        console.log("[EditProfile] addresses to API:", JSON.stringify(addressesData, null, 2));
                    }
                }

                if (formData.urls?.length > 0) {
                    const urlsData = formData.urls
                        .map((url) => ({
                            type: String(url.label),
                            value: String(url.value),
                        }))
                        .filter((url) => url.value);
                    if (urlsData.length > 0) metadataObject.urls = urlsData;
                }

                // Always send metadata: new from form, or preserve existing so backend does not overwrite with null
                const profileMetadata = profile ? (profile as People & { metadata?: string | Record<string, any> | null }).metadata : undefined;
                const metadataValue =
                    Object.keys(metadataObject).length > 0
                        ? JSON.stringify(metadataObject)
                        : profileMetadata != null
                          ? typeof profileMetadata === "string"
                            ? profileMetadata
                            : JSON.stringify(profileMetadata)
                          : undefined;

                const payload: UpdateProfileFullBody = {
                    first_name: data.first_name,
                    last_name: data.last_name,
                    ...(data.birth_date && { birth_date: data.birth_date }),
                    ...(data.gender && { gender: data.gender.toLowerCase() as "male" | "female" | "other" }),
                    ...(metadataValue !== undefined && { metadata: metadataValue }),
                    ...(formData.uploadedFilename && { profile_photo: formData.uploadedFilename }),
                };

                updateProfile(payload);
            },
            () => {
                // Validation failed - errors are handled by form
            },
        )();
    }, [updateProfile]);

    // Set header right button
    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity onPress={handleSave} disabled={isPending} className="px-2">
                    <BaseText type="Body" weight="600" color={isPending ? "labels.tertiary" : "system.blue"}>
                        Save
                    </BaseText>
                </TouchableOpacity>
            ),
        });
    }, [navigation, handleSave, isPending]);

    return <ProfileFormScreen mode="edit" initialData={profile} title="Edit Profile" subtitle="Update your profile information." onFormReady={handleFormReady} />;
}
