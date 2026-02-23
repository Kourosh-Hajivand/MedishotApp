import { BaseButton, BaseText, ErrorState, PatientDetailSkeleton } from "@/components";
import { GalleryWithMenu } from "@/components/Image/GalleryWithMenu";
import { EditorState, ImageEditorModal, parseEditorStateFromMediaData } from "@/components/ImageEditor";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { spacing } from "@/styles/spaces";
import colors from "@/theme/colors";
import { parseUSIDCardData } from "@/utils/helper/HelperFunction";
import { getRelativeTime } from "@/utils/helper/dateUtils";
import { e164ToDisplay } from "@/utils/helper/phoneUtils";
import { useCreatePatientDocument, useGetPatientActivities, useGetPatientById, useGetPatientDocuments, useGetPracticeById } from "@/utils/hook";
import { useDeletePatientMedia, useGetPatientMedia, useGetTrashMedia, useTempUpload, useUploadPatientMedia } from "@/utils/hook/useMedia";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { PatientDocument, PatientMedia, PatientMediaImage, PatientMediaWithTemplate } from "@/utils/service/models/ResponseModels";
import { useHeaderHeight } from "@react-navigation/elements";
import { useFocusEffect } from "@react-navigation/native";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Dimensions, Linking, ScrollView, Share, TouchableOpacity, View } from "react-native";
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
    const { id, action, phoneIndex, tab } = useLocalSearchParams<{ id: string; action?: string; phoneIndex?: string; tab?: string }>();
    const navigation = useNavigation();
    const { selectedPractice } = useProfileStore();
    const { data: patient, isLoading, error: patientError, isError: isPatientError, refetch: refetchPatient } = useGetPatientById(id);
    const { data: patientMediaData, isLoading: isLoadingMedia, error: patientMediaError, isError: isPatientMediaError, refetch: refetchPatientMedia } = useGetPatientMedia(id, !!id);
    const { data: archivedData, refetch: refetchTrashMedia } = useGetTrashMedia(id || "", !!id);
    const { mutateAsync: tempUploadAsync } = useTempUpload();
    const { mutateAsync: uploadMediaAsync } = useUploadPatientMedia();
    const [isImportingFromGallery, setIsImportingFromGallery] = useState(false);
    const { data: activitiesData, isLoading: isLoadingActivities, error: activitiesError, isError: isActivitiesError, refetch: refetchActivities } = useGetPatientActivities(selectedPractice?.id, id, !!id && !!selectedPractice?.id);
    const { data: documentsData, isLoading: isLoadingDocuments, error: documentsError, isError: isDocumentsError, refetch: refetchDocuments } = useGetPatientDocuments(selectedPractice?.id, id, !!id && !!selectedPractice?.id);
    const { data: practiceData } = useGetPracticeById(selectedPractice?.id ?? 0, !!selectedPractice?.id);
    const headerHeight = useHeaderHeight();
    const safe = useSafeAreaInsets();

    const practice = practiceData?.data;
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

    const tabs = ["Media", "Consent", "ID", "Activities"];
    const [activeTab, setActiveTab] = useState(0);

    // Create document mutation – onSuccess: refetch documents and switch to ID tab so the new document is visible
    const { mutate: createDocument, isPending: isCreatingDocument } = useCreatePatientDocument(
        selectedPractice?.id,
        id,
        () => {
            refetchDocuments().then(() => {
                setActiveTab(2); // ID tab
            });
        },
        (error) => {
            Alert.alert("Error", error.message || "Failed to create document");
        },
    );

    // ID tab: show patient.id_card as first item, then documents list (avoid duplicate by id)
    const idTabDocuments = useMemo((): PatientDocument[] => {
        const docs = documentsData?.data ?? [];
        const idCard = patient?.data?.id_card;
        if (!idCard?.url) return docs;
        const idCardDoc: PatientDocument = {
            id: idCard.id,
            patient_id: Number(id) || 0,
            type: "id_card",
            image: idCard.url,
            created_at: patient?.data?.updated_at ?? "",
            updated_at: patient?.data?.updated_at ?? "",
        };
        const rest = docs.filter((d) => d.id !== idCard.id);
        return [idCardDoc, ...rest];
    }, [patient?.data?.id_card, patient?.data?.updated_at, patient?.data?.id, id, documentsData?.data]);

    // Switch to tab when `tab` param is provided (e.g. after signing a consent)
    useEffect(() => {
        if (tab) {
            const tabIndex = tabs.findIndex((t) => t.toLowerCase() === tab.toLowerCase());
            if (tabIndex >= 0 && tabIndex !== activeTab) {
                handleTabPress(tabIndex);
            }
        }
    }, [tab]);

    const [imageEditorVisible, setImageEditorVisible] = useState(false);
    const [imageEditorUri, setImageEditorUri] = useState<string | undefined>();
    const [imageEditorTool, setImageEditorTool] = useState<string | undefined>();
    const [imageRefreshKey, setImageRefreshKey] = useState(0);
    const [imageSavedUri, setImageSavedUri] = useState<string | null>(null);

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

            // Type guard: check if it's PatientMediaWithTemplate (template must be truthy, not just exist)
            const isTemplateMedia = "template" in media && "images" in media && media.template !== null && media.template !== undefined;

            if (isTemplateMedia && Array.isArray(media.images)) {
                const templateMedia = media as PatientMediaWithTemplate;
                const editedComposite = (templateMedia as { edited_media?: { url?: string } }).edited_media?.url;
                if (templateMedia.original_media?.url) {
                    map.set(templateMedia.original_media.url, mediaId);
                    if (editedComposite) map.set(editedComposite, mediaId);
                }
                if (Array.isArray(templateMedia.images)) {
                    templateMedia.images.forEach((imageItem: any) => {
                        if (imageItem.image?.url) map.set(imageItem.image.url, mediaId);
                        if (imageItem.edited_image?.url) map.set(imageItem.edited_image.url, mediaId);
                    });
                }
            } else {
                const patientMedia = media as PatientMedia;
                if (patientMedia.original_media?.url) map.set(patientMedia.original_media.url, mediaId);
                if (patientMedia.edited_media?.url) map.set(patientMedia.edited_media.url, mediaId);
                if (patientMedia.media?.url) map.set(patientMedia.media.url, mediaId);
            }
        });

        return map;
    }, [patientMediaData?.data]);

    // Map image URL -> editor state (per-image data for template, media.data for non-template) for opening editor
    const imageUrlToEditorStateMap = useMemo(() => {
        const map = new Map<string, EditorState>();
        if (!patientMediaData?.data || !Array.isArray(patientMediaData.data)) return map;

        patientMediaData.data.forEach((media: PatientMedia | PatientMediaWithTemplate) => {
            const isTemplateMedia = "template" in media && "images" in media && media.template != null;

            if (isTemplateMedia && Array.isArray(media.images)) {
                const templateMedia = media as PatientMediaWithTemplate;
                const mediaEditorState = parseEditorStateFromMediaData((media as { data?: unknown }).data);
                if (templateMedia.original_media?.url) {
                    if (mediaEditorState) map.set(templateMedia.original_media.url, mediaEditorState);
                    const editedComposite = (templateMedia as { edited_media?: { url?: string } }).edited_media?.url;
                    if (editedComposite && mediaEditorState) map.set(editedComposite, mediaEditorState);
                }
                templateMedia.images?.forEach((imageItem: PatientMediaImage) => {
                    const imageUrl = typeof imageItem.image === "string" ? imageItem.image : imageItem.image?.url;
                    const editedUrl = typeof imageItem.edited_image === "string" ? imageItem.edited_image : imageItem.edited_image?.url;
                    const itemState = parseEditorStateFromMediaData((imageItem as { data?: unknown }).data);
                    if (itemState) {
                        if (imageUrl) map.set(imageUrl, itemState);
                        if (editedUrl) map.set(editedUrl, itemState);
                    }
                });
            } else {
                const patientMedia = media as PatientMedia;
                const editorState = parseEditorStateFromMediaData((media as { data?: unknown }).data);
                if (!editorState) return;
                if (patientMedia.original_media?.url) map.set(patientMedia.original_media.url, editorState);
                if (patientMedia.edited_media?.url) map.set(patientMedia.edited_media.url, editorState);
                if (patientMedia.media?.url) map.set(patientMedia.media.url, editorState);
            }
        });

        return map;
    }, [patientMediaData?.data]);

    // Map image URL -> original (unedited) image URL for Revert in editor
    const imageUrlToOriginalUriMap = useMemo(() => {
        const map = new Map<string, string>();
        if (!patientMediaData?.data || !Array.isArray(patientMediaData.data)) return map;

        patientMediaData.data.forEach((media: PatientMedia | PatientMediaWithTemplate) => {
            const isTemplateMedia = "template" in media && "images" in media && media.template != null;
            const baseOriginal = (media as PatientMedia).original_media?.url ?? (media as PatientMedia).media?.url;

            if (isTemplateMedia && Array.isArray(media.images)) {
                const templateMedia = media as PatientMediaWithTemplate;
                const orig = templateMedia.original_media?.url;
                if (orig) map.set(orig, orig);
                if ((templateMedia as { edited_media?: { url?: string } }).edited_media?.url && orig) map.set((templateMedia as { edited_media: { url: string } }).edited_media.url, orig);
                // هر سلول تمپلیت: اورجینال = همان image آن سلول (قبل از ادیت)، نه کامپوزیت
                templateMedia.images?.forEach((imageItem: PatientMediaImage) => {
                    const imageUrl = typeof imageItem.image === "string" ? imageItem.image : imageItem.image?.url;
                    const editedUrl = typeof imageItem.edited_image === "string" ? imageItem.edited_image : imageItem.edited_image?.url;
                    if (imageUrl) map.set(imageUrl, imageUrl);
                    if (editedUrl) map.set(editedUrl, imageUrl ?? editedUrl);
                });
            } else {
                const patientMedia = media as PatientMedia;
                if (patientMedia.original_media?.url) map.set(patientMedia.original_media.url, patientMedia.original_media.url);
                if (patientMedia.edited_media?.url && baseOriginal) map.set(patientMedia.edited_media.url, baseOriginal);
                if (patientMedia.media?.url) map.set(patientMedia.media.url, baseOriginal ?? patientMedia.media.url);
            }
        });

        return map;
    }, [patientMediaData?.data]);

    // Create a map from image URL to mediaImageId (for template images)
    const imageUrlToMediaImageIdMap = useMemo(() => {
        const map = new Map<string, number>();
        if (!patientMediaData?.data || !Array.isArray(patientMediaData.data)) return map;

        patientMediaData.data.forEach((media: PatientMedia | PatientMediaWithTemplate) => {
            // Type guard: check if it's PatientMediaWithTemplate
            const isTemplateMedia = "template" in media && "images" in media && media.template !== null && media.template !== undefined;

            if (isTemplateMedia && Array.isArray(media.images)) {
                const templateMedia = media as PatientMediaWithTemplate;
                // Map each template image URL to its mediaImageId (PatientMediaImage.id)
                templateMedia.images?.forEach((imageItem: PatientMediaImage) => {
                    const imageUrl = typeof imageItem.image === "string" ? imageItem.image : imageItem.image?.url;
                    if (imageUrl && imageItem.id) {
                        map.set(imageUrl, imageItem.id);
                    }
                    // Also map edited_image URL if exists
                    const editedUrl = typeof imageItem.edited_image === "string" ? imageItem.edited_image : imageItem.edited_image?.url;
                    if (editedUrl && imageItem.id) {
                        map.set(editedUrl, imageItem.id);
                    }
                });
            }
        });

        return map;
    }, [patientMediaData?.data]);

    // Create a map from image URL to hasTemplate flag
    const imageUrlToHasTemplateMap = useMemo(() => {
        const map = new Map<string, boolean>();
        if (!patientMediaData?.data || !Array.isArray(patientMediaData.data)) return map;

        patientMediaData.data.forEach((media: PatientMedia | PatientMediaWithTemplate) => {
            const isTemplateMedia = "template" in media && "images" in media && media.template !== null && media.template !== undefined;

            if (isTemplateMedia && Array.isArray(media.images)) {
                const templateMedia = media as PatientMediaWithTemplate;
                // Mark original_media as template (but it uses editMedia, not updateMediaImage)
                if (templateMedia.original_media?.url) {
                    map.set(templateMedia.original_media.url, false); // original_media uses editMedia
                }
                // Mark all template images as having template
                templateMedia.images?.forEach((imageItem: PatientMediaImage) => {
                    const imageUrl = typeof imageItem.image === "string" ? imageItem.image : imageItem.image?.url;
                    if (imageUrl) {
                        map.set(imageUrl, true); // template images use updateMediaImage
                    }
                    const editedUrl = typeof imageItem.edited_image === "string" ? imageItem.edited_image : imageItem.edited_image?.url;
                    if (editedUrl) {
                        map.set(editedUrl, true);
                    }
                });
            } else {
                // Non-template media
                const patientMedia = media as PatientMedia;
                if (patientMedia.original_media?.url) {
                    map.set(patientMedia.original_media.url, false);
                }
                if (patientMedia.edited_media?.url) {
                    map.set(patientMedia.edited_media.url, false);
                }
                if (patientMedia.media?.url) {
                    map.set(patientMedia.media.url, false);
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
            // Type guard: check if it's PatientMediaWithTemplate (template must be truthy, not just exist)
            const isTemplateMedia = "template" in media && "images" in media && media.template !== null && media.template !== undefined;
            const isBookmarked = (media as any).is_bookmarked ?? false;

            if (isTemplateMedia && Array.isArray(media.images)) {
                // PatientMediaWithTemplate: add original_media to bookmark map if exists, otherwise add all images
                const templateMedia = media as PatientMediaWithTemplate;
                if (templateMedia.original_media?.url) {
                    map.set(templateMedia.original_media.url, isBookmarked);
                } else if (Array.isArray(templateMedia.images)) {
                    templateMedia.images.forEach((imageItem: any) => {
                        if (imageItem.image?.url) map.set(imageItem.image.url, isBookmarked);
                        if (imageItem.edited_image?.url) map.set(imageItem.edited_image.url, isBookmarked);
                    });
                }
                const editedComposite = (templateMedia as { edited_media?: { url?: string } }).edited_media?.url;
                if (editedComposite) map.set(editedComposite, isBookmarked);
            } else {
                const patientMedia = media as PatientMedia;
                if (patientMedia.original_media?.url) map.set(patientMedia.original_media.url, isBookmarked);
                if (patientMedia.edited_media?.url) map.set(patientMedia.edited_media.url, isBookmarked);
                if (patientMedia.media?.url) map.set(patientMedia.media.url, isBookmarked);
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

            // Type guard: check if it's PatientMediaWithTemplate (template must be truthy, not just exist)
            const isTemplateMedia = "template" in media && "images" in media && media.template !== null && media.template !== undefined;

            if (isTemplateMedia && Array.isArray(media.images)) {
                // PatientMediaWithTemplate: show composite (edited_media ?? original_media) or individual images with edited_image priority
                const templateMedia = media as PatientMediaWithTemplate;
                const editedComposite = (templateMedia as { edited_media?: { url?: string } }).edited_media?.url;
                if (templateMedia.original_media?.url) {
                    dateImages.push({ url: editedComposite ?? templateMedia.original_media.url, timestamp });
                } else if (Array.isArray(templateMedia.images)) {
                    templateMedia.images.forEach((imageItem: any) => {
                        const displayUrl = imageItem.edited_image?.url ?? imageItem.image?.url;
                        if (displayUrl) {
                            const imgTimestamp = imageItem.created_at ? new Date(imageItem.created_at).getTime() : timestamp;
                            dateImages.push({ url: displayUrl, timestamp: imgTimestamp });
                        }
                    });
                }
            } else {
                // PatientMedia: edited_media ?? original_media ?? media
                const patientMedia = media as PatientMedia;
                const displayUrl = patientMedia.edited_media?.url ?? patientMedia.original_media?.url ?? patientMedia.media?.url;
                if (displayUrl) {
                    dateImages.push({ url: displayUrl, timestamp });
                }
            }
        });

        // Convert Map to array of sections, sorted by date (newest first)
        // Also sort images within each section by timestamp (newest first)
        const sections = Array.from(imagesByDate.entries())
            .map(([date, imageItems]) => {
                // Sort images within section by timestamp (newest first), filter out empty URLs
                const sortedImages = [...imageItems]
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .map((item) => item.url)
                    .filter((url): url is string => !!url);
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
            refetchPatientMedia();
            refetchTrashMedia();
        },
        (error) => {
            Alert.alert("Error", error.message || "Failed to archive image");
        },
    );

    const handleArchiveImage = useCallback(
        (imageUri: string) => {
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
        },
        [imageUrlToMediaIdMap, id, archiveMedia],
    );

    const screenWidth = Dimensions.get("window").width;
    const screenHeight = Dimensions.get("window").height;
    const tabWidth = useMemo(() => (screenWidth - 32) / tabs.length, [screenWidth]);
    const translateX = useRef(new Animated.Value(0)).current;

    const handleTabPress = useCallback(
        (index: number) => {
            setActiveTab(index);
            Animated.spring(translateX, { toValue: index * tabWidth, useNativeDriver: true, speed: 20 }).start();
        },
        [tabWidth, translateX],
    );

    const handleCall = useCallback(
        async (index?: number) => {
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
        },
        [patient?.data?.numbers],
    );

    const handleMessage = useCallback(
        async (index?: number) => {
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
        },
        [patient?.data?.numbers],
    );

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
                const imagePath = scannedImages[0];
                if (__DEV__) {
                    console.log("[scanDocument] imagePath:", imagePath);
                }

                const filename = imagePath.split("/").pop() || `scanned-document-${Date.now()}.jpg`;
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : "image/jpeg";

                const file = {
                    uri: imagePath,
                    type,
                    name: filename,
                } as { uri: string; type: string; name: string };

                if (__DEV__) {
                    console.log("[scanDocument] file for createDocument:", { name: file.name, type: file.type, uriLength: file.uri?.length });
                }

                createDocument({
                    type: "id_card",
                    description: "Scanned ID Document",
                    image: file,
                });

                try {
                    const path = imagePath.replace("file://", "");
                    const lines = await TextRecognition.recognize(path);
                    const fullText = Array.isArray(lines) ? lines.join("\n") : String(lines ?? "");
                    parseUSIDCardData(fullText, imagePath);
                } catch {
                    // OCR failure is not critical
                }
            }
        } catch (error) {
            if (__DEV__) {
                console.log("[scanDocument] error:", error);
            }
            Alert.alert("Error", "Failed to scan document. Please try again.");
        }
    };

    // Scroll animation / blur
    const scrollY = useRef(new Animated.Value(-headerHeight)).current;
    // const HEADER_DISTANCE = 30;

    const HEADER_DISTANCE = 60;
    const scrollStart = -headerHeight + 60;
    const animationStart = scrollStart;
    const animationEnd = scrollStart + HEADER_DISTANCE;

    const avatarScale = useMemo(
        () =>
            scrollY.interpolate({
                inputRange: [animationStart, animationEnd],
                outputRange: [1, 0.7],
                extrapolate: "clamp",
            }),
        [scrollY, animationStart, animationEnd],
    );
    const avatarTranslateY = useMemo(
        () =>
            scrollY.interpolate({
                inputRange: [animationStart, animationEnd],
                outputRange: [0, -35],
                extrapolate: "clamp",
            }),
        [scrollY, animationStart, animationEnd],
    );
    const avatarOpacity = useMemo(
        () =>
            scrollY.interpolate({
                inputRange: [animationStart, animationStart + HEADER_DISTANCE * 0.8, animationEnd],
                outputRange: [1, 0.5, 0.2],
                extrapolate: "clamp",
            }),
        [scrollY, animationStart, animationEnd, HEADER_DISTANCE],
    );
    const nameOpacity = useMemo(
        () =>
            scrollY.interpolate({
                inputRange: [animationStart, animationStart + HEADER_DISTANCE * 0.7, animationEnd],
                outputRange: [1, 0.5, 0],
                extrapolate: "clamp",
            }),
        [scrollY, animationStart, animationEnd, HEADER_DISTANCE],
    );

    const avatarAnimatedStyle = useMemo(
        () => ({
            transform: [{ translateY: avatarTranslateY }, { scale: avatarScale }],
            opacity: avatarOpacity,
            alignItems: "center" as const,
        }),
        [avatarTranslateY, avatarScale, avatarOpacity],
    );
    const nameAnimatedStyle = useMemo(
        () => ({
            opacity: nameOpacity,
            alignItems: "center" as const,
            marginTop: 10,
        }),
        [nameOpacity],
    );

    const SNAP_THRESHOLD = scrollStart + 50;

    const handleSnapScroll = useCallback(
        (event: { nativeEvent: { contentOffset: { y: number } } }) => {
            const y = event.nativeEvent.contentOffset.y;

            if (y > scrollStart && y < SNAP_THRESHOLD) {
                Animated.spring(scrollY, {
                    toValue: scrollStart,
                    useNativeDriver: true,
                    speed: 8,
                    bounciness: 0,
                }).start();
            } else if (y >= SNAP_THRESHOLD && y < animationEnd) {
                Animated.spring(scrollY, {
                    toValue: animationEnd,
                    useNativeDriver: true,
                    speed: 8,
                    bounciness: 0,
                }).start();
            }
        },
        [scrollY, scrollStart, SNAP_THRESHOLD, animationEnd],
    );
    useEffect(() => {
        const sub = scrollY.addListener(({ value }) => blurValue.setValue(value));
        return () => scrollY.removeListener(sub);
    }, [scrollY]);

    useEffect(() => {
        if (!patient?.data) return;
        const sub = scrollY.addListener(({ value }) => {
            navigation.setOptions({ headerTitle: value > animationEnd ? `${patient?.data?.first_name} ${patient?.data?.last_name}` : "" });
        });
        return () => scrollY.removeListener(sub);
    }, [navigation, patient?.data, animationEnd]);

    // Import from gallery (hidden: long-press on Take photo) – each image uploaded as single media like review without template
    const handleImportFromGallery = useCallback(async () => {
        if (!id) return;
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission Required", "Gallery permission is required to import photos.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.9,
            selectionLimit: 10,
        });
        if (result.canceled || !result.assets?.length) return;

        setIsImportingFromGallery(true);
        let successCount = 0;
        let failCount = 0;

        const allowedExt = /\.(jpe?g|png|pdf)$/i;
        for (let i = 0; i < result.assets.length; i++) {
            const asset = result.assets[i];
            try {
                const mime = asset.mimeType ?? "image/jpeg";
                const isPdf = /application\/pdf/i.test(mime);
                let uriToUpload = asset.uri;
                let uploadName = (asset.fileName ?? `image-${i + 1}`).replace(/\.[^.]+$/, "") || `image-${i + 1}`;
                let uploadType: string;

                if (isPdf) {
                    uploadName = uploadName + ".pdf";
                    uploadType = "application/pdf";
                } else {
                    // Convert any image (HEIC, PNG, etc.) to JPEG so server accepts it
                    const { uri } = await ImageManipulator.manipulateAsync(asset.uri, [], {
                        compress: 0.9,
                        format: ImageManipulator.SaveFormat.JPEG,
                    });
                    uriToUpload = uri;
                    uploadName = uploadName + ".jpg";
                    uploadType = "image/jpeg";
                }

                const file = { uri: uriToUpload, type: uploadType, name: uploadName };
                const tempRes = await tempUploadAsync(file);
                const filename = (tempRes as { data?: { filename?: string }; filename?: string })?.data?.filename ?? (tempRes as { filename?: string })?.filename;
                if (filename) {
                    await uploadMediaAsync({
                        patientId: id,
                        data: { media: filename, type: "image", data: {} },
                    });
                    successCount++;
                } else {
                    failCount++;
                }
            } catch {
                failCount++;
            }
        }

        setIsImportingFromGallery(false);
        await refetchPatientMedia();

        if (successCount > 0) {
            const msg = failCount > 0 ? `${successCount} photo(s) added. ${failCount} failed.` : `${successCount} photo(s) added.`;
            Alert.alert("Import", msg);
        } else if (failCount > 0) {
            Alert.alert("Import Failed", "Could not add the selected photos. Please try again.");
        }
    }, [id, tempUploadAsync, uploadMediaAsync, refetchPatientMedia]);

    // Refetch media data when screen is focused (e.g., after uploading new photos)
    useFocusEffect(
        useCallback(() => {
            if (id) {
                refetchPatientMedia();
            }
        }, [id, refetchPatientMedia]),
    );

    // Define DATA and renderRow hooks before any early returns
    const DATA: { key: RowKind }[] = useMemo(() => [{ key: "header" }, { key: "tabs" }, { key: "content" }], []);
    const renderRow = useCallback(
        ({ item }: { item: { key: RowKind } }) => {
            if (item.key === "header") {
                return (
                    <>
                        <View className="items-center justify-center mb-6">
                            <Animated.View style={avatarAnimatedStyle}>
                                <Avatar name={`${patient?.data?.first_name ?? ""} ${patient?.data?.last_name ?? ""}`} size={100} haveRing color={patient?.data?.doctor?.color} imageUrl={patient?.data?.profile_image?.url} />
                            </Animated.View>

                            <Animated.View style={nameAnimatedStyle}>
                                <BaseText type="Title1" weight={600} color="labels.primary">
                                    {patient?.data?.first_name} {patient?.data?.last_name}
                                    {patientAge !== null && (
                                        <BaseText type="Body" weight={600} color="labels.primary">
                                            {" "}
                                            ({patientAge}y)
                                        </BaseText>
                                    )}
                                </BaseText>
                                <View className="flex-row items-center justify-center gap-0.5 mt-1">
                                    {patient?.data?.gender && <IconSymbol name={patient.data.gender === "female" ? "figure.stand.dress" : patient.data.gender === "male" ? "figure.stand" : "person.fill"} size={14} color={colors.labels.secondary} />}
                                    <BaseText type="Callout" weight={400} color="labels.secondary">
                                        last update: {patient?.data?.updated_at ? getRelativeTime(patient.data.updated_at) : ""}
                                    </BaseText>
                                </View>
                            </Animated.View>
                        </View>

                        <View className="gap-5 px-5 mb-6">
                            <View className="w-full h-[76px] bg-white rounded-xl flex-row">
                                <TouchableOpacity
                                    className="flex-1 items-center justify-center gap-2 border-r border-border"
                                    onPress={() => {
                                        if (isImportingFromGallery) return;
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
                                    onLongPress={handleImportFromGallery}
                                    delayLongPress={500}
                                    disabled={isImportingFromGallery}
                                    style={{ opacity: isImportingFromGallery ? 0.6 : 1 }}
                                >
                                    {isImportingFromGallery ? <ActivityIndicator size="small" color={colors.system.blue} /> : <IconSymbol name="camera" color={colors.system.blue} size={26} />}
                                    <BaseText type="Footnote" color="labels.primary">
                                        {isImportingFromGallery ? "Importing…" : "Take photo"}
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
                                <TouchableOpacity className="flex-1 items-center justify-center gap-2" onPress={scanDocument} disabled={isCreatingDocument} style={{ opacity: isCreatingDocument ? 0.5 : 1 }}>
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
                                                phone
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
            } else if (item.key === "tabs") {
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

            if (item.key === "content") {
                return (
                    <View style={{ flex: 1, minHeight: (screenHeight - 150) / 2, backgroundColor: activeTab === 0 ? colors.system.gray6 : colors.system.white }}>
                        {activeTab === 0 &&
                            (isPatientMediaError ? (
                                <ErrorState message={patientMediaError instanceof Error ? patientMediaError.message : (patientMediaError as { message?: string })?.message || "Failed to load media"} onRetry={refetchPatientMedia} title="Failed to load media" />
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
                                        showNote: true,
                                        showArchive: true,
                                        showShare: true,
                                        showMagic: true,
                                        showCompare: true,
                                    }}
                                    sections={groupedPatientImages}
                                    imageUrlToMediaIdMap={imageUrlToMediaIdMap}
                                    imageUrlToBookmarkMap={imageUrlToBookmarkMap}
                                    patientId={id}
                                    rawMediaData={patientMediaData?.data}
                                    description="Date"
                                    practice={practice}
                                    metadata={metadata}
                                    enableTakeAfterTemplate
                                    imageRefreshKey={imageRefreshKey}
                                    imageSavedUri={imageSavedUri}
                                />
                            ))}
                        {activeTab === 0 && (archivedData?.data?.length ?? 0) > 0 && (
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
                        {activeTab === 2 && <IDTabContent documents={idTabDocuments} isLoading={isLoadingDocuments} error={documentsError} isError={isDocumentsError} onRetry={refetchDocuments} patientId={id} practice={practice} metadata={metadata} />}
                        {activeTab === 3 && <ActivitiesTabContent activities={activitiesData?.data || []} isLoading={isLoadingActivities} error={activitiesError} isError={isActivitiesError} onRetry={refetchActivities} />}
                    </View>
                );
            }
            return null as any;
        },
        [
            activeTab,
            avatarAnimatedStyle,
            nameAnimatedStyle,
            patient,
            patientAge,
            id,
            headerHeight,
            safe,
            tabs,
            tabWidth,
            translateX,
            handleTabPress,
            handleCall,
            handleMessage,
            scanDocument,
            groupedPatientImages,
            imageUrlToMediaIdMap,
            imageUrlToBookmarkMap,
            patientMediaData?.data,
            archivedData?.data,
            isPatientMediaError,
            patientMediaError,
            refetchPatientMedia,
            idTabDocuments,
            isLoadingDocuments,
            documentsError,
            isDocumentsError,
            refetchDocuments,
            activitiesData?.data,
            isLoadingActivities,
            activitiesError,
            isActivitiesError,
            refetchActivities,
            screenHeight,
            handleArchiveImage,
            setImageEditorUri,
            setImageEditorTool,
            setImageEditorVisible,
            practice,
            metadata,
        ],
    );

    // Show error state if there's an error with patient data
    if (isPatientError) {
        const errorMessage = (patientError as any)?.message || "Failed to load patient data. Please try again.";
        return (
            <View style={{ flex: 1, backgroundColor: colors.system.gray6 }}>
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{
                        paddingTop: headerHeight,
                        paddingBottom: safe.bottom + spacing["4"],
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
                        paddingBottom: safe.bottom + spacing["4"],
                    }}
                    showsVerticalScrollIndicator={false}
                >
                    <PatientDetailSkeleton />
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.system.gray6 }}>
            <Animated.FlatList
                data={DATA}
                onMomentumScrollEnd={handleSnapScroll}
                keyExtractor={(it) => it.key}
                renderItem={renderRow}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                stickyHeaderIndices={[1]} // «فضای مجازی» برای هدر شفاف
                contentInset={{ top: headerHeight }}
                contentOffset={{ x: 0, y: -headerHeight }}
                contentInsetAdjustmentBehavior="never"
                scrollIndicatorInsets={{ top: headerHeight, bottom: safe.bottom }}
                contentContainerStyle={{}}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
            />
            <ImageEditorModal
                visible={imageEditorVisible}
                uri={imageEditorUri ? (imageUrlToOriginalUriMap.get(imageEditorUri) ?? imageEditorUri) : undefined}
                originalUri={imageEditorUri ? (imageUrlToOriginalUriMap.get(imageEditorUri) ?? imageEditorUri) : undefined}
                initialTool={imageEditorTool}
                mediaId={imageEditorUri ? imageUrlToMediaIdMap.get(imageEditorUri) : undefined}
                mediaImageId={imageEditorUri ? imageUrlToMediaImageIdMap.get(imageEditorUri) : undefined}
                hasTemplate={imageEditorUri ? imageUrlToHasTemplateMap.get(imageEditorUri) : undefined}
                initialEditorState={imageEditorUri ? imageUrlToEditorStateMap.get(imageEditorUri) : undefined}
                onClose={() => {
                    setImageEditorVisible(false);
                    setImageSavedUri(null);
                }}
                onSaveSuccess={() => {
                    refetchPatientMedia();
                    setImageRefreshKey((k) => k + 1);
                    setImageSavedUri(imageEditorUri ?? null);
                }}
            />
        </View>
    );
}
