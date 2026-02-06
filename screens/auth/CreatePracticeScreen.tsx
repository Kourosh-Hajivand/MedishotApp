import { useCreatePractice } from "@/utils/hook";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { Button, Host } from "@expo/ui/swift-ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { ActivityIndicator, Alert, Image, Keyboard, KeyboardTypeOptions, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";
import { AvatarIcon, PlusIcon } from "../../assets/icons";
import { BaseText, ControlledInput, ImagePickerWrapper, KeyboardAwareScrollView } from "../../components";
import IOSPhoneInput from "../../components/input/IOSPhoneInput";
import { QueryKeys } from "../../models/enums";
import { spacing } from "../../styles/spaces";
import colors from "../../theme/colors.shared";
import { normalizeUSPhoneToDashedFormat, normalizeWebsiteUrl } from "../../utils/helper/HelperFunction";
import useDebounce from "../../utils/hook/useDebounce";
import { useGetSearchDetail, useMapboxSearch } from "../../utils/hook/useGetMapboxSearch";
import { useTempUpload } from "../../utils/hook/useMedia";
import { TempUploadResponse } from "../../utils/service/models/ResponseModels";

const schema = z.object({
    practiceName: z.string().min(1, "Practice Name is required"),
    website: z.string().optional(),
    phoneNumber: z
        .string()
        .min(1, "Phone number is required")
        .refine(
            (val) => {
                const digits = val.replace(/\D/g, "");
                return digits.length === 10 || (val.startsWith("+1") && digits.length === 11);
            },
            { message: "Phone number must be 10 digits" },
        ),
    email: z.string().min(1, "Email is required").email("Invalid email"),
    specialty: z.string().min(1, "Required"),
    street: z.string().min(1, "Street is required"),
    address: z.string().min(1, "Address is required"),
    zipCode: z.string().min(1, "Zip Code is required"),
});

type FormData = z.infer<typeof schema>;

