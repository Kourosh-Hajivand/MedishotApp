import { AvatarIcon, PlusIcon } from "@/assets/icons";
import { BaseText, ControlledInput, ImagePickerWrapper, KeyboardAwareScrollView } from "@/components";
import IOSPhoneInput from "@/components/input/IOSPhoneInput";
import { spacing } from "@/styles/spaces";
import colors from "@/theme/colors";
import { normalizeWebsiteUrl } from "@/utils/helper/HelperFunction";
import { toE164 } from "@/utils/helper/phoneUtils";
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
import { ActivityIndicator, Image, KeyboardTypeOptions, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";

const schema = z.object({
    practiceName: z.string().min(1, "Practice Name is required"),
    website: z.string().optional(),
    phoneNumber: z.string().refine(
        (val) => {
            if (!val || val.length === 0) return true; // Optional field
            // Accept E.164 format (+1XXXXXXXXXX) or validate as E.164
            const digits = val.replace(/\D/g, "");
            return digits.length === 10 || (val.startsWith("+1") && val.length === 12);
        },
        {
            message: "Phone number must be 10 digits",
        },
    ),
    address: z.string().optional(),
    zipCode: z.string().optional(),
    street: z.string().optional(),
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
            phoneNumber: metadata?.phone ? toE164(metadata.phone) || "" : "",
            address: metadata?.address || "",
            zipCode: metadata?.zipcode?.toString() || "",
            street: metadata?.street || "",
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

    // Set form values when metadata is parsed
    useEffect(() => {
        if (metadata && practice) {
            setValue("practiceName", practice.name || "");
            setValue("website", metadata?.website?.replace("https://", "") || "");
            setValue("phoneNumber", metadata?.phone ? toE164(metadata.phone) || "" : "");
            setValue("address", metadata?.address || "");
            setValue("zipCode", metadata?.zipcode?.toString() || "");
            setValue("street", metadata?.street || "");
            setValue("email", metadata?.email || "");
        }
    }, [metadata, practice, setValue]);

    // Initialize uploadedFilename with existing image URL if in edit mode
    useEffect(() => {
        if (practice?.image?.url && !localImageUri) {
            setUploadedFilename(practice.image.url);
            uploadedFilenameRef.current = practice.image.url;
        }
    }, [practice?.image?.url, localImageUri]);

    const { mutate: uploadImage, isPending: isUploading } = useTempUpload(
        (response) => {
            // Handle both wrapped and unwrapped response structures
            const responseAny = response as any;
            const filename = (responseAny?.data?.filename ?? response.filename) || null;
            setUploadedFilename(filename); // Only save filename for submit, keep local URI for preview
            uploadedFilenameRef.current = filename; // Also update ref to always have latest value
        },
        (error) => {
            setLocalImageUri(null);
            setUploadedFilename(null);
        },
    );

    const handleImageSelected = async (result: { uri: string; base64?: string | null }) => {
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

            uploadImage(file);
        } catch (error) {
            // Error handled silently
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
                return;
            }

            // Only submit filename from server, not local URI
            // Use ref to always get the latest value (avoid closure issues)
            const currentUploadedFilename = uploadedFilenameRef.current || uploadedFilename;

            const updateData: any = {
                name: data.practiceName,
                metadata: JSON.stringify({
                    website: normalizeWebsiteUrl(data.website),
                    phone: data.phoneNumber || "",
                    street: data.street || "",
                    address: data.address || "",
                    zipcode: data.zipCode ? Number(data.zipCode) : undefined,
                    email: data.email || "",
                    // Preserve existing settings
                    print_settings: metadata?.print_settings,
                    notification_settings: metadata?.notification_settings,
                }),
            };

            // Only include image if user has changed/selected a new image
            if (localImageUri && currentUploadedFilename) {
                updateData.image = currentUploadedFilename;
            }

            // Log request body being sent to backend
            console.log("📤 Request Body:", JSON.stringify(updateData, null, 2));

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

    return (
        <KeyboardAwareScrollView
            style={styles.scrollView}
            backgroundColor={colors.background}
            contentContainerStyle={{
                flexGrow: 1,
                paddingTop: insets.top + 10,
            }}
        >
            <View style={styles.avatarContainer}>
                <ImagePickerWrapper onImageSelected={handleImageSelected}>
                    <View style={styles.avatarWrapper}>
                        {isUploading ? (
                            // Show loading indicator while uploading
                            <ActivityIndicator size="small" color={colors.system.gray6} />
                        ) : localImageUri ? (
                            // Show preview after upload is complete (new image)
                            <Image source={{ uri: localImageUri }} style={styles.avatarImage} />
                        ) : practice?.image?.url ? (
                            // Show existing image from server
                            <Image source={{ uri: practice.image.url }} style={styles.avatarImage} />
                        ) : (
                            // Show default avatar when no image
                            <AvatarIcon width={50} height={50} strokeWidth={0} />
                        )}
                        {isUploading ? (
                            <View></View>
                        ) : (
                            <View style={styles.plusButton}>
                                <PlusIcon width={14} height={14} strokeWidth={0} />
                            </View>
                        )}
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
                    { name: "street", label: "Street", optional: true },
                    { name: "address", label: "Address", optional: true },
                ].map((f, i) => (
                    <View key={f.name} style={[styles.formRow, i === 6 ? { borderBottomWidth: 0 } : {}]}>
                        <BaseText type="Body" weight="500" color="system.black" style={styles.label}>
                            {f.label}
                        </BaseText>
                        <View style={styles.inputWrapper}>
                            {f.name === "phoneNumber" ? (
                                <IOSPhoneInput control={control} name={f.name as keyof FormData} label={f.label} optional={f.optional} haveBorder={false} error={errors?.[f.name as keyof FormData]?.message as string} />
                            ) : (
                                <ControlledInput control={control} name={f.name as keyof FormData} label={f.label} optional={f.optional} keyboardType={f.keyboardType as KeyboardTypeOptions} haveBorder={false} error={errors?.[f.name as keyof FormData]?.message as string} />
                            )}
                        </View>
                    </View>
                ))}

                {error?.message && (
                    <BaseText color="system.red" type="Caption2" className="mt-2">
                        {error?.message}
                    </BaseText>
                )}
            </View>
        </KeyboardAwareScrollView>
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
