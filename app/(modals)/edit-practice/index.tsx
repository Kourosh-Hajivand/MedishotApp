import { AvatarIcon, PlusIcon } from "@/assets/icons";
import { BaseText, ControlledInput, ImagePickerWrapper } from "@/components";
import { spacing } from "@/styles/spaces";
import colors from "@/theme/colors";
import { normalizeUSPhoneToDashedFormat, normalizeWebsiteUrl } from "@/utils/helper/HelperFunction";
import useDebounce from "@/utils/hook/useDebounce";
import { useGetSearchDetail, useMapboxSearch } from "@/utils/hook/useGetMapboxSearch";
import { useTempUpload } from "@/utils/hook/useMedia";
import { useUpdatePractice } from "@/utils/hook/usePractice";
import { Practice } from "@/utils/service/models/ResponseModels";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { ActivityIndicator, Image, Keyboard, KeyboardAvoidingView, KeyboardTypeOptions, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";

const schema = z.object({
    practiceName: z.string().min(1, "Practice Name is required"),
    website: z.string().optional(),
    phoneNumber: z
        .string()
        .transform((val) => val.replace(/\D/g, ""))
        .refine((val) => val.length === 0 || val.length === 10 || val.length === 11, {
            message: "Phone number must be 10 digits",
        }),
    address: z.string().optional(),
    zipCode: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

export default function EditPracticeScreen() {
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();
    const navigation = useNavigation();
    const params = useLocalSearchParams<{ practice?: string }>();

    // Parse practice data from params
    const practice: Practice | null = useMemo(() => {
        if (params.practice) {
            try {
                return JSON.parse(params.practice);
            } catch {
                return null;
            }
        }
        return null;
    }, [params.practice]);

    // Parse metadata
    const metadata = useMemo(() => {
        if (!practice?.metadata) return null;
        if (typeof practice.metadata === "string") {
            try {
                return JSON.parse(practice.metadata);
            } catch {
                return null;
            }
        }
        return practice.metadata;
    }, [practice?.metadata]);

    const [localImageUri, setLocalImageUri] = useState<string | null>(null); // Local URI for preview
    const [uploadedFilename, setUploadedFilename] = useState<string | null>(null); // Filename from server for submit
    const uploadedFilenameRef = useRef<string | null>(null); // Ref to always have latest value

    const {
        control,
        handleSubmit,
        watch,
        formState: { errors },
        setValue,
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            practiceName: practice?.name || "",
            website: metadata?.website?.replace("https://", "") || "",
            phoneNumber: metadata?.phone?.replace(/-/g, "") || "",
            address: metadata?.address || "",
            zipCode: metadata?.zipcode?.toString() || "",
            email: metadata?.email || "",
        },
    });

    const debouncedValue = useDebounce({
        Delay: 1500,
        value: watch("zipCode"),
    });
    const { data: Search } = useMapboxSearch({
        query: debouncedValue ?? " ",
        language: "en",
    });
    const { data } = useGetSearchDetail(Search?.suggestions?.[0]?.mapbox_id);

    useEffect(() => {
        if (data?.features?.[0]) {
            const place = data.features[0];
            const fullAddress = place.properties?.place_formatted || place.properties?.full_address;
            setValue("address", fullAddress);
        }
    }, [data, setValue]);

    // Initialize uploadedFilename with existing image URL if in edit mode
    useEffect(() => {
        if (practice?.image?.url && !localImageUri) {
            console.log("🖼️ [INIT] Setting existing practice image:", practice.image.url);
            setUploadedFilename(practice.image.url);
            uploadedFilenameRef.current = practice.image.url;
        }
    }, [practice?.image?.url, localImageUri]);

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

    const {
        mutate: updatePractice,
        isPending,
        error,
    } = useUpdatePractice(() => {
        queryClient.invalidateQueries({ queryKey: ["GetPracticeList"] });
        router.back();
    });

    const onSubmit = useCallback(
        (data: FormData) => {
            if (!practice?.id) {
                console.error("❌ [onSubmit] Practice ID is missing!");
                return;
            }

            // Only submit filename from server, not local URI
            // Use ref to always get the latest value (avoid closure issues)
            const currentUploadedFilename = uploadedFilenameRef.current || uploadedFilename;
            console.log("🔍 [onSubmit] Checking uploadedFilename (state):", uploadedFilename);
            console.log("🔍 [onSubmit] Checking uploadedFilename (ref):", uploadedFilenameRef.current);
            console.log("🔍 [onSubmit] Using filename:", currentUploadedFilename);

            const updateData: any = {
                name: data.practiceName,
                metadata: JSON.stringify({
                    website: normalizeWebsiteUrl(data.website),
                    phone: data.phoneNumber ? normalizeUSPhoneToDashedFormat(data.phoneNumber) : "",
                    address: data.address || "",
                    zipcode: data.zipCode ? Number(data.zipCode) : undefined,
                    email: data.email || "",
                    // Preserve existing settings
                    print_settings: metadata?.print_settings,
                    notification_settings: metadata?.notification_settings,
                }),
            };

            if (currentUploadedFilename) {
                console.log("📤 [onSubmit] Submitting image filename:", currentUploadedFilename);
                updateData.image = currentUploadedFilename;
            } else {
                console.log("⚠️ [onSubmit] No image filename to submit");
                console.log("⚠️ [onSubmit] uploadedFilename (state):", uploadedFilename);
                console.log("⚠️ [onSubmit] uploadedFilename (ref):", uploadedFilenameRef.current);
            }

            // Log all data being sent to backend
            console.log("═══════════════════════════════════════════════════════════");
            console.log("📤 [onSubmit] DATA BEING SENT TO BACKEND:");
            console.log("═══════════════════════════════════════════════════════════");
            console.log("🏥 Practice ID:", practice.id);
            console.log("📋 Update Data (JSON):", JSON.stringify(updateData, null, 2));
            console.log("📋 Update Data (Object):", updateData);
            console.log("───────────────────────────────────────────────────────────");
            console.log("📝 Form Data:", {
                practiceName: data.practiceName,
                website: data.website,
                phoneNumber: data.phoneNumber,
                address: data.address,
                zipCode: data.zipCode,
                email: data.email,
            });
            console.log("🖼️ Image Filename (state):", uploadedFilename);
            console.log("🖼️ Image Filename (ref):", uploadedFilenameRef.current);
            console.log("🖼️ Image Filename (using):", currentUploadedFilename);
            console.log("🖼️ Local Image URI:", localImageUri);
            console.log("═══════════════════════════════════════════════════════════");

            console.log("🔄 [onSubmit] Calling updatePractice mutation...");
            updatePractice({
                id: practice.id,
                data: updateData,
        });
        },
        [practice, uploadedFilename, localImageUri, metadata, updatePractice],
    );

    // Set header right button
    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity onPress={handleSubmit(onSubmit)} disabled={isPending} className="px-2">
                    <BaseText type="Body" weight="600" color={isPending ? "labels.tertiary" : "system.blue"}>
                        Save
                    </BaseText>
                </TouchableOpacity>
            ),
        });
    }, [navigation, handleSubmit, onSubmit, isPending]);

    // Debug logs for image state
    console.log("🖼️ [RENDER] localImageUri:", localImageUri);
    console.log("🖼️ [RENDER] uploadedFilename:", uploadedFilename);
    console.log("🖼️ [RENDER] uploadedFilenameRef.current:", uploadedFilenameRef.current);
    console.log("🖼️ [RENDER] isUploading:", isUploading);
    console.log("🖼️ [RENDER] isPending:", isPending);
    console.log("🖼️ [RENDER] practice?.image?.url:", practice?.image?.url);

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 30 : 0}>
            <ScrollView style={styles.scrollView} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 10 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
                            ) : practice?.image?.url ? (
                                // Show existing image from server
                                <Image
                                    source={{ uri: practice.image.url }}
                                    style={styles.avatarImage}
                                    onError={(error) => {
                                        console.error("❌ [Image] Error loading existing image:", error.nativeEvent.error);
                                        console.error("❌ [Image] Failed URI:", practice.image?.url);
                                    }}
                                    onLoad={() => {
                                        console.log("✅ [Image] Existing image loaded successfully:", practice.image?.url);
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
                            Edit Practice
                        </BaseText>
                        <BaseText type="Body" color="labels.secondary" align="center">
                            Update your practice information.
                        </BaseText>
                    </View>
                </View>

                {/* Form */}
                <View style={styles.formContainer}>
                    {[
                        { name: "practiceName", label: "Practice Name" },
                        { name: "website", label: "Website", optional: true },
                        { name: "phoneNumber", label: "Phone Number", keyboardType: "phone-pad", optional: true },
                        { name: "email", label: "Email", keyboardType: "email-address", optional: true },
                        { name: "zipCode", label: "Zip Code", keyboardType: "phone-pad", optional: true },
                        { name: "address", label: "Address", optional: true },
                    ].map((f, i) => (
                        <View key={f.name} style={[styles.formRow, i === 5 ? { borderBottomWidth: 0 } : {}]}>
                            <BaseText type="Body" weight="500" color="system.black" style={styles.label}>
                                {f.label}
                            </BaseText>
                            <View style={styles.inputWrapper}>
                                <ControlledInput control={control} name={f.name as keyof FormData} label={f.label} optional={f.optional} keyboardType={f.keyboardType as KeyboardTypeOptions} haveBorder={false} error={errors?.[f.name as keyof FormData]?.message as string} />
                            </View>
                        </View>
                    ))}

                    {error?.message && (
                        <BaseText color="system.red" type="Caption2" className="mt-2">
                            {error?.message}
                        </BaseText>
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
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
    formContainer: {
        marginTop: spacing["10"],
    },
    formRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing["3"],
        borderBottomWidth: 1,
        borderBottomColor: colors.system.gray5,
    },
    label: {
        width: 120,
    },
    inputWrapper: {
        flex: 1,
    },
});