export const CreatePracticeScreen: React.FC = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();
    const params = useLocalSearchParams<{ token?: string; practiceType?: string; requirePractice?: string }>();
    const practiceType = params.practiceType ? JSON.parse(params.practiceType as string) : undefined;
    const requirePractice = params.requirePractice === "1";

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);

    // Refs برای فیلدها
    const practiceNameRef = useRef<TextInput>(null);
    const websiteRef = useRef<TextInput>(null);
    const phoneNumberRef = useRef<TextInput>(null);
    const emailRef = useRef<TextInput>(null);
    const zipCodeRef = useRef<TextInput>(null);
    const streetRef = useRef<TextInput>(null);
    const addressRef = useRef<TextInput>(null);

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
            email: "",
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
        (response: TempUploadResponse) => {
            setUploadedFilename(response.filename ?? null);
        },
        (error) => {
            setSelectedImage(null);
            setUploadedFilename(null);
        },
    );

    const handleImageSelected = async (result: { uri: string; base64?: string | null }) => {
        Keyboard.dismiss();
        setSelectedImage(result.uri);

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

    const { setSelectedPractice } = useProfileStore();
    const {
        mutate: createPractice,
        isPending,
        error,
    } = useCreatePractice(
        async (data) => {
            // Switch to the newly created practice - این practice جدید است که تازه ساخته شده
            if (data?.data) {
                // Set the newly created practice as selected immediately
                await setSelectedPractice(data.data);
            }

            // Invalidate and refetch practice list to refresh it
            queryClient.invalidateQueries({ queryKey: ["GetPracticeList"] });
            queryClient.invalidateQueries({ queryKey: [QueryKeys.profile] });

            // Wait for practice list to refetch
            await queryClient.refetchQueries({ queryKey: ["GetPracticeList"] });

            // Navigate to patients tab
            router.replace("/(tabs)/patients");
        },
        (error) => {
            Alert.alert("Error", error?.message || "Failed to create practice. Please try again.");
        },
    );

    const onSubmit = useCallback(
        (data: FormData) => {
            if (!practiceType?.id) {
                Alert.alert("Error", "Practice type is required. Please try again.");
                return;
            }

            const createData = {
                name: data.practiceName,
                metadata: JSON.stringify({
                    website: normalizeWebsiteUrl(data.website),
                    phone: normalizeUSPhoneToDashedFormat(data.phoneNumber),
                    street: data.street || "",
                    address: data.address,
                    zipcode: Number(data.zipCode),
                    ...(data.email ? { email: data.email } : {}),
                    print_settings: {
                        avatar: "logo",
                        practiceName: true,
                        doctorName: true,
                        address: true,
                        practicePhone: true,
                        practiceURL: true,
                        practiceEmail: true,
                        practiceSocialMedia: true,
                    },
                    notification_settings: {
                        imageAdded: true,
                        notes: true,
                        imageEnhanced: true,
                        consentFilled: true,
                        patientAdded: true,
                    },
                }),
                type: practiceType.id,
                ...(uploadedFilename ? { image: uploadedFilename } : {}),
                ...(data.email ? { email: data.email } : {}),
            };

            createPractice(createData);
        },
        [createPractice, practiceType, uploadedFilename],
    );
    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <Host style={{ width: 65, height: 35 }}>
                    <Button onPress={handleSubmit(onSubmit)} disabled={isPending || isUploading}>
                        Create
                    </Button>
                </Host>
            ),
            ...(requirePractice && {
                headerLeft: () => null,
                gestureEnabled: false,
                fullScreenGestureEnabled: false,
            }),
        });
    }, [navigation, handleSubmit, onSubmit, isPending, isUploading, requirePractice]);
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
                    { name: "practiceName", label: "Practice Name", ref: practiceNameRef, returnKeyType: "next" as const, onSubmitEditing: () => emailRef.current?.focus() },
                    { name: "email", label: "Email", keyboardType: "email-address", ref: emailRef, returnKeyType: "next" as const, onSubmitEditing: () => phoneNumberRef.current?.focus() },
                    { name: "phoneNumber", label: "Phone Number", keyboardType: "phone-pad", ref: phoneNumberRef, returnKeyType: "next" as const, onSubmitEditing: () => websiteRef.current?.focus() },
                    { name: "website", label: "Website", optional: true, ref: websiteRef, returnKeyType: "next" as const, onSubmitEditing: () => zipCodeRef.current?.focus() },
                    { name: "specialty", label: "Specialty", disabled: true },
                    { name: "zipCode", label: "Zip Code", keyboardType: "phone-pad", ref: zipCodeRef, returnKeyType: "next" as const, onSubmitEditing: () => streetRef.current?.focus() },
                    { name: "street", label: "Street", ref: streetRef, returnKeyType: "next" as const, onSubmitEditing: () => addressRef.current?.focus() },
                    { name: "address", label: "City, State", ref: addressRef, returnKeyType: "done" as const, onSubmitEditing: () => Keyboard.dismiss() },
                ].map((f, i) => (
                    <View key={f.name} style={[styles.formRow, i === 7 ? { borderBottomWidth: 0 } : {}]}>
                        <BaseText type="Body" weight="500" color="system.black" style={styles.label}>
                            {f.label}
                        </BaseText>
                        <View style={styles.inputWrapper}>
                            {f.name === "phoneNumber" ? (
                                <IOSPhoneInput
                                    control={control}
                                    name={f.name as keyof FormData}
                                    label={f.label}
                                    optional={f.optional}
                                    haveBorder={false}
                                    error={errors?.[f.name as keyof FormData]?.message as string}
                                    returnKeyType={f.returnKeyType}
                                    blurOnSubmit={f.returnKeyType === "done" ? true : false}
                                    onSubmitEditing={f.onSubmitEditing}
                                    ref={f.ref}
                                />
                            ) : (
                                <ControlledInput
                                    control={control}
                                    name={f.name as keyof FormData}
                                    label={f.label}
                                    optional={f.optional}
                                    disabled={f.disabled}
                                    keyboardType={f.keyboardType as KeyboardTypeOptions}
                                    haveBorder={false}
                                    error={errors?.[f.name as keyof FormData]?.message as string}
                                    returnKeyType={f.returnKeyType}
                                    blurOnSubmit={f.returnKeyType === "done" ? true : false}
                                    onSubmitEditing={f.onSubmitEditing}
                                    ref={f.ref}
                                />
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
