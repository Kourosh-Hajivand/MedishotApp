import { BaseButton, BaseText } from "@/components";
import { GalleryWithMenu } from "@/components/Image/GalleryWithMenu";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { parseUSIDCardData } from "@/utils/helper/HelperFunction";
import { getRelativeTime } from "@/utils/helper/dateUtils";
import { useGetPatientById } from "@/utils/hook";
import { useHeaderHeight } from "@react-navigation/elements";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Dimensions, Linking, Image as RNImage, TouchableOpacity, View } from "react-native";
import DocumentScanner from "react-native-document-scanner-plugin";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TextRecognition from "react-native-text-recognition";
import { ConsentTabContent } from "./ConsentTabContent";
import { blurValue } from "./_layout";

type RowKind = "header" | "tabs" | "content";

export default function PatientDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const navigation = useNavigation();
    const { data: patient, isLoading } = useGetPatientById(id);
    console.log("====================================");
    console.log(patient?.data);
    console.log("====================================");
    const headerHeight = useHeaderHeight();
    const safe = useSafeAreaInsets();

    const tabs = ["Media", "Consent", "ID", "Activities"];
    const [activeTab, setActiveTab] = useState(0);
    const [firstImageUri, setFirstImageUri] = useState<string>("");

    useEffect(() => {
        const imageSource = require("../../assets/images/img_0944.jpg");
        const resolved = RNImage.resolveAssetSource(imageSource);
        if (resolved?.uri) {
            setFirstImageUri(resolved.uri);
        }
    }, []);

    const screenWidth = Dimensions.get("window").width;
    const tabWidth = (screenWidth - 32) / tabs.length;
    const translateX = useRef(new Animated.Value(0)).current;

    const handleTabPress = (index: number) => {
        setActiveTab(index);
        Animated.spring(translateX, { toValue: index * tabWidth, useNativeDriver: true, speed: 20 }).start();
    };

    const handleCall = async () => {
        const phoneNumber = patient?.data?.numbers?.[0]?.value;
        if (!phoneNumber) return Alert.alert("Error", "No phone number found");
        const url = `tel:${phoneNumber}`;
        try {
            (await Linking.canOpenURL(url)) ? Linking.openURL(url) : Alert.alert("Error", "Cannot make phone call");
        } catch {
            Alert.alert("Error", "Error making phone call");
        }
    };

    const handleMessage = async () => {
        const phoneNumber = patient?.data?.numbers?.[0]?.value;
        if (!phoneNumber) return Alert.alert("Error", "No phone number found");
        const url = `sms:${phoneNumber}`;
        try {
            (await Linking.canOpenURL(url)) ? Linking.openURL(url) : Alert.alert("Error", "Cannot send message");
        } catch {
            Alert.alert("Error", "Error sending message");
        }
    };

    const scanDocument = async () => {
        try {
            const { scannedImages } = await DocumentScanner.scanDocument({
                maxNumDocuments: 1,
            });

            if (scannedImages && scannedImages.length > 0) {
                const imagePath = scannedImages[0];

                const path = imagePath.replace("file://", "");

                const lines = await TextRecognition.recognize(path);
                const fullText = Array.isArray(lines) ? lines.join("\n") : String(lines ?? "");
                console.log("OCR:", fullText);
                // Parse the extracted data
                const parsed = parseUSIDCardData(fullText, imagePath);
                console.log("Parsed ID Card Data:", parsed);
                // TODO: Save parsed data to patient record
                Alert.alert("Success", "ID card scanned successfully!");
            }
        } catch (error) {
            console.error("Document scan or OCR failed:", error);
            Alert.alert("Error", "Failed to scan document. Please try again.");
        }
    };

    // Scroll animation / blur
    const scrollY = useRef(new Animated.Value(-headerHeight)).current;
    // const HEADER_DISTANCE = 30;

    const HEADER_DISTANCE = 60;
    const scrollStart = -headerHeight + 60;
    const animationStart = scrollStart; // انیمیشن از scrollStart شروع می‌شود تا فاصله بالا رو هم در نظر بگیره
    const animationEnd = scrollStart + HEADER_DISTANCE;

    const avatarScale = scrollY.interpolate({
        inputRange: [animationStart, animationEnd],
        outputRange: [1, 0.7],
        extrapolate: "clamp",
    });

    const avatarTranslateY = scrollY.interpolate({
        inputRange: [animationStart, animationEnd],
        outputRange: [0, -35],
        extrapolate: "clamp",
    });

    const avatarOpacity = scrollY.interpolate({
        inputRange: [animationStart, animationStart + HEADER_DISTANCE * 0.8, animationEnd],
        outputRange: [1, 0.5, 0.2],
        extrapolate: "clamp",
    });
    const nameOpacity = scrollY.interpolate({
        inputRange: [animationStart, animationStart + HEADER_DISTANCE * 0.7, animationEnd],
        outputRange: [1, 0.5, 0],
        extrapolate: "clamp",
    });

    const SNAP_THRESHOLD = scrollStart + 50;

    const handleSnapScroll = (event: any) => {
        const y = event.nativeEvent.contentOffset.y;

        if (y > scrollStart && y < SNAP_THRESHOLD) {
            // اگر نصفه اسکرول کرده، برگرد بالا
            Animated.spring(scrollY, {
                toValue: scrollStart,
                useNativeDriver: false,
                speed: 8,
                bounciness: 0,
            }).start();
        } else if (y >= SNAP_THRESHOLD && y < animationEnd) {
            // اگر بیشتر از نصفه رفته، بره بالا کامل
            Animated.spring(scrollY, {
                toValue: animationEnd,
                useNativeDriver: false,
                speed: 8,
                bounciness: 0,
            }).start();
        }
    };
    useEffect(() => {
        const sub = scrollY.addListener(({ value }) => blurValue.setValue(value));
        return () => scrollY.removeListener(sub);
    }, []);

    useEffect(() => {
        if (!patient?.data) return;
        const sub = scrollY.addListener(({ value }) => {
            navigation.setOptions({ headerTitle: value > animationEnd ? `${patient?.data?.first_name} ${patient?.data?.last_name}` : "" });
        });
        return () => scrollY.removeListener(sub);
    }, [navigation, patient?.data, animationEnd]);

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color={colors.system.blue} />
            </View>
        );
    }

    // ترتیب آیتم‌ها: Header → Tabs(sticky) → Content
    const DATA: { key: RowKind }[] = [{ key: "header" }, { key: "tabs" }, { key: "content" }];
    console.log("==patient?.data==== patient?.data=================== patient?.data===========");
    console.log(patient?.data);
    console.log("====================================");
    const renderRow = ({ item }: { item: { key: RowKind } }) => {
        if (item.key === "header") {
            return (
                <>
                    <View className="items-center justify-center mb-6">
                        <Animated.View style={{ transform: [{ translateY: avatarTranslateY }, { scale: avatarScale }], opacity: avatarOpacity, alignItems: "center" }}>
                            <Avatar name={`${patient?.data?.first_name ?? ""} ${patient?.data?.last_name ?? ""}`} size={100} haveRing color={patient?.data?.doctor?.color} imageUrl={patient?.data?.profile_image?.url} />
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

                    <View className="gap-5 px-5 mb-6">
                        <View className="w-full h-[76px] bg-white rounded-xl flex-row">
                            <TouchableOpacity
                                className="flex-1 items-center justify-center gap-2 border-r border-border"
                                onPress={() => {
                                    router.push({
                                        pathname: "/camera" as any,
                                        params: {
                                            patientId: id,
                                            patientName: `${patient?.data?.first_name || ""} ${patient?.data?.last_name || ""}`,
                                            patientAvatar: patient?.data?.profile_image?.url || "",
                                            doctorName: `Dr. ${patient?.data?.doctor?.first_name || ""} ${patient?.data?.doctor?.last_name || ""}`,
                                        },
                                    });
                                }}
                            >
                                <IconSymbol name="camera" color={colors.system.blue} size={26} />
                                <BaseText type="Footnote" color="labels.primary">
                                    Take photo
                                </BaseText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 items-center justify-center gap-2 border-r border-border"
                                onPress={() => {
                                    router.push({
                                        pathname: "/(modals)/select-contract",
                                        params: {
                                            patientId: id,
                                        },
                                    });
                                }}
                            >
                                <IconSymbol name="checklist" color={colors.system.blue} size={26} />
                                <BaseText type="Footnote" color="labels.primary">
                                    Fill consent
                                </BaseText>
                            </TouchableOpacity>
                            <TouchableOpacity className="flex-1 items-center justify-center gap-2" onPress={scanDocument}>
                                <IconSymbol name="person.text.rectangle" color={colors.system.blue} size={26} />
                                <BaseText type="Footnote" color="labels.primary">
                                    Add ID
                                </BaseText>
                            </TouchableOpacity>
                        </View>

                        <View className="bg-white py-2 px-4 rounded-xl">
                            {!!patient?.data?.numbers?.length && (
                                <View className="flex-row items-center justify-between pb-2 border-b border-border">
                                    <View>
                                        <BaseText type="Subhead" color="labels.secondary">
                                            Phone
                                        </BaseText>
                                        <BaseText type="Subhead" color="labels.primary">
                                            {patient?.data?.numbers?.[0]?.value}
                                        </BaseText>
                                    </View>
                                    <View className="flex-row gap-3">
                                        <BaseButton ButtonStyle="Tinted" noText leftIcon={<IconSymbol name="message.fill" color={colors.system.blue} size={16} />} style={{ width: 30, height: 30 }} onPress={handleMessage} />
                                        <BaseButton ButtonStyle="Tinted" noText leftIcon={<IconSymbol name="phone.fill" color={colors.system.blue} size={16} />} style={{ width: 30, height: 30 }} onPress={handleCall} />
                                    </View>
                                </View>
                            )}

                            <View className={`flex-row ${patient?.data?.numbers?.length ? "pt-2" : ""}`}>
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
                                        #{patient?.data?.chart_number}
                                    </BaseText>
                                </View>
                            </View>
                        </View>
                    </View>
                </>
            );
        }

        if (item.key === "tabs") {
            return (
                <View className="bg-white border-t  border-t-white" style={{ borderBottomWidth: 1, borderBottomColor: colors.border, zIndex: 100 }}>
                    <View className="px-5">
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
                </View>
            );
        }

        return (
            <View style={{ flex: 1, backgroundColor: colors.system.white }}>
                {activeTab === 0 && (
                    <GalleryWithMenu
                        menuItems={[
                            {
                                icon: "slider.horizontal.3",
                                label: "Edit Photo",
                                onPress: (imageUri) => {
                                    router.push({
                                        pathname: "/(fullmodals)/image-editor",
                                        params: { uri: imageUri },
                                    });
                                },
                            },
                            {
                                icon: "sparkles",
                                label: "Use Magic",
                                onPress: (imageUri) => {
                                    router.push({
                                        pathname: "/(fullmodals)/image-editor",
                                        params: { uri: imageUri },
                                    });
                                },
                            },
                            {
                                icon: "square.and.arrow.up",
                                label: "Share",
                                role: "default",
                                onPress: () => console.log("Share pressed"),
                            },
                            {
                                icon: "archivebox",
                                label: "Archive Image",
                                role: "destructive",
                                onPress: () => console.log("Archive Image pressed"),
                            },
                        ]}
                        patientData={patient?.data}
                        images={[firstImageUri || `https://picsum.photos/200/300?random=0`, ...Array.from({ length: 49 }, (_, i) => `https://picsum.photos/200/300?random=${i + 1}`)]}
                    />
                )}
                {activeTab === 1 && <ConsentTabContent patientId={id} />}
                {activeTab === 2 && <BaseText className="p-5">🪪 ID info...</BaseText>}
                {activeTab === 3 && <BaseText className="p-5">📊 Activity log...</BaseText>}
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.system.gray6 }}>
            <Animated.FlatList
                data={DATA}
                onMomentumScrollEnd={handleSnapScroll}
                keyExtractor={(it) => it.key}
                renderItem={renderRow}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                // تب‌ها حالا ایندکس 1 هستند
                stickyHeaderIndices={[1]}
                // «فضای مجازی» برای هدر شفاف
                contentInset={{ top: headerHeight }}
                contentOffset={{ x: 0, y: -headerHeight }}
                contentInsetAdjustmentBehavior="never"
                scrollIndicatorInsets={{ top: headerHeight, bottom: safe.bottom }}
                contentContainerStyle={{
                    paddingBottom: 100,
                }}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
            />
        </View>
    );
}
