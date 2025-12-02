import { AvatarIcon, PlusIcon } from "@/assets/icons";
import { BaseButton, BaseText, ControlledInput, DynamicInputList, ImagePickerWrapper } from "@/components";
import { ControlledPickerInput } from "@/components/input/ControlledPickerInput";
import { DynamicFieldItem, DynamicInputConfig } from "@/models";
import { AddressLabel, DynamicFieldType, EmailLabel, PhoneLabel, URLLabel } from "@/models/enums";
import { spacing } from "@/styles/spaces";
import colors from "@/theme/colors";
import { useAddMember, useTempUpload } from "@/utils/hook";
import { Host, Picker } from "@expo/ui/swift-ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useLayoutEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Image, Keyboard, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";

interface AddMemberFormData {
    first_name: string;
    last_name: string;
    email: string;
    birth_date?: string;
    gender?: string;
    role: "owner" | "admin" | "member" | "viewer" | "doctor";
}

const roleOptions = ["Owner", "Admin", "Member", "Viewer", "Doctor"];

// Dynamic input configs
const phoneConfig: DynamicInputConfig = {
    fieldType: DynamicFieldType.Phone,
    fieldTitle: "phone number",
    labelOptions: [PhoneLabel.Mobile, PhoneLabel.Home, PhoneLabel.Work, PhoneLabel.iPhone, PhoneLabel.Main, PhoneLabel.Other],
    placeholder: "Enter phone number",
};

const emailConfig: DynamicInputConfig = {
    fieldType: DynamicFieldType.Email,
    fieldTitle: "email",
    labelOptions: [EmailLabel.Home, EmailLabel.Work, EmailLabel.iCloud, EmailLabel.Personal, EmailLabel.Other],
    placeholder: "Enter email address",
};

const addressConfig: DynamicInputConfig = {
    fieldType: DynamicFieldType.Address,
    fieldTitle: "address",
    labelOptions: [AddressLabel.Home, AddressLabel.Work, AddressLabel.Other],
    placeholder: "Enter address",
};

const urlConfig: DynamicInputConfig = {
    fieldType: DynamicFieldType.URL,
    fieldTitle: "URL",
    labelOptions: [URLLabel.Instagram, URLLabel.Facebook, URLLabel.Twitter, URLLabel.LinkedIn, URLLabel.YouTube, URLLabel.TikTok, URLLabel.Telegram, URLLabel.WhatsApp, URLLabel.Other],
    placeholder: "Enter URL",
};

