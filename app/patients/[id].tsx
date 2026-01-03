import { BaseButton, BaseText } from "@/components";
import { GalleryWithMenu } from "@/components/Image/GalleryWithMenu";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { parseUSIDCardData } from "@/utils/helper/HelperFunction";
import { getRelativeTime } from "@/utils/helper/dateUtils";
import { useCreatePatientDocument, useGetPatientActivities, useGetPatientById, useGetPatientDocuments, useTempUpload } from "@/utils/hook";
import { useDeletePatientMedia, useGetPatientMedia } from "@/utils/hook/useMedia";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { useHeaderHeight } from "@react-navigation/elements";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Dimensions, Linking, Share, TouchableOpacity, View } from "react-native";
import DocumentScanner from "react-native-document-scanner-plugin";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TextRecognition from "react-native-text-recognition";
import { ActivitiesTabContent } from "./_components/ActivitiesTabContent";
import { ConsentTabContent } from "./_components/ConsentTabContent";
import { IDTabContent } from "./_components/IDTabContent";
import { blurValue } from "./_layout";

type RowKind = "header" | "tabs" | "content";

export default function PatientDetailsScreen() {
    const { id, action, phoneIndex } = useLocalSearchParams<{ id: string; action?: string; phoneIndex?: string }>();
    const navigation = useNavigation();
    const { selectedPractice } = useProfileStore();
    const { data: patient, isLoading } = useGetPatientById(id);
    const { data: patientMediaData, isLoading: isLoadingMedia } = useGetPatientMedia(id, !!id);
    const { data: activitiesData, isLoading: isLoadingActivities } = useGetPatientActivities(selectedPractice?.id, id, !!id && !!selectedPractice?.id);
    const { data: documentsData, isLoading: isLoadingDocuments } = useGetPatientDocuments(selectedPractice?.id, id, !!id && !!selectedPractice?.id);
    const headerHeight = useHeaderHeight();
    const safe = useSafeAreaInsets();

    // Temp upload for scanned documents
    const { mutate: uploadScannedImage, isPending: isUploadingScannedImage } = useTempUpload(
        (response) => {
            const responseAny = response as any;
            const filename = (responseAny?.data?.filename ?? response.filename) || null;
            if (filename) {
                console.log("📸 [scanDocument] Image uploaded, filename:", filename);
                // Create document with the filename
                createDocument({
                    type: "id_card",
                    description: "Scanned ID Document",
                    image: filename, // Send filename string, not File
                });
            } else {
                Alert.alert("Error", "Failed to upload scanned image");
            }
        },
        (error) => {
            console.error("❌ [scanDocument] Upload error:", error);
            Alert.alert("Error", "Failed to upload scanned image");
        },
    );

    // Create document mutation
    const { mutate: createDocument } = useCreatePatientDocument(
        selectedPractice?.id,
        id,
        (data) => {
            console.log("✅ [scanDocument] Document created successfully:", data);
            Alert.alert("Success", "ID document uploaded successfully!");
        },
        (error) => {
            console.error("❌ [scanDocument] Create document error:", error);
            Alert.alert("Error", "Failed to create document");
        },
    );

    const tabs = ["Media", "Consent", "ID", "Activities"];
    const [activeTab, setActiveTab] = useState(0);

    // Calculate age from birth_date
    const patientAge = useMemo(() => {
        if (!patient?.data?.birth_date) return null;
        try {
            const birthDate = new Date(patient.data.birth_date);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age;
        } catch {
            return null;
        }
    }, [patient?.data?.birth_date]);

    // Create a map from image URL to mediaId (patient_media_id)
    const imageUrlToMediaIdMap = useMemo(() => {
        const map = new Map<string, number>();
        if (!patientMediaData?.data || !Array.isArray(patientMediaData.data)) return map;

        patientMediaData.data.forEach((media: any) => {
            const mediaId = media.id; // patient_media_id

            // If media has a template, extract images from template.images array
            if (media.template && media.images && Array.isArray(media.images)) {
                media.images.forEach((img: any) => {
                    if (img.image?.url) {
                        map.set(img.image.url, mediaId);
                    }
                });
            }
            // If media doesn't have a template, use original_media
            else if (media.original_media?.url) {
                map.set(media.original_media.url, mediaId);
            }
            // Fallback: check if media.media exists (old structure)
            else if (media.media?.url) {
                map.set(media.media.url, mediaId);
            }
        });

        return map;
    }, [patientMediaData?.data]);

    // Extract and group images by date from patient media
    const groupedPatientImages = useMemo(() => {
        if (!patientMediaData?.data || !Array.isArray(patientMediaData.data)) {
            return [];
        }

        // Map to store images grouped by date
        const imagesByDate = new Map<string, string[]>();

        patientMediaData.data.forEach((media: any) => {
            // Get the date from created_at
            const createdAt = media.created_at;
            if (!createdAt) return;

            // Format date as "MMMM D, YYYY" (e.g., "January 2, 2026")
            const date = new Date(createdAt);
            const dateKey = date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

            // Initialize array for this date if it doesn't exist
            if (!imagesByDate.has(dateKey)) {
                imagesByDate.set(dateKey, []);
            }

            const dateImages = imagesByDate.get(dateKey)!;

            // If media has a template, extract images from template.images array
            if (media.template && media.images && Array.isArray(media.images)) {
                media.images.forEach((img: any) => {
                    if (img.image?.url) {
                        dateImages.push(img.image.url);
                    }
                });
            }
            // If media doesn't have a template, use original_media
            else if (media.original_media?.url) {
                dateImages.push(media.original_media.url);
            }
            // Fallback: check if media.media exists (old structure)
            else if (media.media?.url) {
                dateImages.push(media.media.url);
            }
        });

        // Convert Map to array of sections, sorted by date (newest first)
        const sections = Array.from(imagesByDate.entries())
            .map(([date, images]) => ({
                title: date,
                data: images,
            }))
            .sort((a, b) => {
                // Sort by date (newest first)
                const dateA = new Date(a.title);
                const dateB = new Date(b.title);
                return dateB.getTime() - dateA.getTime();
            });

        return sections;
    }, [patientMediaData?.data]);

    // Archive media mutation
    const { mutate: archiveMedia, isPending: isArchiving } = useDeletePatientMedia(
        () => {
            Alert.alert("Success", "Image archived successfully");
        },
        (error) => {
            console.error("Error archiving media:", error);
            Alert.alert("Error", error.message || "Failed to archive image");
        },
    );

    const handleArchiveImage = (imageUri: string) => {
        const mediaId = imageUrlToMediaIdMap.get(imageUri);
        if (!mediaId) {
            Alert.alert("Error", "Could not find media ID for this image");
            return;
        }

        Alert.alert("Archive Image", "Are you sure you want to archive this image?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Archive",
                style: "destructive",
                onPress: () => {
                    archiveMedia({ patientId: id, mediaId });
                },
            },
        ]);
    };

    const screenWidth = Dimensions.get("window").width;
    const screenHeight = Dimensions.get("window").height;
    const tabWidth = (screenWidth - 32) / tabs.length;
    const translateX = useRef(new Animated.Value(0)).current;

    const handleTabPress = (index: number) => {
        setActiveTab(index);
        Animated.spring(translateX, { toValue: index * tabWidth, useNativeDriver: true, speed: 20 }).start();
    };

    const handleCall = async (index?: number) => {
        const numbers = patient?.data?.numbers;
        if (!numbers || numbers.length === 0) return Alert.alert("Error", "No phone number found");

        const phoneIndex = index !== undefined ? index : 0;
        const phoneNumber = typeof numbers[phoneIndex] === "string" ? numbers[phoneIndex] : numbers[phoneIndex]?.value;
        if (!phoneNumber) return Alert.alert("Error", "No phone number found");

        const url = `tel:${phoneNumber}`;
        try {
            (await Linking.canOpenURL(url)) ? Linking.openURL(url) : Alert.alert("Error", "Cannot make phone call");
        } catch {
            Alert.alert("Error", "Error making phone call");
        }
    };

    const handleMessage = async (index?: number) => {
        const numbers = patient?.data?.numbers;
        if (!numbers || numbers.length === 0) return Alert.alert("Error", "No phone number found");

        const phoneIndex = index !== undefined ? index : 0;
        const phoneNumber = typeof numbers[phoneIndex] === "string" ? numbers[phoneIndex] : numbers[phoneIndex]?.value;
        if (!phoneNumber) return Alert.alert("Error", "No phone number found");

        const url = `sms:${phoneNumber}`;
        try {
            (await Linking.canOpenURL(url)) ? Linking.openURL(url) : Alert.alert("Error", "Cannot send message");
        } catch {
            Alert.alert("Error", "Error sending message");
        }
    };

    // Handle action parameter
    useEffect(() => {
        if (!action || !patient?.data || !id) return;

        switch (action) {
            case "call": {
                const callIndex = phoneIndex ? parseInt(phoneIndex) : undefined;
                handleCall(callIndex);
                break;
            }
            case "message": {
                const messageIndex = phoneIndex ? parseInt(phoneIndex) : undefined;
                handleMessage(messageIndex);
                break;
            }
            case "addId":
                scanDocument();
                break;
            case "takePhoto":
                router.push({
                    pathname: "/camera" as any,
                    params: {
                        patientId: id,
                    },
                });
                break;
            case "fillConsent":
                router.push({
                    pathname: "/(modals)/select-contract" as any,
                    params: {
                        patientId: id,
                    },
                });
                break;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [action, phoneIndex, patient?.data, id]);

    const scanDocument = async () => {
        try {
            const { scannedImages } = await DocumentScanner.scanDocument({
                maxNumDocuments: 1,
            });

            if (scannedImages && scannedImages.length > 0) {
                // Only take the first image (ensure only 1 image)
                const imagePath = scannedImages[0];
                console.log("📸 [scanDocument] Image scanned:", imagePath);

                // Upload scanned image to temp-upload
                try {
                    // Extract filename from path (same pattern as other uploads in codebase)
                    const filename = imagePath.split("/").pop() || `scanned-document-${Date.now()}.jpg`;
                    const match = /\.(\w+)$/.exec(filename);
                    const type = match ? `image/${match[1]}` : "image/jpeg";

                    const file = {
                        uri: imagePath, // Use imagePath directly (DocumentScanner returns proper URI format)
                        type: type,
                        name: filename,
                    } as any;

                    console.log("📤 [scanDocument] Uploading to temp-upload...", { uri: imagePath, type, name: filename });
                    uploadScannedImage(file);
                } catch (uploadError) {
                    console.error("❌ [scanDocument] Upload error:", uploadError);
                    Alert.alert("Error", "Failed to upload scanned image");
                }

                // Optional: OCR processing (can be done in background)
                try {
                    const path = imagePath.replace("file://", "");
                    const lines = await TextRecognition.recognize(path);
                    const fullText = Array.isArray(lines) ? lines.join("\n") : String(lines ?? "");
                    console.log("📝 [scanDocument] OCR Text:", fullText);
                    // Parse the extracted data (optional, for future use)
                    const parsed = parseUSIDCardData(fullText, imagePath);
                    console.log("📋 [scanDocument] Parsed ID Card Data:", parsed);
                } catch (ocrError) {
                    console.warn("⚠️ [scanDocument] OCR failed (non-critical):", ocrError);
                    // OCR failure is not critical, continue with upload
                }
            } else {
                console.warn("⚠️ [scanDocument] No images scanned");
            }
        } catch (error) {
            console.error("❌ [scanDocument] Scan failed:", error);
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
                                {patientAge !== null && (
                                    <BaseText type="Body" weight={600} color="labels.primary">
                                        {" "}
                                        ({patientAge}y)
                                    </BaseText>
                                )}
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
                                            doctorColor: patient?.data?.doctor?.color || "",
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
                                        <BaseButton ButtonStyle="Tinted" noText leftIcon={<IconSymbol name="message.fill" color={colors.system.blue} size={16} />} style={{ width: 30, height: 30 }} onPress={() => handleMessage()} />
                                        <BaseButton ButtonStyle="Tinted" noText leftIcon={<IconSymbol name="phone.fill" color={colors.system.blue} size={16} />} style={{ width: 30, height: 30 }} onPress={() => handleCall()} />
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
            <View style={{ flex: 1, minHeight: (screenHeight - 150) / 2, backgroundColor: colors.system.white }}>
                {activeTab === 0 && (
                    <GalleryWithMenu
                        menuItems={[
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
                                icon: "slider.horizontal.3",
                                label: "Adjustment",
                                onPress: (imageUri) => {
                                    router.push({
                                        pathname: "/(fullmodals)/image-editor",
                                        params: { uri: imageUri, initialTool: "Adjust" },
                                    });
                                },
                            },
                            {
                                icon: "square.and.arrow.up",
                                label: "Share",
                                role: "default",
                                onPress: async (imageUri: string) => {
                                    try {
                                        const patientName = `${patient?.data?.first_name || ""} ${patient?.data?.last_name || ""}`.trim();
                                        const message = `Patient photo${patientName ? ` - ${patientName}` : ""}\n\nImage link: ${imageUri}`;

                                        // Share with both image and message containing the link
                                        // The message includes the link so users can copy it
                                        await Share.share({
                                            message: message,
                                            url: imageUri,
                                        });
                                    } catch (error: any) {
                                        console.error("Error sharing image:", error);
                                        // If user cancels, don't show error
                                        if (error?.message !== "User did not share") {
                                            Alert.alert("Error", "Failed to share image");
                                        }
                                    }
                                },
                            },
                            {
                                icon: "archivebox",
                                label: "Archive Image",
                                role: "destructive",
                                onPress: handleArchiveImage,
                            },
                        ]}
                        patientData={patient?.data}
                        sections={groupedPatientImages}
                    />
                )}
                {activeTab === 1 && <ConsentTabContent patientId={id} />}
                {activeTab === 2 && <IDTabContent documents={documentsData?.data || []} isLoading={isLoadingDocuments} />}
                {activeTab === 3 && <ActivitiesTabContent activities={activitiesData?.data || []} isLoading={isLoadingActivities} />}
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
                contentContainerStyle={{}}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
            />
        </View>
    );
}
