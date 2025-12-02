import { BaseText } from "@/components";
import { ProfileFormData, ProfileFormScreen } from "@/screens/auth/ProfileFormScreen";
import { useUpdateProfile } from "@/utils/hook";
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
    console.log("====================================");
    console.log(profile);
    console.log("====================================");

    const formRef = useRef<{
        handleSubmit: UseFormHandleSubmit<ProfileFormData>;
        getFormData: () => any;
    } | null>(null);

    const { mutate: updateProfile, isPending } = useUpdateProfile(() => {
        router.back();
    });

    const handleFormReady = useCallback((form: any) => {
        formRef.current = form;
    }, []);

    const handleSave = () => {
        if (formRef.current) {
            formRef.current.handleSubmit((data: ProfileFormData) => {
                const formData = formRef.current?.getFormData();
                // TODO: Include phones, emails, addresses, urls, uploadedFilename in the request
                updateProfile(data);
            })();
        }
    };

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
    }, [navigation, isPending]);

    return <ProfileFormScreen mode="edit" initialData={profile} title="Edit Profile" subtitle="Update your profile information." onFormReady={handleFormReady} />;
}
