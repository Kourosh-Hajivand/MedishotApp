import { AvatarIcon, PlusIcon } from "@/assets/icons";
import { BaseText, ControlledInput, DynamicInputList, ImagePickerWrapper } from "@/components";
import { ControlledPickerInput } from "@/components/input/ControlledPickerInput";
import { DynamicFieldItem, DynamicInputConfig } from "@/models";
import { AddressLabel, DynamicFieldType, EmailLabel, PhoneLabel, URLLabel } from "@/models/enums";
import { spacing } from "@/styles/spaces";
import colors from "@/theme/colors";
import { useTempUpload } from "@/utils/hook";
import { People } from "@/utils/service/models/ResponseModels";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect, useState } from "react";
import { Control, FieldErrors, useForm, UseFormHandleSubmit } from "react-hook-form";
import { ActivityIndicator, Image, Keyboard, StyleSheet, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import z from "zod";

// Schema
const ProfileFormSchema = z.object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    birth_date: z.string().optional(),
    gender: z.string().optional(),
});

export type ProfileFormData = z.infer<typeof ProfileFormSchema>;

// Props for the form component
export interface ProfileFormProps {
    mode: "create" | "edit";
    initialData?: People | null;
    title?: string;
    subtitle?: string;
    onFormReady?: (form: {
        handleSubmit: UseFormHandleSubmit<ProfileFormData>;
        control: Control<ProfileFormData>;
        errors: FieldErrors<ProfileFormData>;
        getFormData: () => {
            formData: ProfileFormData;
            phones: DynamicFieldItem[];
            emails: DynamicFieldItem[];
            addresses: DynamicFieldItem[];
            urls: DynamicFieldItem[];
            uploadedFilename: string | null;
        };
    }) => void;
}

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

export const ProfileFormScreen: React.FC<ProfileFormProps> = ({ mode, initialData, title, subtitle, onFormReady }) => {
    const insets = useSafeAreaInsets();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);

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
        reset,
        getValues,
    } = useForm<ProfileFormData>({
        resolver: zodResolver(ProfileFormSchema),
        defaultValues: {
            first_name: initialData?.first_name || "",
            last_name: initialData?.last_name || "",
            birth_date: "",
            gender: "",
        },
    });

    // Update form when initialData changes (for edit mode)
    useEffect(() => {
        if (mode === "edit" && initialData) {
            reset({
                first_name: initialData.first_name || "",
                last_name: initialData.last_name || "",
                birth_date: "",
                gender: "",
            });
            // TODO: Set image if available
            // TODO: Set dynamic fields from initialData if available
        }
    }, [initialData, mode, reset]);

    // Expose form methods to parent
    useEffect(() => {
        if (onFormReady) {
            onFormReady({
                handleSubmit,
                control,
                errors,
                getFormData: () => ({
                    formData: getValues(),
                    phones,
                    emails,
                    addresses,
                    urls,
                    uploadedFilename,
                }),
            });
        }
    }, [onFormReady, handleSubmit, control, errors, phones, emails, addresses, urls, uploadedFilename, getValues]);

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

    const displayTitle = title || (mode === "create" ? "Complete Your Profile" : "Edit Profile");
    const displaySubtitle = subtitle || (mode === "create" ? "Start by completing your profile." : "Update your profile information.");

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
                        {displayTitle}
                    </BaseText>
                    <BaseText type="Body" color="labels.secondary" align="center">
                        {displaySubtitle}
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
                        <ControlledPickerInput control={control} name="birth_date" label="Birth Date" type="date" error={errors.birth_date?.message} noBorder={true} />
                    </View>
                    <View className="border-b border-border">
                        <ControlledPickerInput control={control} name="gender" label="Gender" type="gender" error={errors.gender?.message} noBorder={true} />
                    </View>

                    {initialData?.email && (
                        <View className="py-3">
                            <View className="flex-row items-center  pl-4">
                                <BaseText type="Body" weight="400" color="labels.secondary">
                                    {initialData.email}
                                </BaseText>
                            </View>
                        </View>
                    )}
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
};

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

ProfileFormScreen.displayName = "ProfileFormScreen";
