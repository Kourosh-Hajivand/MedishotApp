import { BaseButton, BaseText, ErrorState, PatientDetailSkeleton } from "@/components";
import { GalleryWithMenu } from "@/components/Image/GalleryWithMenu";
import { ImageEditorModal } from "@/components/ImageEditor";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { spacing } from "@/styles/spaces";
import colors from "@/theme/colors";
import { parseUSIDCardData } from "@/utils/helper/HelperFunction";
import { getRelativeTime } from "@/utils/helper/dateUtils";
import { e164ToDisplay } from "@/utils/helper/phoneUtils";
import { useCreatePatientDocument, useGetPatientActivities, useGetPatientById, useGetPatientDocuments, useTempUpload } from "@/utils/hook";
import { useDeletePatientMedia, useGetPatientMedia } from "@/utils/hook/useMedia";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { PatientMedia, PatientMediaImage, PatientMediaWithTemplate } from "@/utils/service/models/ResponseModels";
import { useHeaderHeight } from "@react-navigation/elements";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Dimensions, Linking, ScrollView, Share, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TextRecognition from "react-native-text-recognition";
import { ActivitiesTabContent } from "./_components/ActivitiesTabContent";
import { ConsentTabContent } from "./_components/ConsentTabContent";
import { IDTabContent } from "./_components/IDTabContent";
import { blurValue } from "./_layout";
// Conditional import for DocumentScanner (optional native module)
let DocumentScanner: any = null;
try {
    DocumentScanner = require("react-native-document-scanner-plugin").default;
} catch {
    // DocumentScanner module not available - handled gracefully
}

type RowKind = "header" | "tabs" | "content";

