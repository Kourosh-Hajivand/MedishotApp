import { BaseButton, BaseText } from "@/components";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { getRelativeTime } from "@/utils/helper/dateUtils";
import { useGetPatientById } from "@/utils/hook";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Dimensions, Linking, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { blurValue } from "./_layout";

export default function PatientDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const navigation = useNavigation();
    const safeAreaInsets = useSafeAreaInsets();
    const { data: patient, isLoading } = useGetPatientById(id);
    console.log("====================================");
    console.log(patient);
    console.log("====================================");
    const tabs = ["Media", "Consent", "ID", "Activities"];
    const [activeTab, setActiveTab] = useState(0);

    const screenWidth = Dimensions.get("window").width;
    const tabWidth = (screenWidth - 32) / tabs.length;
    const translateX = useRef(new Animated.Value(0)).current;

    const handleTabPress = (index: number) => {
        setActiveTab(index);
        Animated.spring(translateX, {
            toValue: index * tabWidth,
            useNativeDriver: true,
            speed: 20,
        }).start();
    };

    const handleCall = async () => {
        const phoneNumber = patient?.data?.numbers?.[0]?.value;
        if (!phoneNumber) {
            Alert.alert("Error", "No phone number found");
            return;
        }
        const url = `tel:${phoneNumber}`;

        try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
            } else {
                Alert.alert("Error", "Cannot make phone call");
            }
        } catch (error) {
            Alert.alert("Error", "Error making phone call");
        }
    };

    const handleMessage = async () => {
        const phoneNumber = patient?.data?.numbers?.[0]?.value;
        if (!phoneNumber) {
            Alert.alert("Error", "No phone number found");
            return;
        }
        const url = `sms:${phoneNumber}`;

        try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
            } else {
                Alert.alert("Error", "Cannot send message");
            }
        } catch (error) {
            Alert.alert("Error", "Error sending message");
        }
    };

    // Scroll animation logic
    const scrollY = useRef(new Animated.Value(0)).current;
    const HEADER_DISTANCE = 120;

    const avatarScale = scrollY.interpolate({
        inputRange: [0, HEADER_DISTANCE],
        outputRange: [1, 0.7],
        extrapolate: "clamp",
    });

    const avatarTranslateY = scrollY.interpolate({
        inputRange: [0, HEADER_DISTANCE],
        outputRange: [0, -35],
        extrapolate: "clamp",
    });

    const nameOpacity = scrollY.interpolate({
        inputRange: [0, HEADER_DISTANCE * 0.7, HEADER_DISTANCE],
        outputRange: [1, 0.5, 0],
        extrapolate: "clamp",
    });

    const titleOpacity = scrollY.interpolate({
        inputRange: [0, HEADER_DISTANCE * 0.8, HEADER_DISTANCE],
        outputRange: [0, 0.3, 1],
        extrapolate: "clamp",
    });

    useEffect(() => {
        scrollY.addListener(({ value }) => blurValue.setValue(value));
        return () => scrollY.removeAllListeners();
    }, []);

    useEffect(() => {
        const listener = scrollY.addListener(({ value }) => {
            navigation.setOptions({ headerTitle: value > HEADER_DISTANCE ? patient?.data?.first_name + " " + patient?.data?.last_name : "" });
        });
        return () => scrollY.removeListener(listener);
    }, [navigation]);

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color={colors.system.blue} />
            </View>
        );
    }
    return (
        <View style={{ flex: 1, backgroundColor: colors.system.gray6 }}>
            <Animated.ScrollView
                contentContainerStyle={{
                    paddingTop: safeAreaInsets.top + 45,

                    flexGrow: 1,
                }}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
                    useNativeDriver: false,
                })}
            >
                {/* --- Animated Header --- */}
                <View className="items-center justify-center mb-6">
                    <Animated.View
                        style={{
                            transform: [{ translateY: avatarTranslateY }, { scale: avatarScale }],
                            alignItems: "center",
                        }}
                    >
                        <Avatar name={patient?.data?.first_name + " " + patient?.data?.last_name} size={100} haveRing imageUrl={patient?.data?.profile_image?.url} />
                    </Animated.View>

                    <Animated.View style={{ opacity: nameOpacity, alignItems: "center", marginTop: 10 }}>
                        <BaseText type="Title1" weight={600} color="labels.primary">
                            {patient?.data?.first_name} {patient?.data?.last_name}
                        </BaseText>
                        <BaseText type="Callout" weight={400} color="labels.secondary">
                            last update: {patient?.data?.updated_at ? getRelativeTime(patient.data.updated_at) : ""}
                        </BaseText>
                    </Animated.View>
                </View>

                {/* --- Quick Actions --- */}
                <View className="gap-5 px-5">
                    <View className="w-full h-[76px] bg-white rounded-xl flex-row">
                        <TouchableOpacity className="flex-1 items-center justify-center gap-2 border-r border-border">
                            <IconSymbol name="camera" color={colors.system.blue} size={26} />
                            <BaseText type="Footnote" color="labels.primary">
                                Take photo
                            </BaseText>
                        </TouchableOpacity>
                        <TouchableOpacity className="flex-1 items-center justify-center gap-2 border-r border-border">
                            <IconSymbol name="checklist" color={colors.system.blue} size={26} />
                            <BaseText type="Footnote" color="labels.primary">
                                Fill consent
                            </BaseText>
                        </TouchableOpacity>
                        <TouchableOpacity className="flex-1 items-center justify-center gap-2">
                            <IconSymbol name="person.text.rectangle" color={colors.system.blue} size={26} />
                            <BaseText type="Footnote" color="labels.primary">
                                Add ID
                            </BaseText>
                        </TouchableOpacity>
                    </View>

                    {/* --- Info Card --- */}
                    <View className="bg-white py-2 px-4 rounded-xl">
                        {patient?.data?.numbers && patient?.data?.numbers.length > 0 && (
                            <View className="flex-row items-center justify-between pb-2 border-b border-border">
                                {patient?.data?.numbers && (
                                    <View>
                                        <BaseText type="Subhead" color="labels.secondary">
                                            Phone
                                        </BaseText>
                                        <BaseText type="Subhead" color="labels.primary">
                                            {patient?.data?.numbers[0]?.value}
                                        </BaseText>
                                    </View>
                                )}
                                <View className="flex-row gap-3">
                                    <BaseButton ButtonStyle="Tinted" noText leftIcon={<IconSymbol name="message.fill" color={colors.system.blue} size={16} />} style={{ width: 30, height: 30 }} onPress={handleMessage} />
                                    <BaseButton ButtonStyle="Tinted" noText leftIcon={<IconSymbol name="phone.fill" color={colors.system.blue} size={16} />} style={{ width: 30, height: 30 }} onPress={handleCall} />
                                </View>
                            </View>
                        )}

                        <View className={`flex-row ${patient?.data?.numbers && patient?.data?.numbers.length > 0 ? "pt-2" : ""}`}>
                            <View className="flex-1 border-r border-border">
                                <BaseText type="Subhead" color="labels.secondary">
                                    assigned to:
                                </BaseText>
                                <BaseText type="Subhead" color="labels.primary">
                                    Dr.{patient?.data?.doctor?.first_name} {patient?.data?.doctor?.last_name}
                                </BaseText>
                            </View>
                            <View className="flex-1 pl-3">
                                <BaseText type="Subhead" color="labels.secondary">
                                    chart number:
                                </BaseText>
                                <BaseText type="Subhead" color="labels.primary">
                                    #{patient?.data?.metadata?.chart_number}
                                </BaseText>
                            </View>
                        </View>
                    </View>
                </View>

                {/* --- Tabs --- */}
                <View className="flex-1 flex-grow bg-white rounded-xl mt-6 overflow-hidden">
                    <View className="px-5 border-b border-border">
                        <View className="flex-row relative">
                            {tabs.map((tab, i) => (
                                <TouchableOpacity key={tab} onPress={() => handleTabPress(i)} className="flex-1 items-center justify-center py-3">
                                    <BaseText type="Subhead" weight={activeTab === i ? 600 : 400} color={activeTab === i ? "system.blue" : "labels.secondary"}>
                                        {tab}
                                    </BaseText>
                                </TouchableOpacity>
                            ))}
                            <Animated.View
                                style={{
                                    position: "absolute",
                                    bottom: 0,
                                    height: 3,
                                    width: tabWidth,
                                    backgroundColor: colors.system.blue,
                                    transform: [{ translateX }],
                                    borderTopLeftRadius: 3,
                                    borderTopRightRadius: 3,
                                }}
                            />
                        </View>
                    </View>

                    <View className="flex-1 flex-grow p-4">
                        {activeTab === 0 && <View />}
                        {activeTab === 1 && <BaseText>📝 Consent details...</BaseText>}
                        {activeTab === 2 && <BaseText>🪪 ID info...</BaseText>}
                        {activeTab === 3 && <BaseText>📊 Activity log...</BaseText>}
                    </View>
                </View>
            </Animated.ScrollView>
        </View>
    );
}
