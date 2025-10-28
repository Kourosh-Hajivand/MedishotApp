import { useCreatePractice } from "@/utils/hook";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ActivityIndicator, Image, KeyboardAvoidingView, KeyboardTypeOptions, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";
import { AvatarIcon, PlusIcon } from "../../assets/icons";
import { BaseButton, BaseText, ControlledInput, ImagePickerWrapper } from "../../components";
import { QueryKeys } from "../../models/enums";
import { spacing } from "../../styles/spaces";
import colors from "../../theme/colors.shared";
import { usPhoneRegex } from "../../utils/helper/HelperFunction";
import { storeTokens } from "../../utils/helper/tokenStorage";
import useDebounce from "../../utils/hook/useDebounce";
import { useGetSearchDetail, useMapboxSearch } from "../../utils/hook/useGetMapboxSearch";
import { useTempUpload } from "../../utils/hook/useMedia";

const schema = z.object({
    practiceName: z.string().min(1, "Practice Name is required"),
    website: z.string().optional(),
    phoneNumber: z.string().min(10, "Phone number is too short").max(14, "Phone number is too long").regex(usPhoneRegex, "Invalid US phone number"),
    specialty: z.string().min(1, "Required"),
    address: z.string().min(1, "Address is required"),
    zipCode: z.string().min(1, "Zip Code is required"),
});

type FormData = z.infer<typeof schema>;

export const CreatePracticeScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();
    const params = useLocalSearchParams<{ token?: string; practiceType?: string }>();
    const token = params.token as string;
    const practiceType = params.practiceType ? JSON.parse(params.practiceType as string) : undefined;

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
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
            practiceName: "",
            website: "",
            phoneNumber: "",
            specialty: practiceType?.title || "",
            address: "",
            zipCode: "",
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
            console.log("Image uploaded successfully:", response.filename);
        },
        (error) => {
            console.error("Error uploading image:", error.message);
        },
    );

    const handleImageSelected = async (result: { uri: string; base64?: string | null }) => {
        setSelectedImage(result.uri);

        // تبدیل URI به File object برای آپلود
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
        mutate: createPractice,
        isPending,
        error,
    } = useCreatePractice(() => {
        router.replace("/(tabs)/patients");
    });

    const onSubmit = (data: FormData) => {
        storeTokens(token);
        queryClient.invalidateQueries({ queryKey: [QueryKeys.tokens] });
        createPractice({
            name: data.practiceName,
            metadata: {
                website: data.website,
                email: "",
                phone: data.phoneNumber,
                address: data.address,
            },
            type: practiceType.id,
            image: uploadedFilename || undefined,
        });
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 30 : 0}>
            <ScrollView style={styles.scrollView} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.avatarContainer}>
                    <ImagePickerWrapper onImageSelected={handleImageSelected}>
                        <View style={styles.avatarWrapper}>
                            {selectedImage ? <Image source={{ uri: selectedImage }} style={styles.avatarImage} /> : <AvatarIcon width={50} height={50} strokeWidth={0} />}
                            <View style={styles.plusButton}>{isUploading ? <ActivityIndicator size="small" color={colors.system.white} /> : <PlusIcon width={14} height={14} strokeWidth={0} />}</View>
                        </View>
                    </ImagePickerWrapper>
                    <View style={styles.titleContainer}>
                        <BaseText type="Title1" weight="700" color="system.black">
                            Create New Practice
                        </BaseText>
                        <BaseText type="Body" color="labels.secondary" align="center">
                            Start by creating your practice.
                        </BaseText>
                    </View>
                </View>

                {/* Form */}
                <View style={styles.formContainer}>
                    {[
                        { name: "practiceName", label: "Practice Name" },
                        { name: "website", label: "Website", optional: true },
                        { name: "phoneNumber", label: "Phone Number", keyboardType: "phone-pad" },
                        { name: "specialty", label: "Specialty", disabled: true },
                        { name: "zipCode", label: "Zip Code" },
                        { name: "address", label: "Address" },
                    ].map((f, i) => (
                        <View key={f.name} style={[styles.formRow, i === 5 ? { borderBottomWidth: 0 } : {}]}>
                            <BaseText type="Body" weight="500" color="system.black" style={styles.label}>
                                {f.label}
                            </BaseText>
                            <View style={styles.inputWrapper}>
                                <ControlledInput control={control} name={f.name as keyof FormData} label={f.label} optional={f.optional} disabled={f.disabled} keyboardType={f.keyboardType as KeyboardTypeOptions} haveBorder={false} error={errors?.[f.name as keyof FormData]?.message as string} />
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

            {/* Fixed bottom button */}
            <View style={[styles.buttonContainer, { paddingBottom: insets.bottom || 20 }]}>
                <BaseButton label="Next" ButtonStyle="Filled" size="Large" disabled={isPending} isLoading={isPending} onPress={handleSubmit(onSubmit)} />
            </View>
        </KeyboardAvoidingView>
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
    formContainer: {
        marginTop: spacing["10"],
    },
    formRow: {
        flexDirection: "row",
        alignItems: "center",
        // alignItems: "flex-start",
        paddingVertical: spacing["3"],
        borderBottomWidth: 1,
        borderBottomColor: colors.system.gray5,
    },
    label: {
        width: 140,
        marginTop: spacing["2"],
    },
    inputWrapper: {
        flex: 1,
    },
    buttonContainer: {
        backgroundColor: colors.background,
        paddingHorizontal: spacing["4"],
    },
});

CreatePracticeScreen.displayName = "CreatePracticeScreen";