export default function PatientDetailsScreen() {
    const { id, action, phoneIndex } = useLocalSearchParams<{ id: string; action?: string; phoneIndex?: string }>();
    const navigation = useNavigation();
    const { selectedPractice } = useProfileStore();
    const { data: patient, isLoading, error: patientError, isError: isPatientError, refetch: refetchPatient } = useGetPatientById(id);
    const { data: patientMediaData, isLoading: isLoadingMedia, error: patientMediaError, isError: isPatientMediaError, refetch: refetchPatientMedia } = useGetPatientMedia(id, !!id);
    const { data: activitiesData, isLoading: isLoadingActivities, error: activitiesError, isError: isActivitiesError, refetch: refetchActivities } = useGetPatientActivities(selectedPractice?.id, id, !!id && !!selectedPractice?.id);
    const { data: documentsData, isLoading: isLoadingDocuments, error: documentsError, isError: isDocumentsError, refetch: refetchDocuments } = useGetPatientDocuments(selectedPractice?.id, id, !!id && !!selectedPractice?.id);
    const headerHeight = useHeaderHeight();
    const safe = useSafeAreaInsets();

    // Temp upload for scanned documents
    const { mutate: uploadScannedImage, isPending: isUploadingScannedImage } = useTempUpload(
        (response) => {
            const responseAny = response as { data?: { filename?: string }; filename?: string };
            const filename = (responseAny?.data?.filename ?? responseAny.filename) || null;
            if (filename) {
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
            Alert.alert("Error", "Failed to upload scanned image");
        },
    );

    // Create document mutation
    const { mutate: createDocument } = useCreatePatientDocument(
        selectedPractice?.id,
        id,
        () => {
            Alert.alert("Success", "ID document uploaded successfully!");
        },
        (error) => {
            Alert.alert("Error", error.message || "Failed to create document");
        },
    );

    const tabs = ["Media", "Consent", "ID", "Activities"];
    const [activeTab, setActiveTab] = useState(0);
    const [imageEditorVisible, setImageEditorVisible] = useState(false);
    const [imageEditorUri, setImageEditorUri] = useState<string | undefined>();
    const [imageEditorTool, setImageEditorTool] = useState<string | undefined>();

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

        patientMediaData.data.forEach((media: PatientMedia | PatientMediaWithTemplate) => {
            const mediaId = media.id; // patient_media_id

            // Type guard: check if it's PatientMediaWithTemplate
            const isTemplateMedia = 'template' in media && 'images' in media;
            
            if (isTemplateMedia && media.template && Array.isArray(media.images)) {
                // PatientMediaWithTemplate: extract images from template.images array
                media.images.forEach((img: PatientMediaImage) => {
                    const imageUrl = typeof img.image === 'string' ? img.image : null;
                    if (imageUrl) {
                        map.set(imageUrl, mediaId);
                    }
                });
            } else if (!isTemplateMedia) {
                // PatientMedia: use original_media or media
                const patientMedia = media as PatientMedia;
                if (patientMedia.original_media?.url) {
                    map.set(patientMedia.original_media.url, mediaId);
                } else if (patientMedia.media?.url) {
                    map.set(patientMedia.media.url, mediaId);
                }
            }
        });

        return map;
    }, [patientMediaData?.data]);

    // Create a map from image URL to bookmark status
    const imageUrlToBookmarkMap = useMemo(() => {
        const map = new Map<string, boolean>();
        if (!patientMediaData?.data || !Array.isArray(patientMediaData.data)) return map;

        patientMediaData.data.forEach((media: PatientMedia | PatientMediaWithTemplate) => {
            // Type guard: check if it's PatientMediaWithTemplate
            const isTemplateMedia = 'template' in media && 'images' in media;
            const isBookmarked = !isTemplateMedia ? (media as PatientMedia).is_bookmarked ?? false : false;

            if (isTemplateMedia && media.template && Array.isArray(media.images)) {
                // PatientMediaWithTemplate: extract images from template.images array
                media.images.forEach((img: PatientMediaImage) => {
                    const imageUrl = typeof img.image === 'string' ? img.image : null;
                    if (imageUrl) {
                        map.set(imageUrl, isBookmarked);
                    }
                });
            } else if (!isTemplateMedia) {
                // PatientMedia: use original_media or media
                const patientMedia = media as PatientMedia;
                if (patientMedia.original_media?.url) {
                    map.set(patientMedia.original_media.url, isBookmarked);
                } else if (patientMedia.media?.url) {
                    map.set(patientMedia.media.url, isBookmarked);
                }
            }
        });

        return map;
    }, [patientMediaData?.data]);

    // Extract and group images by date from patient media
    const groupedPatientImages = useMemo(() => {
        if (!patientMediaData?.data || !Array.isArray(patientMediaData.data)) {
            return [];
        }

        // Map to store images grouped by date with timestamps for sorting
        const imagesByDate = new Map<string, Array<{ url: string; timestamp: number }>>();

        patientMediaData.data.forEach((media: PatientMedia | PatientMediaWithTemplate) => {
            // Get the date from created_at
            const createdAt = media.created_at;
            if (!createdAt) return;

            // Format date as "MMMM D, YYYY" (e.g., "January 2, 2026")
            const date = new Date(createdAt);
            const dateKey = date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
            const timestamp = date.getTime();

            // Initialize array for this date if it doesn't exist
            if (!imagesByDate.has(dateKey)) {
                imagesByDate.set(dateKey, []);
            }

            const dateImages = imagesByDate.get(dateKey)!;

            // Type guard: check if it's PatientMediaWithTemplate
            if ('template' in media && 'images' in media && media.template && Array.isArray(media.images)) {
                // PatientMediaWithTemplate: extract images from template.images array
                const templateMedia = media as PatientMediaWithTemplate;
                templateMedia.images.forEach((img: PatientMediaImage) => {
                    const imageUrl = typeof img.image === 'string' ? img.image : null;
                    if (imageUrl) {
                        const imgTimestamp = img.created_at ? new Date(img.created_at).getTime() : timestamp;
                        dateImages.push({ url: imageUrl, timestamp: imgTimestamp });
                    }
                });
            } else {
                // PatientMedia: use original_media or media
                const patientMedia = media as PatientMedia;
                if (patientMedia.original_media?.url) {
                    dateImages.push({ url: patientMedia.original_media.url, timestamp });
                } else if (patientMedia.media?.url) {
                    dateImages.push({ url: patientMedia.media.url, timestamp });
                }
            }
        });

        // Convert Map to array of sections, sorted by date (newest first)
        // Also sort images within each section by timestamp (newest first)
        const sections = Array.from(imagesByDate.entries())
            .map(([date, imageItems]) => {
                // Sort images within section by timestamp (newest first)
                const sortedImages = [...imageItems]
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .map((item) => item.url);
                return {
                    title: date,
                    data: sortedImages,
                    timestamp: imageItems[0]?.timestamp || 0, // Use first image timestamp for section sorting
                };
            })
            .sort((a, b) => {
                // Sort sections by timestamp (newest first)
                return b.timestamp - a.timestamp;
            })
            .map(({ title, data }) => ({ title, data })); // Remove timestamp from final result

        return sections;
    }, [patientMediaData?.data]);


    // Archive media mutation
    const { mutate: archiveMedia, isPending: isArchiving } = useDeletePatientMedia(
        () => {
            Alert.alert("Success", "Image archived successfully");
        },
        (error) => {
            Alert.alert("Error", error.message || "Failed to archive image");
        },
    );

    const handleArchiveImage = useCallback((imageUri: string) => {
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
    }, [imageUrlToMediaIdMap, id, archiveMedia]);

    const screenWidth = Dimensions.get("window").width;
    const screenHeight = Dimensions.get("window").height;
    const tabWidth = useMemo(() => (screenWidth - 32) / tabs.length, [screenWidth]);
    const translateX = useRef(new Animated.Value(0)).current;

    const handleTabPress = useCallback((index: number) => {
        setActiveTab(index);
        Animated.spring(translateX, { toValue: index * tabWidth, useNativeDriver: true, speed: 20 }).start();
    }, [tabWidth, translateX]);

    const handleCall = useCallback(async (index?: number) => {
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
    }, [patient?.data?.numbers]);

    const handleMessage = useCallback(async (index?: number) => {
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
    }, [patient?.data?.numbers]);

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
        if (!DocumentScanner) {
            Alert.alert("Error", "Document scanner is not available on this device");
            return;
        }
        try {
            const { scannedImages } = await DocumentScanner.scanDocument({
                maxNumDocuments: 1,
            });

            if (scannedImages && scannedImages.length > 0) {
                // Only take the first image (ensure only 1 image)
                const imagePath = scannedImages[0];

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
                    } as { uri: string; type: string; name: string };

                    uploadScannedImage(file);
                } catch (uploadError) {
                    Alert.alert("Error", "Failed to upload scanned image");
                }

                // Optional: OCR processing (can be done in background)
                try {
                    const path = imagePath.replace("file://", "");
                    const lines = await TextRecognition.recognize(path);
                    const fullText = Array.isArray(lines) ? lines.join("\n") : String(lines ?? "");
                    // Parse the extracted data (optional, for future use)
                    parseUSIDCardData(fullText, imagePath);
                } catch {
                    // OCR failure is not critical, continue with upload
                }
            }
        } catch (error) {
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

    const handleSnapScroll = useCallback((event: { nativeEvent: { contentOffset: { y: number } } }) => {
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
    }, [scrollY, scrollStart, SNAP_THRESHOLD, animationEnd]);
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

    // Show error state if there's an error with patient data
    if (isPatientError) {
        const errorMessage = (patientError as any)?.message || "Failed to load patient data. Please try again.";
        return (
            <View style={{ flex: 1, backgroundColor: colors.system.gray6 }}>
                <ScrollView 
                    style={{ flex: 1 }}
                    contentContainerStyle={{ 
                        paddingTop: headerHeight,
                        paddingBottom: safe.bottom + spacing["4"] 
                    }}
                    showsVerticalScrollIndicator={false}
                >
                    <ErrorState message={errorMessage} onRetry={refetchPatient} title="Failed to load patient" />
                </ScrollView>
            </View>
        );
    }

    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.system.gray6 }}>
                <ScrollView 
                    style={{ flex: 1 }}
                    contentContainerStyle={{ 
                        paddingTop: headerHeight,
                        paddingBottom: safe.bottom + spacing["4"] 
                    }}
                    showsVerticalScrollIndicator={false}
                >
                    <PatientDetailSkeleton />
                </ScrollView>
            </View>
        );
    }


    const DATA: { key: RowKind }[] = useMemo(() => [{ key: "header" }, { key: "tabs" }, { key: "content" }], []);
    const renderRow = useCallback(({ item }: { item: { key: RowKind } }) => {
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
                                            {e164ToDisplay(patient?.data?.numbers?.[0]?.value) || patient?.data?.numbers?.[0]?.value}
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

                        <TouchableOpacity
                            className="bg-white py-2 px-4 rounded-xl"
                            onPress={() => {
                                router.push({
                                    pathname: "/(modals)/patient-details",
                                    params: { id },
                                });
                            }}
                        >
                            <View className="flex-row items-center justify-between">
                                <BaseText type="Body" color="labels.primary">
                                    Patient Details
                                </BaseText>
                                <IconSymbol name="chevron.right" color={colors.system.gray} size={16} />
                            </View>
                        </TouchableOpacity>
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
                    isPatientMediaError ? (
                        <ErrorState 
                            message={patientMediaError instanceof Error ? patientMediaError.message : (patientMediaError as { message?: string })?.message || "Failed to load media"} 
                            onRetry={refetchPatientMedia} 
                            title="Failed to load media"
                        />
                    ) : (
                    <GalleryWithMenu
                        menuItems={[
                            {
                                icon: "sparkles",
                                label: "Use Magic",

                                onPress: (imageUri) => {
                                    setImageEditorUri(imageUri);
                                    setImageEditorTool("Magic");
                                    setImageEditorVisible(true);
                                },
                            },
                            {
                                icon: "slider.horizontal.3",
                                label: "Adjustment",
                                onPress: (imageUri) => {
                                    setImageEditorUri(imageUri);
                                    setImageEditorTool("Adjust");
                                    setImageEditorVisible(true);
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
                                    } catch (error: unknown) {
                                        // If user cancels, don't show error
                                        const errorMessage = error instanceof Error ? error.message : (error as { message?: string })?.message;
                                        if (errorMessage !== "User did not share") {
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
                        actions={{
                            showBookmark: true,
                            showEdit: true,
                            showArchive: true,
                            showShare: true,
                        }}
                        sections={groupedPatientImages}
                        imageUrlToMediaIdMap={imageUrlToMediaIdMap}
                        imageUrlToBookmarkMap={imageUrlToBookmarkMap}
                        patientId={id}
                        rawMediaData={patientMediaData?.data}
                    />
                    )
                )}
                {activeTab === 0 && (
                    <View style={{ paddingHorizontal: spacing[4], paddingVertical: spacing[8], paddingBottom: safe.bottom + spacing[4] }}>
                        <TouchableOpacity
                            className="bg-system-gray6 py-3 px-4 rounded-xl flex-row items-center justify-between"
                            onPress={() => {
                                router.push(`/patients/${id}/archive`);
                            }}
                        >
                            <View className="flex-row items-center gap-2">
                                <IconSymbol name="tray" color={colors.system.gray2} size={24} />
                                <BaseText type="Body" color="labels.primary">
                                    Archived Photos
                                </BaseText>
                            </View>
                            <IconSymbol name="chevron.right" color={colors.system.gray2} size={16} />
                        </TouchableOpacity>
                    </View>
                )}
                {activeTab === 1 && <ConsentTabContent patientId={id} />}
                {activeTab === 2 && <IDTabContent documents={documentsData?.data || []} isLoading={isLoadingDocuments} error={documentsError} isError={isDocumentsError} onRetry={refetchDocuments} />}
                {activeTab === 3 && <ActivitiesTabContent activities={activitiesData?.data || []} isLoading={isLoadingActivities} error={activitiesError} isError={isActivitiesError} onRetry={refetchActivities} />}
            </View>
        );
    }, [activeTab, patient, patientAge, id, headerHeight, safe, tabs, tabWidth, translateX, handleTabPress, handleCall, handleMessage, scanDocument, groupedPatientImages, imageUrlToMediaIdMap, imageUrlToBookmarkMap, patientMediaData?.data, isPatientMediaError, patientMediaError, refetchPatientMedia, documentsData?.data, isLoadingDocuments, documentsError, isDocumentsError, refetchDocuments, activitiesData?.data, isLoadingActivities, activitiesError, isActivitiesError, refetchActivities, screenHeight, handleArchiveImage]);

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
            <ImageEditorModal visible={imageEditorVisible} uri={imageEditorUri} initialTool={imageEditorTool} onClose={() => setImageEditorVisible(false)} />
        </View>
    );
}