export default function AddPracticeMemberForm() {
    const navigation = useNavigation();
    const { mutate: addMember, isPending: isAddingMember } = useAddMember((data) => {
        console.log("addMember", data);
        router.back();
    });
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
    const { practiceId } = useLocalSearchParams<{ practiceId: string }>();
    const insets = useSafeAreaInsets();
    const [selectedRoleIndex, setSelectedRoleIndex] = React.useState(2);

    // States for dynamic inputs
    const [phones, setPhones] = useState<DynamicFieldItem[]>([]);
    const [emails, setEmails] = useState<DynamicFieldItem[]>([]);
    const [addresses, setAddresses] = useState<DynamicFieldItem[]>([]);
    const [urls, setUrls] = useState<DynamicFieldItem[]>([]);
    const { mutate: uploadImage, isPending: isUploading } = useTempUpload(
        (response) => {
            setUploadedFilename(response.filename);
        },
        (error) => {
            console.error("Error uploading image:", error.message);
        },
    );

    const {
        control,
        handleSubmit,
        formState: { errors },
        setValue,
    } = useForm<AddMemberFormData>({
        resolver: zodResolver(
            z.object({
                first_name: z.string().min(1, "First name is required"),
                last_name: z.string().min(1, "Last name is required"),
                email: z.string().email("Please enter a valid email address"),
                birth_date: z.string().optional(),
                gender: z.string().optional(),
                role: z.enum(["owner", "admin", "member", "viewer", "doctor"]),
            }),
        ),
        defaultValues: {
            first_name: "",
            last_name: "",
            email: "",
            birth_date: "",
            gender: "",
            role: "member",
        },
    });

    const handleImageSelected = async (result: { uri: string; base64?: string | null }) => {
        Keyboard.dismiss();
        setSelectedImage(result.uri);

        try {
            const filename = result.uri.split("/").pop() || "image.jpg";
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : "image/jpeg";

            const file = {
                uri: result.uri,
                type: type,
                name: filename,
            } as any;

            uploadImage(file);
        } catch (error) {
            console.error("Error preparing image for upload:", error);
        }
    };

    const onSubmit = (data: AddMemberFormData) => {
        console.log("onSubmit", data);
        // TODO: Include phones, emails, addresses, urls, uploadedFilename in the request
        addMember({ practiceId: parseInt(practiceId), data: { email: data.email, role: data.role } });
    };

    useEffect(() => {
        const defaultRoleIndex = roleOptions.findIndex((option) => option.toLowerCase() === "member");
        if (defaultRoleIndex !== -1) {
            setSelectedRoleIndex(defaultRoleIndex);
        }
    }, []);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => <BaseButton label="Done" onPress={handleSubmit(onSubmit)} disabled={isAddingMember} ButtonStyle="Filled" size="Medium" />,
        });
    }, [navigation, handleSubmit, isAddingMember]);

    return (
        <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 40, gap: 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.avatarContainer}>
                <ImagePickerWrapper onImageSelected={handleImageSelected}>
                    <View style={styles.avatarWrapper}>
                        {selectedImage ? <Image source={{ uri: selectedImage }} style={styles.avatarImage} /> : <AvatarIcon width={50} height={50} strokeWidth={0} />}
                        <View style={styles.plusButton}>{isUploading ? <ActivityIndicator size="small" color={colors.system.white} /> : <PlusIcon width={14} height={14} strokeWidth={0} />}</View>
                    </View>
                </ImagePickerWrapper>
                <View style={styles.titleContainer}>
                    <BaseText type="Title1" weight="700" color="system.black">
                        Add Member
                    </BaseText>
                    <BaseText type="Body" color="labels.secondary" align="center">
                        Add a new member to your practice.
                    </BaseText>
                </View>
            </View>

            <View className="gap-4">
                <View className="bg-white rounded-2xl px-4">
                    <View className="border-b border-border">
                        <ControlledInput control={control} name="first_name" label="First Name" haveBorder={false} error={errors.first_name?.message} />
                    </View>
                    <View className="border-b border-border">
                        <ControlledInput control={control} name="last_name" label="Last Name" haveBorder={false} error={errors.last_name?.message} />
                    </View>
                    <View className="border-b border-border">
                        <ControlledInput control={control} name="email" label="Email Address" haveBorder={false} keyboardType="email-address" autoCapitalize="none" error={errors.email?.message} />
                    </View>
                    <View className="border-b border-border">
                        <ControlledPickerInput control={control} name="birth_date" label="Birth Date" type="date" error={errors.birth_date?.message} noBorder={true} />
                    </View>
                    <View className="border-b border-border">
                        <ControlledPickerInput control={control} name="gender" label="Gender" type="gender" error={errors.gender?.message} noBorder={true} />
                    </View>
                    <View className="py-3">
                        <View className="gap-2 flex-row items-center justify-between pl-5">
                            <BaseText type="Body" weight="400" color="labels.primary">
                                Role:
                            </BaseText>
                            <Host style={{ height: 40, width: "40%" }}>
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
                            <BaseText type="Caption1" weight="400" color="system.red" className="pl-4 mt-1">
                                {errors.role.message}
                            </BaseText>
                        )}
                    </View>
                </View>
                <View className="gap-1">
                    <DynamicInputList config={phoneConfig} paramKey="phone" onChange={setPhones} initialItems={phones} />
                    <DynamicInputList config={emailConfig} paramKey="email" onChange={setEmails} initialItems={emails} />
                    <DynamicInputList config={addressConfig} paramKey="address" onChange={setAddresses} initialItems={addresses} />
                    <DynamicInputList config={urlConfig} paramKey="url" onChange={setUrls} initialItems={urls} />
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
        paddingHorizontal: spacing["6"],
    },
    avatarContainer: {
        alignItems: "center",
    },
    avatarWrapper: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: colors.system.gray2,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
    },
    avatarImage: {
        width: "100%",
        height: "100%",
        borderRadius: 45,
    },
    plusButton: {
        position: "absolute",
        bottom: 0,
        right: 0,
        backgroundColor: colors.system.blue,
        borderRadius: 999,
        padding: spacing["1"],
        borderWidth: 1,
        borderColor: colors.system.white,
    },
    titleContainer: {
        marginTop: spacing["4"],
        alignItems: "center",
    },
});
