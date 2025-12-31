import { AvatarIcon, PlusIcon } from "@/assets/icons";
import { BaseText, ControlledInput, DynamicInputList, ImagePickerWrapper, KeyboardAwareScrollView } from "@/components";
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
import { ActivityIndicator, Image, StyleSheet, TouchableWithoutFeedback, View } from "react-native";
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
    const [localImageUri, setLocalImageUri] = useState<string | null>(null); // Local URI for preview
    const [uploadedFilename, setUploadedFilename] = useState<string | null>(null); // Filename from server for submit
    const uploadedFilenameRef = React.useRef<string | null>(null); // Ref to always have latest value

    // States for dynamic inputs
    const [phones, setPhones] = useState<DynamicFieldItem[]>([]);
    const [emails, setEmails] = useState<DynamicFieldItem[]>([]);
    const [addresses, setAddresses] = useState<DynamicFieldItem[]>([]);
    const [urls, setUrls] = useState<DynamicFieldItem[]>([]);

    const { mutate: uploadImage, isPending: isUploading } = useTempUpload(
        (response) => {
            console.log("✅ [uploadImage] Success callback triggered");
            console.log("✅ [uploadImage] Response:", response);
            // Handle both wrapped and unwrapped response structures
            const responseAny = response as any;
            const filename = (responseAny?.data?.filename ?? response.filename) || null;
            console.log("✅ [uploadImage] Filename:", filename);
            setUploadedFilename(filename); // Only save filename for submit, keep local URI for preview
            uploadedFilenameRef.current = filename; // Also update ref to always have latest value
            console.log("✅ [uploadImage] Image uploaded successfully:", filename);
        },
        (error) => {
            console.error("❌ [uploadImage] Error callback triggered");
            console.error("❌ [uploadImage] Error uploading image:", error);
            console.error("❌ [uploadImage] Error message:", error.message);
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
                birth_date: initialData.birth_date || "",
                // Keep gender in lowercase for form (backend format)
                gender: initialData.gender ? initialData.gender.toLowerCase() : "",
            });
            // Set existing image URL if available
            if (initialData.profile_photo_url && !localImageUri) {
                console.log("🖼️ [INIT] Setting existing profile image:", initialData.profile_photo_url);
                setUploadedFilename(initialData.profile_photo_url);
                uploadedFilenameRef.current = initialData.profile_photo_url;
            }
            // TODO: Set dynamic fields from initialData if available
        }
    }, [initialData, mode, reset, localImageUri]);

    // Expose form methods to parent
    useEffect(() => {
        if (onFormReady) {
            onFormReady({
                handleSubmit,
                control,
                errors,
                getFormData: () => {
                    // Use ref to always get the latest value (avoid closure issues)
                    const currentUploadedFilename = uploadedFilenameRef.current || uploadedFilename;
                    return {
                        formData: getValues(),
                        phones,
                        emails,
                        addresses,
                        urls,
                        uploadedFilename: currentUploadedFilename,
                    };
                },
            });
        }
    }, [onFormReady, handleSubmit, control, errors, phones, emails, addresses, urls, uploadedFilename, getValues]);

    const handleImageSelected = async (result: { uri: string; base64?: string | null }) => {
        console.log("📸 [handleImageSelected] Image selected:", result.uri);
        Keyboard.dismiss();
        setLocalImageUri(result.uri); // Save local URI for preview

        try {
            const filename = result.uri.split("/").pop() || "image.jpg";
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : "image/jpeg";

            const file = {
                uri: result.uri,
                type: type,
                name: filename,
            } as any;

            console.log("📤 [handleImageSelected] Preparing to upload file:", {
                uri: file.uri,
                type: file.type,
                name: file.name,
            });
            console.log("📤 [handleImageSelected] Calling uploadImage...");
            uploadImage(file);
        } catch (error) {
            console.error("❌ [handleImageSelected] Error preparing image for upload:", error);
        }
    };

    const displayTitle = title || (mode === "create" ? "Complete Your Profile" : "Edit Profile");
    const displaySubtitle = subtitle || (mode === "create" ? "Start by completing your profile." : "Update your profile information.");

    return (
        <KeyboardAwareScrollView
            style={styles.scrollView}
            contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 40, gap: 24 }}
        >
            <View style={styles.avatarContainer}>
                <ImagePickerWrapper onImageSelected={handleImageSelected}>
                    <View style={styles.avatarWrapper}>
                        {isUploading ? (
                            // Show loading indicator while uploading
                            <ActivityIndicator size="small" color={colors.system.gray6} />
                        ) : localImageUri ? (
                            // Show preview after upload is complete (new image)
                            <Image
                                source={{ uri: localImageUri }}
                                style={styles.avatarImage}
                                onError={(error) => {
                                    console.error("❌ [Image] Error loading local image:", error.nativeEvent.error);
                                    console.error("❌ [Image] Failed URI:", localImageUri);
                                }}
                                onLoad={() => {
                                    console.log("✅ [Image] Local image loaded successfully:", localImageUri);
                                }}
                            />
                        ) : initialData?.profile_photo_url ? (
                            // Show existing image from server
                            <Image
                                source={{ uri: initialData.profile_photo_url }}
                                style={styles.avatarImage}
                                onError={(error) => {
                                    console.error("❌ [Image] Error loading existing image:", error.nativeEvent.error);
                                    console.error("❌ [Image] Failed URI:", initialData.profile_photo_url);
                                }}
                                onLoad={() => {
                                    console.log("✅ [Image] Existing image loaded successfully:", initialData.profile_photo_url);
                                }}
                            />
                        ) : (
                            // Show default avatar when no image
                            <AvatarIcon width={50} height={50} strokeWidth={0} />
                        )}
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
                    <View className={`${initialData?.email && initialData.email !== "create" ? "border-b border-border" : ""}`}>
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
                <View className="gap-4">
                    <DynamicInputList config={phoneConfig} paramKey="phone" onChange={setPhones} initialItems={phones} />
                    <DynamicInputList config={emailConfig} paramKey="email" onChange={setEmails} initialItems={emails} />
                    <DynamicInputList config={addressConfig} paramKey="address" onChange={setAddresses} initialItems={addresses} />
                    <DynamicInputList config={urlConfig} paramKey="url" onChange={setUrls} initialItems={urls} />
                </View>
            </View>
        </KeyboardAwareScrollView>
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
