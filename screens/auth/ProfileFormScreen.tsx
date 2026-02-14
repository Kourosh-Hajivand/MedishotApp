import { AvatarIcon, PlusIcon } from "@/assets/icons";
import { BaseText, ControlledInput, DynamicInputList, ImagePickerWrapper, KeyboardAwareScrollView } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ControlledPickerInput } from "@/components/input/ControlledPickerInput";
import { Address, DynamicFieldItem, DynamicInputConfig, FieldLabel } from "@/models";
import { AddressLabel, DynamicFieldType, PhoneLabel, URLLabel } from "@/models/enums";
import { routes } from "@/routes/routes";
import { spacing } from "@/styles/spaces";
import colors from "@/theme/colors";
import { useTempUpload } from "@/utils/hook";
import { People, TempUploadResponse } from "@/utils/service/models/ResponseModels";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Control, FieldErrors, useForm, UseFormHandleSubmit } from "react-hook-form";
import { ActivityIndicator, Image, Keyboard, StyleSheet, TextInput, View } from "react-native";
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

const API_BASE_URL = routes.baseUrl.replace(/\/+$/, "");
const STORAGE_BASE_URL = API_BASE_URL.replace(/\/api\/v1$/, "");

const formatImageUri = (uri: string | null): string | null => {
    if (!uri) return null;

    const trimmed = uri.trim();
    if (!trimmed) {
        return null;
    }

    if (trimmed.startsWith("file://") || trimmed.startsWith("content://")) {
        return trimmed;
    }

    let normalized = trimmed;

    if (!/^https?:\/\//i.test(normalized)) {
        const base = STORAGE_BASE_URL || API_BASE_URL;
        normalized = `${base}${normalized.startsWith("/") ? "" : "/"}${normalized}`;
    }

    const parts = normalized.split("://");
    if (parts.length === 2) {
        const [protocol, rest] = parts;
        normalized = `${protocol}://${rest.replace(/\/{2,}/g, "/")}`;
    }

    return normalized;
};

