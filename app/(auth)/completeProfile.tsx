import { ProfileFormData, ProfileFormScreen } from "@/screens/auth/ProfileFormScreen";
import { useUpdateProfile } from "@/utils/hook";
import { router } from "expo-router";
import React, { useCallback, useRef } from "react";
import { UseFormHandleSubmit } from "react-hook-form";

export default function CompleteProfile() {
    const formRef = useRef<{
        handleSubmit: UseFormHandleSubmit<ProfileFormData>;
        getFormData: () => any;
    } | null>(null);

    const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfile(() => {
        router.push("/(auth)/select-role");
    });

    const handleFormReady = useCallback((form: any) => {
        formRef.current = form;
    }, []);

    const onSubmit = (data: ProfileFormData) => {
        const formData = formRef.current?.getFormData();
        // TODO: Include phones, emails, addresses, urls, uploadedFilename in the request
        updateProfile(data);
    };

    return <ProfileFormScreen mode="create" title="Complete Your Profile" subtitle="Start by completing your profile." onFormReady={handleFormReady} />;
}

CompleteProfile.displayName = "CompleteProfile";
