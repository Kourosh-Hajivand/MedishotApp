import { BaseText } from "@/components";
import { ProfileFormData, ProfileFormScreen } from "@/screens/auth/ProfileFormScreen";
import { toE164 } from "@/utils/helper/phoneUtils";
import { useUpdateProfileFull } from "@/utils/hook";
import { UpdateProfileFullBody } from "@/utils/service/models/RequestModels";
import { People } from "@/utils/service/models/ResponseModels";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { UseFormHandleSubmit } from "react-hook-form";
import { TouchableOpacity } from "react-native";

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

    console.log("🔄 [EditProfile] Profile data:", profile);

    const formRef = useRef<{
        handleSubmit: UseFormHandleSubmit<ProfileFormData>;
        getFormData: () => {
            formData: ProfileFormData;
            phones: any[];
            emails: any[];
            addresses: any[];
            urls: any[];
            uploadedFilename: string | null;
        };
    } | null>(null);

    const { mutate: updateProfile, isPending } = useUpdateProfileFull(() => {
        router.back();
    });

    const handleFormReady = useCallback((form: any) => {
        formRef.current = form;
    }, []);

    const handleSave = useCallback(() => {
        if (!formRef.current) {
            console.error("❌ [handleSave] Form ref is not ready!");
            return;
        }

        formRef.current.handleSubmit(
            (data: ProfileFormData) => {
                const formData = formRef.current?.getFormData();
                if (!formData) {
                    console.error("❌ [handleSave] Form data is null!");
                    return;
                }

                console.log("🔍 [handleSave] Form data:", formData);
                console.log("🔍 [handleSave] Uploaded filename:", formData.uploadedFilename);

                // Build metadata object from dynamic fields
                const metadataObject: any = {};

                if (formData.phones && formData.phones.length > 0) {
                    const phonesData = formData.phones
                        .map((phone) => {
                            // Ensure phone value is in E.164 format
                            const e164Value = phone.value ? toE164(phone.value) || phone.value : "";
                            return {
                                type: phone.label,
                                value: e164Value,
                            };
                        })
                        .filter((phone) => phone.value); // Filter out empty values
                    if (phonesData.length > 0) metadataObject.phones = phonesData;
                }

                if (formData.emails && formData.emails.length > 0) {
                    const emailsData = formData.emails.map((email) => ({
                        type: email.label,
                        value: email.value,
                    }));
                    if (emailsData.length > 0) metadataObject.emails = emailsData;
                }

                if (formData.addresses && formData.addresses.length > 0) {
                    const addressesData = formData.addresses.map((address) => ({
                        type: address.label,
                        value: address.value,
                    }));
                    if (addressesData.length > 0) metadataObject.addresses = addressesData;
                }

                if (formData.urls && formData.urls.length > 0) {
                    const urlsData = formData.urls.map((url) => ({
                        type: url.label,
                        value: url.value,
                    }));
                    if (urlsData.length > 0) metadataObject.urls = urlsData;
                }

                const payload: UpdateProfileFullBody = {
                    first_name: data.first_name,
                    last_name: data.last_name,
                    ...(data.birth_date && { birth_date: data.birth_date }),
                    // Ensure gender is lowercase for backend
                    ...(data.gender && { gender: data.gender.toLowerCase() as "male" | "female" | "other" }),
                    ...(Object.keys(metadataObject).length > 0 && { metadata: JSON.stringify(metadataObject) }),
                    ...(formData.uploadedFilename && { profile_photo: formData.uploadedFilename }),
                };

                updateProfile(payload, {
                    onSuccess: (response) => {
                        console.log("✅ [updateProfile] Success Response:", response);
                    },
                    onError: (error) => {
                        console.error("❌ [updateProfile] Error:", error);
                        console.error("❌ [updateProfile] Error Details:", JSON.stringify(error, null, 2));
                    },
                });
            },
            (errors) => {
                // Validation failed - errors are handled by form
                console.log("❌ [handleSave] Validation errors:", errors);
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