export const ProfileFormScreen: React.FC<ProfileFormProps> = ({ mode, initialData, title, subtitle, onFormReady }) => {
    const insets = useSafeAreaInsets();
    const [localImageUri, setLocalImageUri] = useState<string | null>(null); // Local URI for preview
    const [uploadedFilename, setUploadedFilename] = useState<string | null>(null); // Filename from server for submit
    const uploadedFilenameRef = React.useRef<string | null>(null); // Ref to always have latest value
    const [hasImageChanged, setHasImageChanged] = useState(false); // Track if image was changed/selected

    // Refs برای فیلدهای متنی
    const firstNameRef = useRef<TextInput>(null);
    const lastNameRef = useRef<TextInput>(null);

    // States for dynamic inputs
    const [phones, setPhones] = useState<DynamicFieldItem[]>([]);
    const [emails, setEmails] = useState<DynamicFieldItem[]>([]);
    const [addresses, setAddresses] = useState<DynamicFieldItem[]>([]);
    const [urls, setUrls] = useState<DynamicFieldItem[]>([]);

    const { mutate: uploadImage, isPending: isUploading } = useTempUpload(
        (response: TempUploadResponse | { data: TempUploadResponse }) => {
            // Handle both wrapped and unwrapped response structures
            const tempResponse = response as TempUploadResponse | { data: TempUploadResponse };
            const filename = ("data" in tempResponse ? tempResponse.data?.filename : tempResponse.filename) || null;
            setUploadedFilename(filename); // Only save filename for submit, keep local URI for preview
            uploadedFilenameRef.current = filename; // Also update ref to always have latest value
            setHasImageChanged(true); // Mark that image was changed and uploaded
        },
        (error) => {
            setLocalImageUri(null);
            setUploadedFilename(null);
            setHasImageChanged(false); // Reset on error
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

    // Parse metadata from API (string or object)
    const parsedMetadata = React.useMemo(() => {
        const raw = initialData ? (initialData as People & { metadata?: string | Record<string, unknown> | null }).metadata : undefined;
        if (raw == null) return null;
        if (typeof raw === "string") {
            try {
                return JSON.parse(raw) as {
                    phones?: Array<{ type: string; value: string }>;
                    emails?: Array<{ type: string; value: string }>;
                    addresses?: Array<{ type: string; value: string }>;
                    urls?: Array<{ type: string; value: string }>;
                };
            } catch {
                return null;
            }
        }
        return raw as {
            phones?: Array<{ type: string; value: string }>;
            emails?: Array<{ type: string; value: string }>;
            addresses?: Array<{ type: string; value: string }>;
            urls?: Array<{ type: string; value: string }>;
        };
    }, [initialData]);

    // Update form and dynamic fields when initialData changes (for edit mode)
    useEffect(() => {
        if (mode === "edit" && initialData) {
            reset({
                first_name: initialData.first_name || "",
                last_name: initialData.last_name || "",
                birth_date: initialData.birth_date || "",
                gender: initialData.gender ? initialData.gender.toLowerCase() : "",
            });
            if (initialData.profile_photo_url && !localImageUri) {
                setHasImageChanged(false);
            }
            // Pre-fill dynamic fields from metadata so they are not empty on save
            if (parsedMetadata) {
                if (parsedMetadata.phones?.length) {
                    setPhones(
                        parsedMetadata.phones.map((item, i) => ({
                            id: `phone-${i}-${item.value}`,
                            label: item.type as FieldLabel,
                            value: item.value,
                        })),
                    );
                }
                if (parsedMetadata.emails?.length) {
                    setEmails(
                        parsedMetadata.emails.map((item, i) => ({
                            id: `email-${i}-${item.value}`,
                            label: item.type as FieldLabel,
                            value: item.value,
                        })),
                    );
                }
                if (parsedMetadata.addresses?.length) {
                    const defaultAddress: Address = { street1: "", street2: "", city: "", state: "", zip: "", country: "United States" };
                    setAddresses(
                        parsedMetadata.addresses.map((item, i) => {
                            let value: Address | string = item.value;
                            if (typeof item.value === "string" && item.value.trim().startsWith("{")) {
                                try {
                                    const parsed = JSON.parse(item.value) as Partial<Address>;
                                    value = { ...defaultAddress, ...parsed };
                                } catch {
                                    value = item.value;
                                }
                            }
                            return {
                                id: `address-${i}-${typeof value === "string" ? value : value.street1 || i}`,
                                label: item.type as FieldLabel,
                                value,
                            };
                        }),
                    );
                }
                if (parsedMetadata.urls?.length) {
                    setUrls(
                        parsedMetadata.urls.map((item, i) => ({
                            id: `url-${i}-${item.value}`,
                            label: item.type as FieldLabel,
                            value: item.value,
                        })),
                    );
                }
            }
        }
    }, [initialData, mode, reset, parsedMetadata]);

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
                    // Only return uploadedFilename if image was changed and uploaded successfully
                    // In create mode, always return it if exists
                    // In edit mode, only return it if image was changed
                    const shouldIncludeFilename = mode === "create" ? !!currentUploadedFilename : hasImageChanged && !!currentUploadedFilename;
                    return {
                        formData: getValues(),
                        phones,
                        emails,
                        addresses,
                        urls,
                        uploadedFilename: shouldIncludeFilename ? currentUploadedFilename : null,
                    };
                },
            });
        }
    }, [onFormReady, handleSubmit, control, errors, phones, emails, addresses, urls, uploadedFilename, getValues, hasImageChanged, mode]);

    const handleImageSelected = async (result: { uri: string; base64?: string | null }) => {
        Keyboard.dismiss();
        setLocalImageUri(result.uri); // Save local URI for preview
        setHasImageChanged(true); // Mark that user selected a new image

        try {
            const filename = result.uri.split("/").pop() || "image.jpg";
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : "image/jpeg";

            interface FileUpload {
                uri: string;
                type: string;
                name: string;
            }

            const file: FileUpload = {
                uri: result.uri,
                type: type,
                name: filename,
            };

            uploadImage(file);
        } catch (error) {
            // Error handled silently
        }
    };

    const displayTitle = title || (mode === "create" ? "Complete Your Profile" : "Edit Profile");
    const displaySubtitle = subtitle || (mode === "create" ? "Start by completing your profile." : "Update your profile information.");

    // Use local URI for preview (new images) or formatted URI for existing images from server
    // Don't show preview while uploading - show loading instead
    const displaySelectedImage = useMemo(() => {
        // If uploading, don't show preview (will show loading)
        if (isUploading) {
            return null;
        }
        // If we have local URI (new image), show it
        if (localImageUri) {
            return localImageUri;
        }
        // Existing image from server: format the URI (either from uploadedFilename or initialData)
        const imageToFormat = uploadedFilename || initialData?.profile_photo_url || null;
        return formatImageUri(imageToFormat);
    }, [localImageUri, uploadedFilename, initialData?.profile_photo_url, isUploading]);

    return (
        <KeyboardAwareScrollView style={styles.scrollView} contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 40, gap: 24 }}>
            <View style={styles.avatarContainer}>
                <ImagePickerWrapper onImageSelected={handleImageSelected}>
                    <View style={styles.avatarWrapper}>
                        {isUploading ? (
                            // Show loading indicator while uploading
                            <ActivityIndicator size="small" color={colors.system.gray6} />
                        ) : displaySelectedImage ? (
                            // Show preview after upload is complete
                            <Image
                                source={{ uri: displaySelectedImage }}
                                style={styles.avatarImage}
                                onError={() => {
                                    // Silently handle image load errors
                                }}
                                onLoad={() => {
                                    // Image loaded successfully
                                }}
                            />
                        ) : (
                            // Show default avatar when no image
                            <AvatarIcon width={50} height={50} strokeWidth={0} />
                        )}
                        {isUploading ? (
                            <View style={styles.plusButton}><ActivityIndicator size="small" color={colors.system.white} /></View>
                        ) : (
                            <View style={styles.plusButton}>
                                {displaySelectedImage ? (
                                    <IconSymbol name="pencil" size={14} color={colors.system.white} />
                                ) : (
                                    <PlusIcon width={14} height={14} strokeWidth={0} />
                                )}
                            </View>
                        )}
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
                        <ControlledInput control={control} name="first_name" label="First Name" haveBorder={false} error={errors.first_name?.message} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => lastNameRef.current?.focus()} ref={firstNameRef} />
                    </View>
                    <View className="border-b border-border">
                        <ControlledInput control={control} name="last_name" label="Last Name" haveBorder={false} error={errors.last_name?.message} returnKeyType="done" blurOnSubmit={true} onSubmitEditing={() => Keyboard.dismiss()} ref={lastNameRef} />
                    </View>

                    <View className="border-b border-border">
                        <ControlledPickerInput control={control} name="birth_date" label="Birth Date" type="date" error={errors.birth_date?.message} noBorder={true} />
                    </View>
                    <View className={`${initialData?.email ? "border-b border-border" : ""}`}>
                        <ControlledPickerInput control={control} name="gender" label="Gender" type="gender" error={errors.gender?.message} noBorder={true} />
                    </View>

                    {initialData?.email && (
                        <View style={{ height: 50, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, opacity: 0.5 }}>
                            <BaseText style={{ fontSize: 17, lineHeight: 22, fontWeight: "400" }} color="text">
                                {initialData.email}
                            </BaseText>
                        </View>
                    )}
                </View>
                <View className="gap-4">
                    <DynamicInputList config={phoneConfig} paramKey="phone" onChange={setPhones} initialItems={phones} />
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
