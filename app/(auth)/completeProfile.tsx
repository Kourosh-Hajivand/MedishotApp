import { BaseButton, BaseText, ControlledInput } from "@/components";
import { useUpdateProfile } from "@/utils/hook";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import React from "react";
import { useForm } from "react-hook-form";
import { View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import z from "zod";
const CompliteProfileFormDataSchema = z.object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
});

type CompliteProfileFormDataSchema = z.infer<typeof CompliteProfileFormDataSchema>;

export default function CompleteProfile() {
    const insets = useSafeAreaInsets();
    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<CompliteProfileFormDataSchema>({
        resolver: zodResolver(CompliteProfileFormDataSchema),
        defaultValues: {
            first_name: "",
            last_name: "",
        },
    });
    const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfile(() => {
        router.push("/(auth)/select-role");
    });
    const onSubmit = (data: CompliteProfileFormDataSchema) => {
        updateProfile(data);
    };
    return (
        <ScrollView contentContainerClassName="flex-1 bg-white">
            <View className="flex-1 px-10 justify-between pb-[30%] ">
                <View style={{ paddingTop: insets.top + 40, gap: 71 }}>
                    <View className="gap-2">
                        <BaseText type="Title1" weight="700" color="system.black" className="!text-center">
                            Complete Your Profile
                        </BaseText>
                    </View>
                    <View className="">
                        <ControlledInput control={control} name="first_name" label="First Name" error={errors.first_name?.message} />
                        <ControlledInput control={control} name="last_name" label="Last Name" error={errors.last_name?.message} />
                    </View>
                </View>
                <BaseButton ButtonStyle="Filled" size="Large" label="Complete Profile" className="!rounded-2xl" isLoading={isUpdating} onPress={handleSubmit(onSubmit)} />
            </View>
        </ScrollView>
    );
}
