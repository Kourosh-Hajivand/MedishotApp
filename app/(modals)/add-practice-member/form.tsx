import { AvatarIcon, PlusIcon } from "@/assets/icons";
import { BaseButton, BaseText, ControlledInput, DynamicInputList, ImagePickerWrapper } from "@/components";
import { ControlledPickerInput } from "@/components/input/ControlledPickerInput";
import { DynamicFieldItem, DynamicInputConfig } from "@/models";
import { AddressLabel, DynamicFieldType, EmailLabel, PhoneLabel, URLLabel } from "@/models/enums";
import { spacing } from "@/styles/spaces";
import themeColors from "@/theme/colors";
import { useAddMember, useTempUpload, useUpdateMemberRole } from "@/utils/hook";
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
    role: "member" | "doctor";
}

const roleOptions = [
    { label: "Staff", value: "member" as const },
    { label: "Doctor", value: "doctor" as const },
];

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
    const params = useLocalSearchParams<{ practiceId: string; member?: string; mode?: string }>();
    const practiceId = params.practiceId;
    const mode = params.mode || "create";
    const isEditMode = mode === "edit";

    // Parse member data if in edit mode
    const memberData = React.useMemo(() => {
        if (isEditMode && params.member) {
            try {
                return JSON.parse(params.member);
            } catch {
                return null;
            }
        }
        return null;
    }, [isEditMode, params.member]);

    const { mutate: addMember, isPending: isAddingMember } = useAddMember((data) => {
        console.log("addMember", data);
        router.back();
    });

    const { mutate: updateMemberRole, isPending: isUpdatingRole } = useUpdateMemberRole(() => {
        router.back();
    });

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const insets = useSafeAreaInsets();
    const [selectedRoleIndex, setSelectedRoleIndex] = React.useState(0);

    // States for dynamic inputs
    const [phones, setPhones] = useState<DynamicFieldItem[]>([]);
    const [emails, setEmails] = useState<DynamicFieldItem[]>([]);
    const [addresses, setAddresses] = useState<DynamicFieldItem[]>([]);
    const [urls, setUrls] = useState<DynamicFieldItem[]>([]);
    const { mutate: uploadImage, isPending: isUploading } = useTempUpload(
        () => {},
        (error) => {
            console.error("Error uploading image:", error.message);
        },
    );

    const {
        control,
        handleSubmit,
        formState: { errors },
        setValue,
        reset,
    } = useForm<AddMemberFormData>({
        resolver: zodResolver(
            z.object({
                first_name: z.string().min(1, "First name is required"),
                last_name: z.string().min(1, "Last name is required"),
                email: z.string().email("Please enter a valid email address"),
                birth_date: z.string().optional(),
                gender: z.string().optional(),
                role: z.enum(["member", "doctor"]),
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

    // Set form values when member data is available (edit mode)
    React.useEffect(() => {
        if (isEditMode && memberData) {
            reset({
                first_name: memberData.first_name || "",
                last_name: memberData.last_name || "",
                email: memberData.email || "",
                birth_date: "",
                gender: "",
                role: memberData.role || "member",
            });
            // Set role index
            const roleIndex = roleOptions.findIndex((option) => option.value === (memberData.role || "member"));
            if (roleIndex !== -1) {
                setSelectedRoleIndex(roleIndex);
            }
            // Set image if available
            if (memberData.image?.url) {
                setSelectedImage(memberData.image.url);
            }
        }
    }, [isEditMode, memberData, reset]);

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

    const onSubmit = React.useCallback(
        (data: AddMemberFormData) => {
            if (isEditMode && memberData) {
                // Update member role only
                updateMemberRole({
                    practiceId: parseInt(practiceId),
                    memberId: memberData.id,
                    data: { role: data.role },
                });
            } else {
                // Add new member
                // Map DynamicFieldItem arrays to the format expected by API and include in metadata
                const phonesData = phones.length > 0 ? phones.map((phone) => ({ label: phone.label, value: typeof phone.value === "string" ? phone.value : "" })) : undefined;
                const emailsData = emails.length > 0 ? emails.map((email) => ({ label: email.label, value: typeof email.value === "string" ? email.value : "" })) : undefined;
                const addressesData = addresses.length > 0 ? addresses.map((address) => ({ label: address.label, value: address.value })) : undefined;
                const urlsData = urls.length > 0 ? urls.map((url) => ({ label: url.label, value: typeof url.value === "string" ? url.value : "" })) : undefined;

                // Build metadata object
                const metadataObject: any = {};
                if (phonesData) metadataObject.phones = phonesData;
                if (emailsData) metadataObject.emails = emailsData;
                if (addressesData) metadataObject.addresses = addressesData;
                if (urlsData) metadataObject.urls = urlsData;

                addMember({
                    practiceId: parseInt(practiceId),
                    data: {
                        first_name: data.first_name,
                        last_name: data.last_name,
                        email: data.email,
                        role: data.role,
                        ...(data.birth_date && { birth_date: data.birth_date }),
                        ...(data.gender && { gender: data.gender as "male" | "female" | "other" }),
                        // ...(Object.keys(metadataObject).length > 0 && { metadata: JSON.stringify(metadataObject) }),
                        // ...(uploadedFilename && { profile_photo: uploadedFilename }),
                    },
                });
            }
        },
        [isEditMode, memberData, updateMemberRole, addMember, practiceId, phones, emails, addresses, urls],
    );

    useEffect(() => {
        const defaultRoleIndex = roleOptions.findIndex((option) => option.value === "member");
        if (defaultRoleIndex !== -1) {
            setSelectedRoleIndex(defaultRoleIndex);
        }
    }, []);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => <BaseButton label="Done" onPress={handleSubmit(onSubmit)} disabled={isAddingMember || isUpdatingRole} ButtonStyle="Filled" size="Medium" />,
        });
    }, [navigation, handleSubmit, isAddingMember, isUpdatingRole, isEditMode, onSubmit]);

    return (
        <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 40, gap: 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.avatarContainer}>
                <ImagePickerWrapper onImageSelected={handleImageSelected} disabled={isEditMode}>
                    <View style={styles.avatarWrapper}>
                        {selectedImage ? <Image source={{ uri: selectedImage }} style={styles.avatarImage} /> : <AvatarIcon width={50} height={50} strokeWidth={0} />}
                        {!isEditMode && <View style={styles.plusButton}>{isUploading ? <ActivityIndicator size="small" color={themeColors.system.white} /> : <PlusIcon width={14} height={14} strokeWidth={0} />}</View>}
                    </View>
                </ImagePickerWrapper>
                <View style={styles.titleContainer}>
                    <BaseText type="Title1" weight="700" color="system.black">
                        {isEditMode ? "Update Member Role" : "Add Member"}
                    </BaseText>
                    <BaseText type="Body" color="labels.secondary" align="center">
                        {isEditMode ? "Update the role for this member." : "Add a new member to your practice."}
                    </BaseText>
                </View>
            </View>

            <View className="gap-4">
                <View className="bg-white rounded-2xl px-4">
                    <View className="border-b border-border">
                        <ControlledInput control={control} name="first_name" label="First Name" haveBorder={false} error={errors.first_name?.message} disabled={isEditMode} />
                    </View>
                    <View className="border-b border-border">
                        <ControlledInput control={control} name="last_name" label="Last Name" haveBorder={false} error={errors.last_name?.message} disabled={isEditMode} />
                    </View>
                    <View className="border-b border-border">
                        <ControlledInput control={control} name="email" label="Email Address" haveBorder={false} keyboardType="email-address" autoCapitalize="none" error={errors.email?.message} disabled={isEditMode} />
                    </View>
                    <View className="border-b border-border">
                        <ControlledPickerInput control={control} name="birth_date" label="Birth Date" type="date" error={errors.birth_date?.message} noBorder={true} disabled={isEditMode} />
                    </View>
                    <View className="border-b border-border">
                        <ControlledPickerInput control={control} name="gender" label="Gender" type="gender" error={errors.gender?.message} noBorder={true} disabled={isEditMode} />
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
                                                const roleValue = roleOptions[index]?.value ?? "member";
                                                onChange(roleValue);
                                                setValue("role", roleValue);
                                            }}
                                            options={roleOptions.map((o) => o.label)}
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
                {!isEditMode && (
                    <View className="gap-1">
                        <DynamicInputList config={phoneConfig} paramKey="phone" onChange={setPhones} initialItems={phones} />
                        <DynamicInputList config={emailConfig} paramKey="email" onChange={setEmails} initialItems={emails} />
                        <DynamicInputList config={addressConfig} paramKey="address" onChange={setAddresses} initialItems={addresses} />
                        <DynamicInputList config={urlConfig} paramKey="url" onChange={setUrls} initialItems={urls} />
                    </View>
                )}
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
        backgroundColor: themeColors.system.gray2,
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
        backgroundColor: themeColors.system.blue,
        borderRadius: 999,
        padding: spacing["1"],
        borderWidth: 1,
        borderColor: themeColors.system.white,
    },
    titleContainer: {
        marginTop: spacing["4"],
        alignItems: "center",
    },
});
