import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { ScrollView, StyleSheet, View } from "react-native";
// import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Animated, { useAnimatedKeyboard, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";
import { AvatarIcon, PlusIcon } from "../../assets/icons";
import { BaseButton, BaseText, ControlledInput } from "../../components";
import { QueryKeys } from "../../models/enums";
import { spacing } from "../../styles/spaces";
import colors from "../../theme/colors.shared";
import { usPhoneRegex } from "../../utils/helper/HelperFunction";
import { storeTokens } from "../../utils/helper/tokenStorage";
import useDebounce from "../../utils/hook/useDebounce";
import { PracticeService } from "../../utils/service/PracticeService";
import { CreatePracticeDto } from "../../utils/service/models/RequestModels";

import { useGetSearchDetail, useMapboxSearch } from "../../utils/hook/useGetMapboxSearch";

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
    const keyboard = useAnimatedKeyboard();
    const buttonAnimatedStyle = useAnimatedStyle(() => {
        const height = keyboard.height.value || 0;

        const translateY = height > 0 ? -(height + -60) : 0;
        return { transform: [{ translateY: withTiming(translateY, { duration: 0 }) }] };
    });
    const params = useLocalSearchParams<{ token?: string; practiceType?: string }>();
    const token = params.token as string;
    const practiceType = params.practiceType ? JSON.parse(params.practiceType as string) : undefined;
    const queryClient = useQueryClient();

    const {
        control,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
        setValue,
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            practiceName: "",
            website: "",
            phoneNumber: "",
            specialty: practiceType.title,
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

    const { data } = useGetSearchDetail(Search?.suggestions[0]?.mapbox_id);

    useEffect(() => {
        if (data?.features?.[0]) {
            console.log("data search detail", data);
            const place = data.features[0];
            const fullAddress = place.properties?.place_formatted || place.properties?.full_address;
            setValue("address", fullAddress);
        }
    }, [data, setValue]);

    const contentBottomPadding = insets.bottom + spacing["16"];

    const {
        mutate: createPractice,
        isPending,
        error,
    } = useMutation({
        mutationFn: (data: CreatePracticeDto) => PracticeService.createPractice(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QueryKeys.tokens] });
            queryClient.invalidateQueries({ queryKey: [QueryKeys.profile] });
            router.replace("/(tabs)/patients");
        },
    });

    const onSubmit = (data: FormData) => {
        storeTokens(token);
        queryClient.invalidateQueries({ queryKey: [QueryKeys.tokens] });
        createPractice({
            name: data.practiceName,
            description: ".....",
            metadata: {
                website: data.website,
                email: "",
                phone: data.phoneNumber,
                address: data.address,
            },
            practiceType: practiceType.id,
        });
    };

    return (
        <SafeAreaView style={styles.container} className="flex-1 bg-white">
            <View style={{ flex: 1 }}>
                <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: contentBottomPadding }} showsVerticalScrollIndicator={false}>
                    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                        <View style={styles.avatarContainer} className="items-center justify-center gap-10">
                            <View style={styles.avatarWrapper} className="relative h-[90px] w-[90px] items-center justify-center rounded-full bg-system-gray2">
                                <AvatarIcon width={50} height={50} strokeWidth={0} />
                                <View style={styles.plusButton} className="absolute bottom-0 right-0 rounded-full border border-white bg-system-blue p-1">
                                    <PlusIcon width={14} height={14} strokeWidth={0} />
                                </View>
                            </View>

                            {/* Title */}
                            <View style={styles.titleContainer} className="items-center gap-1">
                                <BaseText type="Title1" weight="700" color="system.black">
                                    Create New Practice
                                </BaseText>
                                <BaseText type="Body" color="labels.secondary" align="center" weight={"400"}>
                                    Start by creating your practice.
                                </BaseText>
                            </View>
                        </View>

                        <View style={styles.formContainer} className="gap-4">
                            <View style={styles.formRow} className="mt-8 flex-row items-center gap-2 overflow-hidden border-b border-system-gray5 py-2">
                                <BaseText type="Title3" weight={"500"} color="system.black" style={{ width: 140, marginTop: spacing["3"] }} className="w-[140px]">
                                    Practice Name
                                </BaseText>
                                <View style={{ flex: 1 }}>
                                    <ControlledInput control={control} name="practiceName" label="Practice Name" haveBorder={false} className="!w-full !flex-1" error={errors.practiceName?.message} />
                                </View>
                            </View>
                            <View style={styles.formRow} className="flex-row items-center gap-2 overflow-hidden border-b border-system-gray5 pb-3">
                                <BaseText type="Title3" weight={"500"} color="system.black" style={{ width: 140, marginTop: spacing["3"] }} className="w-[140px]">
                                    Website
                                </BaseText>
                                <View style={{ flex: 1 }}>
                                    <ControlledInput control={control} name="website" label="Website" optional autoCapitalize="none" haveBorder={false} error={errors.website?.message} />
                                </View>
                            </View>
                            <View style={styles.formRow} className="flex-row items-center gap-2 overflow-hidden border-b border-system-gray5 pb-3">
                                <BaseText type="Title3" weight={"500"} color="system.black" style={{ width: 140, marginTop: spacing["3"] }} className="w-[140px]">
                                    Phone Number
                                </BaseText>
                                <View style={{ flex: 1 }}>
                                    <ControlledInput control={control} name="phoneNumber" label="Phone Number" className="!w-full !flex-1" keyboardType="phone-pad" haveBorder={false} error={errors.phoneNumber?.message} />
                                </View>
                            </View>
                            <View style={styles.formRow} className="flex-row items-center gap-2 overflow-hidden border-b border-system-gray5 pb-3">
                                <BaseText type="Title3" weight={"500"} color="system.black" style={{ width: 140, marginTop: spacing["3"] }} className="w-[140px]">
                                    Specialty
                                </BaseText>
                                <View style={{ flex: 1 }}>
                                    <ControlledInput control={control} name="specialty" label="Specialty" disabled className="!w-full !flex-1" haveBorder={false} error={errors.specialty?.message} />
                                </View>
                            </View>
                            <View style={[styles.formRow]} className=" flex-row items-center gap-2 overflow-hidden border-b border-system-gray5 pb-3">
                                <BaseText type="Title3" weight={"500"} color="system.black" style={{ width: 140, marginTop: spacing["3"] }} className="w-[140px]">
                                    Zip Code
                                </BaseText>
                                <View style={{ flex: 1 }}>
                                    <ControlledInput control={control} name="zipCode" label="Zip Code" className="!w-full !flex-1" haveBorder={false} error={errors.zipCode?.message} />
                                </View>
                            </View>
                            <View style={[styles.formRow, styles.lastFormRow]} className=" flex-row items-center gap-2 overflow-hidden pb-3">
                                <BaseText type="Title3" weight={"500"} color="system.black" style={{ width: 140, marginTop: spacing["3"] }} className="w-[140px]">
                                    Address
                                </BaseText>
                                <View style={{ flex: 1 }}>
                                    <ControlledInput control={control} name="address" label="Address" className="!w-full !flex-1" haveBorder={false} error={errors.address?.message} />
                                </View>
                            </View>
                        </View>
                        {error?.message && (
                            <BaseText color="system.red" type="Caption2" className="mt-2">
                                {error?.message}
                            </BaseText>
                        )}
                    </ScrollView>
                </ScrollView>
                <Animated.View
                    style={[
                        styles.fixedButtonContainer,
                        buttonAnimatedStyle,
                        {
                            left: spacing["4"],
                            right: spacing["4"],
                            bottom: insets.bottom,
                        },
                    ]}
                    pointerEvents="box-none"
                >
                    <BaseButton label="Next" ButtonStyle="Filled" size="Large" disabled={isPending} onPress={handleSubmit(onSubmit)} isLoading={isPending} />
                </Animated.View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: spacing["6"],
    },
    avatarContainer: {
        gap: spacing["6"],
        alignItems: "center",
        justifyContent: "center",
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
        gap: spacing["1"],
        alignItems: "center",
    },
    formContainer: {
        marginTop: spacing["10"],
        gap: spacing["0"],
    },
    formRow: {
        borderBottomWidth: 1,
        borderBottomColor: colors.system.gray5,
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: spacing["2"],
        overflow: "hidden",
        gap: spacing["2"],
        marginTop: spacing["0"],
    },
    lastFormRow: {
        borderBottomWidth: 0,
    },

    gradientOverlay: {
        ...StyleSheet.absoluteFillObject,
        bottom: 0,
        height: "100%",
        width: "100%",
    },
    fixedButtonContainer: {
        position: "absolute",
    },
});

CreatePracticeScreen.displayName = "CreatePracticeScreen";
