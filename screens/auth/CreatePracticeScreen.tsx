import { useCreatePractice } from "@/utils/hook";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { Button, Host } from "@expo/ui/swift-ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useLayoutEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ActivityIndicator, Image, Keyboard, KeyboardTypeOptions, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";
import { AvatarIcon, PlusIcon } from "../../assets/icons";
import { BaseText, ControlledInput, ImagePickerWrapper, KeyboardAwareScrollView } from "../../components";
import { QueryKeys } from "../../models/enums";
import { spacing } from "../../styles/spaces";
import colors from "../../theme/colors.shared";
import { normalizeUSPhoneToDashedFormat, normalizeWebsiteUrl } from "../../utils/helper/HelperFunction";
import { storeTokens } from "../../utils/helper/tokenStorage";
import useDebounce from "../../utils/hook/useDebounce";
import { useGetSearchDetail, useMapboxSearch } from "../../utils/hook/useGetMapboxSearch";
import { useTempUpload } from "../../utils/hook/useMedia";

const schema = z.object({
    practiceName: z.string().min(1, "Practice Name is required"),
    website: z.string().optional(),
    phoneNumber: z
        .string()
        .transform((val) => val.replace(/\D/g, ""))
        .refine((val) => val.length === 10 || val.length === 11, {
            message: "Phone number must be 10 digits",
        }),
    specialty: z.string().min(1, "Required"),
    street: z.string().optional(),
    address: z.string().min(1, "Address is required"),
    zipCode: z.string().min(1, "Zip Code is required"),
});

type FormData = z.infer<typeof schema>;

export const CreatePracticeScreen: React.FC = () => {
    const navigation = useNavigation();
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
            street: "",
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
            setUploadedFilename(response.filename ?? null);
        },
        (error) => {
            // Error handled silently
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
            // Error handled silently
        }
    };

    const { setSelectedPractice } = useProfileStore();
    const {
        mutate: createPractice,
        isPending,
        error,
    } = useCreatePractice((data) => {
        // Switch to the newly created practice
        if (data?.data) {
            setSelectedPractice(data.data);
        }
        router.replace("/(tabs)/patients");
        storeTokens(token);
        queryClient.invalidateQueries({ queryKey: [QueryKeys.tokens] });
    });

    const onSubmit = (data: FormData) => {
        const createData = {
            name: data.practiceName,
            metadata: JSON.stringify({
                website: normalizeWebsiteUrl(data.website),
                phone: normalizeUSPhoneToDashedFormat(data.phoneNumber),
                street: data.street || "",
                address: data.address,
                zipcode: Number(data.zipCode),
                print_settings: {
                    avatar: "profile_picture",
                    practiceName: true,
                    doctorName: true,
                    address: true,
                    practicePhone: true,
                    practiceURL: false,
                    practiceEmail: false,
                    practiceSocialMedia: false,
                },
                notification_settings: {
                    imageAdded: true,
                    notes: true,
                    imageEnhanced: true,
                    consentFilled: true,
                    patientAdded: false,
                },
            }),
            type: practiceType.id,
            ...(uploadedFilename ? { image: uploadedFilename } : {}),
        };

        // Log request body being sent to backend
        console.log("📤 Request Body:", JSON.stringify(createData, null, 2));

        createPractice(createData);
    };
    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <Host style={{ width: 65, height: 35 }}>
                    <Button onPress={handleSubmit(onSubmit)} disabled={isPending}>
                        Create
                    </Button>
                </Host>
            ),
        });
    }, [navigation, handleSubmit, onSubmit, isPending]);
    return (
        <KeyboardAwareScrollView style={styles.scrollView} backgroundColor={colors.background} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top }}>
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
                    { name: "zipCode", label: "Zip Code", keyboardType: "phone-pad" },
                    { name: "street", label: "Street" },
                    { name: "address", label: "City, State" },
                ].map((f, i) => (
                    <View key={f.name} style={[styles.formRow, i === 6 ? { borderBottomWidth: 0 } : {}]}>
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
        width: 120,
        // marginTop: spacing["2"],
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
