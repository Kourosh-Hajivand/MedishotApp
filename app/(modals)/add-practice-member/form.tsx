import { BaseButton } from "@/components";
import ControlledInput from "@/components/input/ControlledInput";
import { BaseText } from "@/components/text/BaseText";
import { useAddMember } from "@/utils/hook";
import { Host, Picker } from "@expo/ui/swift-ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useLayoutEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { ScrollView, StyleSheet, View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";

interface AddMemberFormData {
    email: string;
    role: "owner" | "admin" | "member" | "viewer" | "doctor";
}

const roleOptions = ["Owner", "Admin", "Member", "Viewer", "Doctor"];

export default function AddPracticeMemberForm() {
    const navigation = useNavigation();
    const { mutate: addMember, isPending: isAddingMember } = useAddMember((data) => {
        console.log("addMember", data);
        router.back();
    });
    const { practiceId } = useLocalSearchParams<{ practiceId: string }>();
    console.log("practiceId", practiceId);
    const insets = useSafeAreaInsets();
    const [selectedRoleIndex, setSelectedRoleIndex] = React.useState(2);

    const {
        control,
        handleSubmit,
        formState: { errors },
        setValue,
    } = useForm<AddMemberFormData>({
        resolver: zodResolver(
            z.object({
                email: z.string().email("Please enter a valid email address"),
                role: z.enum(["owner", "admin", "member", "viewer", "doctor"]),
            }),
        ),
        defaultValues: {
            email: "",
            role: "member",
        },
    });

    const onSubmit = (data: AddMemberFormData) => {
        console.log("onSubmit", data);
        addMember({ practiceId: parseInt(practiceId), data: { email: data.email, role: data.role } });
    };

    React.useEffect(() => {
        const defaultRoleIndex = roleOptions.findIndex((option) => option.toLowerCase() === "member");
        if (defaultRoleIndex !== -1) {
            setSelectedRoleIndex(defaultRoleIndex);
        }
    }, []);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => <BaseButton label="Done" onPress={handleSubmit(onSubmit)} disabled={isAddingMember} ButtonStyle="Filled" size="Medium" />,
        });
    }, [navigation, handleSubmit, onSubmit]);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    <View className="gap-0">
                        <ControlledInput control={control} name="email" label="Email Address" placeholder="Enter email address" keyboardType="email-address" autoCapitalize="none" error={errors.email?.message} />

                        <View className="gap-1 pl-4 border-t border-system-gray5 pt-4">
                            <View className="gap-2 flex-row items-center justify-between">
                                <BaseText type="Body" weight="500" color="labels.primary" style={styles.label}>
                                    Role:
                                </BaseText>
                                <Host style={{ height: 40, width: "30%" }}>
                                    <Controller
                                        control={control}
                                        name="role"
                                        render={({ field: { onChange, value } }) => (
                                            <Picker
                                                label="Select role"
                                                selectedIndex={selectedRoleIndex}
                                                variant="menu"
                                                onOptionSelected={({ nativeEvent: { index } }) => {
                                                    setSelectedRoleIndex(index);
                                                    // Convert display name to backend value
                                                    const roleValue = roleOptions[index].toLowerCase() as "owner" | "admin" | "member" | "viewer" | "doctor";
                                                    onChange(roleValue);
                                                    setValue("role", roleValue);
                                                }}
                                                options={roleOptions}
                                            />
                                        )}
                                    />
                                </Host>
                            </View>
                            {errors.role?.message && (
                                <BaseText type="Caption1" weight="400" color="system.red" style={styles.error}>
                                    {errors.role.message}
                                </BaseText>
                            )}
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E5E7",
    },
    scrollContainer: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 20,
        paddingVertical: 24,
    },
    title: {
        marginBottom: 24,
        textAlign: "center",
    },
    inputContainer: {
        gap: 0,
    },

    label: {
        marginBottom: 4,
    },
    error: {
        marginTop: 4,
    },
});
