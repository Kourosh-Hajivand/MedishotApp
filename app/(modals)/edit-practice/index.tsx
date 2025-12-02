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
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
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

    const [selectedImage, setSelectedImage] = useState<string | null>(practice?.image?.url || null);
    const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);

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

    const { mutate: uploadImage, isPending: isUploading } = useTempUpload(
        (response) => {
            setUploadedFilename(response.filename);
        },
        (error) => {
            console.error("Error uploading image:", error.message);
        },
    );

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

    const {
        mutate: updatePractice,
        isPending,
        error,
    } = useUpdatePractice(() => {
        queryClient.invalidateQueries({ queryKey: ["GetPracticeList"] });
        router.back();
    });

    const onSubmit = (data: FormData) => {
        if (!practice?.id) return;

        updatePractice({
            id: practice.id,
            data: {
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
                ...(uploadedFilename ? { image: uploadedFilename } : {}),
            },
        });
    };

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
    }, [navigation, handleSubmit, isPending]);

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 30 : 0}>
            <ScrollView style={styles.scrollView} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 10 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.avatarContainer}>
                    <ImagePickerWrapper onImageSelected={handleImageSelected}>
                        <View style={styles.avatarWrapper}>
                            {selectedImage ? <Image source={{ uri: selectedImage }} style={styles.avatarImage} /> : <AvatarIcon width={50} height={50} strokeWidth={0} />}
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
