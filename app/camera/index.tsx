import { GHOST_ASSETS, type GhostItemId } from "@/assets/gost/ghostAssets";
import { getGhostDescription, getGhostIcon, getGhostName, getGhostSample } from "@/assets/gost/ghostMetadata";
import { BaseText, ErrorState } from "@/components";
import Avatar from "@/components/avatar";
import { ImageSkeleton } from "@/components/skeleton/ImageSkeleton";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { containerSize, iconSize } from "@/constants/theme";
import colors from "@/theme/colors";
import { useTempUpload } from "@/utils/hook/useMedia";
import { useGetPatientById } from "@/utils/hook/usePatient";
import { useGetTemplateById } from "@/utils/hook/useTemplate";
import { PracticeTemplate, TemplateCell, TemplateGost } from "@/utils/service/models/ResponseModels";
import { CameraState, CapturedPhoto, FlashMode } from "@/utils/types/camera.types";
import { Button, Host, HStack } from "@expo/ui/swift-ui";
import { frame, glassEffect, padding } from "@expo/ui/swift-ui/modifiers";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { DeviceMotion } from "expo-sensors";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, FlatList, Modal, Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { interpolateColor, runOnJS, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const THUMBNAIL_SIZE = 48;
const MINT_COLOR = "#00c7be";

// 3:2 Aspect Ratio Constant
const ASPECT_RATIO = 3 / 2; // 1.5 - Portrait mode (height = width * 1.5)

// iOS: zoom level on wide lens to approximate 2x when telephoto is not available (0–1 = % of device max zoom)
const ZOOM_FOR_2X_WIDE = 0.2;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// iOS back camera: only wide and telephoto; never macro/ultra-wide to avoid switching to macro
const ALLOWED_BACK_LENSES = ["builtInWideAngleCamera", "builtInTelephotoCamera"] as const;

// Shift viewport-based crop by fraction of crop height (fixes "cropped lower" in review); negative = down, positive = up
const CROP_Y_OFFSET_UP_TEMPLATE = 0.005;
const CROP_Y_OFFSET_UP_NO_TEMPLATE = -0.09;

const FLASH_OPTIONS: { mode: FlashMode; icon: string; label: string }[] = [
    { mode: "auto", icon: "bolt.badge.automatic", label: "Auto" },
    { mode: "on", icon: "bolt.fill", label: "On" },
    { mode: "off", icon: "bolt.slash", label: "Off" },
];

const GHOST_ITEMS_MAP = GHOST_ASSETS;

// Type definition for ghost item data
type GhostItemData = {
    gostId: string;
    imageUrl?: string | null; // gost_image.url - for overlay center
    sampleImageUrl?: string | null; // image.url - for sample modal
    iconUrl?: string | null; // icon.url - for thumbnails
    name?: string;
    description?: string | null;
};

// Separate component for ghost overlay with loading skeleton
const GhostOverlay: React.FC<{
    ghostImageSource: { uri: string } | any;
}> = ({ ghostImageSource }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [showSkeleton, setShowSkeleton] = useState(true);
    const [overlayDimensions, setOverlayDimensions] = useState({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
    const hasLoadedRef = React.useRef(false);
    const imageOpacity = useSharedValue(0);
    const skeletonOpacity = useSharedValue(1);

    const imageAnimatedStyle = useAnimatedStyle(() => ({
        opacity: imageOpacity.value,
    }));

    const skeletonAnimatedStyle = useAnimatedStyle(() => ({
        opacity: skeletonOpacity.value,
    }));

    const hideSkeletonJS = () => {
        setShowSkeleton(false);
    };

    const handleLoad = () => {
        hasLoadedRef.current = true;
        setIsLoading(false);
        skeletonOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
            if (finished) {
                runOnJS(hideSkeletonJS)();
            }
        });
        imageOpacity.value = withTiming(1, { duration: 300 });
    };

    const handleLoadStart = () => {
        if (!hasLoadedRef.current) {
            setIsLoading(true);
            setShowSkeleton(true);
            imageOpacity.value = 0;
            skeletonOpacity.value = 1;
        }
    };

    const handleError = () => {
        hasLoadedRef.current = true;
        setIsLoading(false);
        skeletonOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
            if (finished) {
                runOnJS(hideSkeletonJS)();
            }
        });
        imageOpacity.value = withTiming(1, { duration: 300 });
    };

    const handleLayout = (event: any) => {
        const { width: w, height: h } = event.nativeEvent.layout;
        if (w > 0 && h > 0) {
            setOverlayDimensions({ width: w, height: h });
        }
    };

    return (
        <View style={[styles.ghostOverlay, StyleSheet.absoluteFill]} onLayout={handleLayout}>
            {showSkeleton && (
                <Animated.View style={[StyleSheet.absoluteFill, skeletonAnimatedStyle, { justifyContent: "center", alignItems: "center" }]}>
                    <ImageSkeleton width={overlayDimensions.width} height={overlayDimensions.height} borderRadius={0} variant="rectangular" />
                </Animated.View>
            )}
            <Animated.View style={[StyleSheet.absoluteFill, imageAnimatedStyle, styles.ghostImageWrapper]}>
                <Image source={ghostImageSource} style={styles.ghostImage} contentFit="contain" onLoadStart={handleLoadStart} onLoad={handleLoad} onError={handleError} />
            </Animated.View>
        </View>
    );
};

// Separate component for thumbnail icon with loading skeleton
const ThumbnailIconItem: React.FC<{
    ghostItem: GhostItemData;
    index: number;
    isActive: boolean;
    isCompleted: boolean;
    photo: CapturedPhoto | undefined;
    onPress: () => void;
    onLongPress?: () => void;
}> = ({ ghostItem, index, isActive, isCompleted, photo, onPress, onLongPress }) => {
    const ghostId = ghostItem.gostId;
    const isGhostItemId = (value: unknown): value is GhostItemId => typeof value === "string" && Object.prototype.hasOwnProperty.call(GHOST_ASSETS, value);
    const iconSource = ghostItem.iconUrl ? { uri: ghostItem.iconUrl } : isGhostItemId(ghostId) ? getGhostIcon(ghostId) : null;

    const [isLoading, setIsLoading] = useState(true);
    const [showSkeleton, setShowSkeleton] = useState(true);
    const [iconDimensions, setIconDimensions] = useState({ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE });
    const hasLoadedRef = React.useRef(false);
    const imageOpacity = useSharedValue(0);
    const skeletonOpacity = useSharedValue(1);

    const imageAnimatedStyle = useAnimatedStyle(() => ({
        opacity: imageOpacity.value,
    }));

    const skeletonAnimatedStyle = useAnimatedStyle(() => ({
        opacity: skeletonOpacity.value,
    }));

    const hideSkeletonJS = () => {
        setShowSkeleton(false);
    };

    const handleLoad = () => {
        hasLoadedRef.current = true;
        setIsLoading(false);
        skeletonOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
            if (finished) {
                runOnJS(hideSkeletonJS)();
            }
        });
        imageOpacity.value = withTiming(1, { duration: 300 });
    };

    const handleLoadStart = () => {
        if (!hasLoadedRef.current) {
            setIsLoading(true);
            setShowSkeleton(true);
            imageOpacity.value = 0;
            skeletonOpacity.value = 1;
        }
    };

    const handleError = () => {
        hasLoadedRef.current = true;
        setIsLoading(false);
        skeletonOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
            if (finished) {
                runOnJS(hideSkeletonJS)();
            }
        });
        imageOpacity.value = withTiming(1, { duration: 300 });
    };

    const handleLayout = (event: any) => {
        const { width: w, height: h } = event.nativeEvent.layout;
        if (w > 0 && h > 0) {
            setIconDimensions({ width: w, height: h });
        }
    };

    return (
        <TouchableOpacity onPress={onPress} onLongPress={onLongPress} delayLongPress={500} style={[styles.thumbnail, isActive && styles.thumbnailActive, isCompleted && styles.thumbnailCompleted]}>
            {photo ? (
                <>
                    <Image source={{ uri: photo.uri }} style={styles.thumbnailImage} />
                    <View style={styles.thumbnailCheck}>
                        <IconSymbol name="checkmark.circle.fill" size={16} color={MINT_COLOR} />
                    </View>
                </>
            ) : iconSource ? (
                <View style={styles.thumbnailIconContainer} onLayout={handleLayout}>
                    {showSkeleton && (
                        <Animated.View style={[StyleSheet.absoluteFill, skeletonAnimatedStyle, { justifyContent: "center", alignItems: "center" }]}>
                            <ImageSkeleton width={iconDimensions.width} height={iconDimensions.height} borderRadius={8} variant="rectangular" />
                        </Animated.View>
                    )}
                    <Animated.View style={[StyleSheet.absoluteFill, imageAnimatedStyle]}>
                        <Image source={iconSource} style={styles.thumbnailIcon} contentFit="contain" onLoadStart={handleLoadStart} onLoad={handleLoad} onError={handleError} />
                    </Animated.View>
                </View>
            ) : (
                <View style={styles.thumbnailPlaceholder}>
                    <BaseText type="Caption2" color="labels.tertiary">
                        {index + 1}
                    </BaseText>
                </View>
            )}
        </TouchableOpacity>
    );
};

export default function CameraScreen() {
    const insets = useSafeAreaInsets();
    const cameraRef = useRef<CameraView>(null);
    const [permission, requestPermission] = useCameraPermissions();

    const {
        patientId,
        templateId,
        retakeTemplateId,
        capturedPhotos: capturedPhotosParam,
        beforeMediaId,
    } = useLocalSearchParams<{
        patientId: string;
        templateId?: string;
        retakeTemplateId?: string;
        capturedPhotos?: string;
        beforeMediaId?: string;
    }>();

    // Get patient data from API
    const { data: patientData, isLoading: isPatientLoading, error: patientError, isError: isPatientError, refetch: refetchPatient } = useGetPatientById(patientId || "");

    // Get template data from API
    const { data: templateData, isLoading: isTemplateLoading, error: templateError, isError: isTemplateError, refetch: refetchTemplate } = useGetTemplateById(templateId || "", !!templateId);

    // Extract patient info
    const patientName = useMemo(() => {
        if (!patientData?.data) return "Patient";
        return `${patientData.data.first_name} ${patientData.data.last_name}`;
    }, [patientData]);

    const patientAvatar = useMemo(() => {
        return patientData?.data?.profile_image?.url || undefined;
    }, [patientData]);

    const doctorName = useMemo(() => {
        if (!patientData?.data?.doctor) return "Dr. Name";
        return `Dr. ${patientData.data.doctor.first_name || ""} ${patientData.data.doctor.last_name || ""}`;
    }, [patientData]);

    const doctorColor = useMemo(() => {
        return patientData?.data?.doctor?.color || undefined;
    }, [patientData]);

    // Extract ghost items from template
    const ghostItemsData: GhostItemData[] = useMemo(() => {
        if (!templateData?.data) return [];

        const template = templateData.data as unknown as PracticeTemplate & { cells?: TemplateCell[]; gosts?: TemplateGost[] };
        const items: GhostItemData[] = [];

        // Prefer cells over gosts (new format)
        if (template.cells && Array.isArray(template.cells) && template.cells.length > 0) {
            // Sort by row_index and column_index to maintain order
            const sortedCells = [...template.cells].sort((a: TemplateCell, b: TemplateCell) => {
                if (a.row_index !== b.row_index) return a.row_index - b.row_index;
                return a.column_index - b.column_index;
            });
            items.push(
                ...sortedCells.map((cell: TemplateCell) => ({
                    gostId: String(cell.gost.id),
                    imageUrl: cell.gost.gost_image?.url || null,
                    sampleImageUrl: cell.gost.image?.url || null,
                    iconUrl: cell.gost.icon?.url || null,
                    name: cell.gost.name,
                    description: cell.gost.description || null,
                })),
            );
        } else if (template.gosts && Array.isArray(template.gosts) && template.gosts.length > 0) {
            // Fallback to gosts array (backward compatibility)
            items.push(
                ...template.gosts.map((gost: TemplateGost) => {
                    // Handle gost_image - can be object with url or string
                    let gostImageUrl: string | null = null;
                    if (gost.gost_image) {
                        if (typeof gost.gost_image === "string") {
                            gostImageUrl = gost.gost_image;
                        } else if (typeof gost.gost_image === "object" && "url" in gost.gost_image) {
                            gostImageUrl = (gost.gost_image as { url?: string }).url || null;
                        }
                    }

                    // Handle image - can be object with url or string
                    let imageUrl: string | null = null;
                    if (gost.image) {
                        if (typeof gost.image === "string") {
                            imageUrl = gost.image;
                        } else if (typeof gost.image === "object" && "url" in gost.image) {
                            imageUrl = (gost.image as { url?: string }).url || null;
                        }
                    }

                    // Handle icon - can be object with url or string
                    let iconUrl: string | null = null;
                    if (gost.icon) {
                        if (typeof gost.icon === "string") {
                            iconUrl = gost.icon;
                        } else if (typeof gost.icon === "object" && "url" in gost.icon) {
                            iconUrl = (gost.icon as { url?: string }).url || null;
                        }
                    }

                    return {
                        gostId: String(gost.id),
                        imageUrl: gostImageUrl,
                        sampleImageUrl: imageUrl,
                        iconUrl: iconUrl,
                        name: gost.name,
                        description: gost.description || null,
                    };
                }),
            );
        }

        return items;
    }, [templateData]);

    const isGhostItemId = (value: unknown): value is GhostItemId => typeof value === "string" && Object.prototype.hasOwnProperty.call(GHOST_ASSETS, value);

    // Extract just IDs for backward compatibility (only for local assets)
    const ghostItemIds: GhostItemId[] = useMemo(() => {
        if (!ghostItemsData.length) return [];
        return ghostItemsData.map((item) => item.gostId).filter(isGhostItemId);
    }, [ghostItemsData]);

    // Use ghostItemsData for all items (both local and API)
    const hasGhostItems = ghostItemsData.length > 0;

    const [cameraState, setCameraState] = useState<CameraState>({
        flashMode: "auto",
        cameraPosition: "back",
        isGridEnabled: true,
        zoomLevel: Platform.OS === "ios" ? ZOOM_FOR_2X_WIDE : 0,
    });

    // iOS back camera: prefer 2x telephoto lens; else zoom wide to ~2x
    const [selectedLens, setSelectedLens] = useState<string>("builtInWideAngleCamera");
    const hasApplied2xRef = useRef(false);

    // Level indicator state (horizon line)
    const [levelAngle, setLevelAngle] = useState(0);
    const [hasLevelSensor, setHasLevelSensor] = useState(false);
    const LEVEL_THRESHOLD = 2; // Degrees - consider level if within 2 degrees
    const LEVEL_VISIBLE_RANGE = 15; // Degrees - hide level line when tilted beyond this range
    const LEVEL_DISPLAY_SCALE = 0.52; // Scale line rotation so it matches perceived tilt (sensor often over-reports)

    // Zoom state
    const baseZoom = useSharedValue(Platform.OS === "ios" ? ZOOM_FOR_2X_WIDE : 0);
    const pinchScale = useSharedValue(1);
    const savedZoom = useSharedValue(Platform.OS === "ios" ? ZOOM_FOR_2X_WIDE : 0);
    const MIN_ZOOM = 0;
    const MAX_ZOOM = 1; // expo-camera zoom is 0-1

    const levelLineOpacity = useSharedValue(1); // Start visible
    const levelAngleSv = useSharedValue(0); // Smoothed angle for animation
    const levelIsLevelSv = useSharedValue(0); // 0 = white, 1 = yellow when level
    const wasLevelRef = useRef(false); // Run fade-out only once when becoming level
    const levelFadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // iOS back camera: use 2x telephoto if available, else zoom wide to ~2x (run once after camera ready)
    const handleCameraReady = useCallback(() => {
        if (Platform.OS !== "ios" || cameraState.cameraPosition !== "back") return;
        if (hasApplied2xRef.current) return;

        const apply2x = async () => {
            const ref = cameraRef.current as { getAvailableLenses?: () => Promise<string[]>; getAvailableLensesAsync?: () => Promise<string[]> } | null;
            const getLenses = ref?.getAvailableLenses ?? ref?.getAvailableLensesAsync;
            const maxAttempts = 3;
            const retryDelayMs = 120;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    if (!ref || !getLenses) {
                        if (attempt < maxAttempts) await delay(retryDelayMs);
                        continue;
                    }
                    const lenses = await getLenses.call(ref);
                    if (lenses && Array.isArray(lenses)) {
                        const allowed = lenses.filter((l: string) => (ALLOWED_BACK_LENSES as readonly string[]).includes(l));
                        if (allowed.includes("builtInTelephotoCamera")) {
                            setSelectedLens("builtInTelephotoCamera");
                            const zoomVal = 0;
                            setCameraState((prev) => ({ ...prev, zoomLevel: zoomVal }));
                            baseZoom.value = zoomVal;
                            savedZoom.value = zoomVal;
                        } else {
                            setSelectedLens("builtInWideAngleCamera");
                            const zoomVal = ZOOM_FOR_2X_WIDE;
                            setCameraState((prev) => ({ ...prev, zoomLevel: zoomVal }));
                            baseZoom.value = zoomVal;
                            savedZoom.value = zoomVal;
                        }
                        hasApplied2xRef.current = true;
                        return;
                    }
                } catch {
                    if (attempt < maxAttempts) await delay(retryDelayMs);
                }
            }

            setSelectedLens("builtInWideAngleCamera");
            const zoomVal = ZOOM_FOR_2X_WIDE;
            setCameraState((prev) => ({ ...prev, zoomLevel: zoomVal }));
            baseZoom.value = zoomVal;
            savedZoom.value = zoomVal;
            hasApplied2xRef.current = true;
        };
        void apply2x();
    }, [cameraState.cameraPosition]);

    const levelLineAnimatedStyle = useAnimatedStyle(() => ({
        opacity: levelLineOpacity.value,
    }));

    const levelLineRotationStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${levelAngleSv.value}deg` }],
    }));

    const levelLineColorStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(levelIsLevelSv.value, [0, 1], ["rgba(255,255,255,0.4)", "rgba(255,200,0,0.95)"]),
    }));

    const [isCapturing, setIsCapturing] = useState(false);
    // Initialize capturedPhotos from params if coming from retake, otherwise empty
    const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>(() => {
        if (capturedPhotosParam) {
            try {
                return JSON.parse(capturedPhotosParam);
            } catch {
                return [];
            }
        }
        return [];
    });
    const [currentGhostIndex, setCurrentGhostIndex] = useState(0);
    const currentGhostIndexRef = useRef(currentGhostIndex);
    const [showGuideModal, setShowGuideModal] = useState(false);
    const [showSampleModal, setShowSampleModal] = useState(false);

    // Ref to track tempFilename synchronously (photoId -> tempFilename)
    const tempFilenameMapRef = useRef<Map<string, string>>(new Map());
    // Viewport rect (screen coords) for mapping crop to what user sees in 3:2 frame
    const viewportRef = useRef<{ viewportTop: number; viewportLeft: number; viewportWidth: number; viewportHeight: number } | null>(null);
    // Same viewport for all crops so template and non-template photos align in review (fixed layout)
    const cropViewportRef = useRef<{ viewportTop: number; viewportLeft: number; viewportWidth: number; viewportHeight: number } | null>(null);

    // Hook for immediate temp upload (for all photos)
    const { mutateAsync: uploadToTempAsync } = useTempUpload();

    // Keep ref in sync with state
    useEffect(() => {
        currentGhostIndexRef.current = currentGhostIndex;
    }, [currentGhostIndex]);

    // When switching to front camera, allow 2x logic to re-run when switching back to back (iOS)
    useEffect(() => {
        if (cameraState.cameraPosition === "front") hasApplied2xRef.current = false;
    }, [cameraState.cameraPosition]);

    // Device motion listener for level detection
    useEffect(() => {
        let subscription: { remove: () => void } | null = null;

        const startDeviceMotion = async () => {
            try {
                const isAvailable = await DeviceMotion.isAvailableAsync();
                if (!isAvailable) {
                    console.log("DeviceMotion not available");
                    return;
                }

                // Set update interval to 100ms for smooth updates
                DeviceMotion.setUpdateInterval(100);

                subscription = DeviceMotion.addListener((deviceMotionData) => {
                    if (!deviceMotionData.rotation) {
                        return;
                    }

                    // Use gamma (tilt left/right) for portrait mode level detection
                    // Gamma represents rotation around Y-axis - correct for horizon line when tilting device left/right
                    const gamma = deviceMotionData.rotation.gamma;

                    // Native typically returns radians; if |value| > 4 assume degrees (no conversion)
                    const angleDegrees = Math.abs(gamma) <= 4 ? (gamma * 180) / Math.PI : gamma;

                    // Clamp angle to reasonable range (-45 to +45 degrees)
                    const clampedAngle = Math.max(-45, Math.min(45, angleDegrees));

                    setHasLevelSensor(true);
                    setLevelAngle(clampedAngle);
                });
            } catch (error) {
                console.log("DeviceMotion error:", error);
            }
        };

        startDeviceMotion();

        return () => {
            if (subscription) {
                subscription.remove();
            }
        };
    }, []);

    // Level angle: scale for display so line rotation matches actual device tilt (1:1 feel)
    useEffect(() => {
        const displayAngle = levelAngle * LEVEL_DISPLAY_SCALE;
        levelAngleSv.value = withTiming(displayAngle, { duration: 80 });
    }, [levelAngle]);

    // Update level line visibility based on tilt range:
    // - Beyond LEVEL_VISIBLE_RANGE (>15°): hide line (user is not trying to level)
    // - Within LEVEL_VISIBLE_RANGE but not level (2°–15°): show white line (user is aligning)
    // - Within LEVEL_THRESHOLD (<2°): show yellow, then fade out (device is level)
    useEffect(() => {
        if (!hasLevelSensor) {
            levelLineOpacity.value = withTiming(0, { duration: 300 });
            levelIsLevelSv.value = withTiming(0);
            return;
        }

        const absAngle = Math.abs(levelAngle);
        const isLevel = absAngle < LEVEL_THRESHOLD;
        const isInVisibleRange = absAngle <= LEVEL_VISIBLE_RANGE;

        if (!isInVisibleRange) {
            // Tilted too far — fade out
            wasLevelRef.current = false;
            if (levelFadeTimeoutRef.current) {
                clearTimeout(levelFadeTimeoutRef.current);
                levelFadeTimeoutRef.current = null;
            }
            levelIsLevelSv.value = withTiming(0, { duration: 120 });
            levelLineOpacity.value = withTiming(0, { duration: 300 });
        } else if (isLevel) {
            // Device is level — turn yellow, then fade out after short delay
            levelIsLevelSv.value = withTiming(1, { duration: 120 });
            if (!wasLevelRef.current) {
                wasLevelRef.current = true;
                if (levelFadeTimeoutRef.current) clearTimeout(levelFadeTimeoutRef.current);
                levelFadeTimeoutRef.current = setTimeout(() => {
                    levelLineOpacity.value = withTiming(0, { duration: 350 });
                    levelFadeTimeoutRef.current = null;
                }, 280);
            }
        } else {
            // Within visible range but not level — show white line so user can align
            wasLevelRef.current = false;
            if (levelFadeTimeoutRef.current) {
                clearTimeout(levelFadeTimeoutRef.current);
                levelFadeTimeoutRef.current = null;
            }
            levelIsLevelSv.value = withTiming(0, { duration: 120 });
            levelLineOpacity.value = withTiming(1, { duration: 180 });
        }
    }, [levelAngle, hasLevelSensor]);

    // Navigate to specific ghost item when retaking a photo
    // Note: The photo is already removed in review.tsx before navigation, so we just need to navigate
    // Also handle case when retaking a photo without template (no-template)
    useEffect(() => {
        if (retakeTemplateId) {
            // If retaking a photo without template, remove it from capturedPhotos
            if (retakeTemplateId === "no-template") {
                setCapturedPhotos((prev) => prev.filter((p) => p.templateId !== "no-template"));
            } else if (ghostItemsData.length > 0) {
                // If retaking a photo with template, navigate to that ghost item
                const retakeIndex = ghostItemsData.findIndex((item) => item.gostId === retakeTemplateId);
                if (retakeIndex !== -1) {
                    setCurrentGhostIndex(retakeIndex);
                }
            }
        }
    }, [retakeTemplateId, ghostItemsData]);

    // Show guide modal when ghost items are available
    useEffect(() => {
        if (hasGhostItems) {
            setShowGuideModal(true);
        }
    }, [hasGhostItems]);

    // Animation values
    const flashAnim = useSharedValue(0);
    const checkmarkScale = useSharedValue(0);

    // Current ghost item - use ghostItemsData for all items
    const currentGhostData = hasGhostItems ? ghostItemsData[currentGhostIndex] : null;
    const currentGhostItem = currentGhostData ? (isGhostItemId(currentGhostData.gostId) ? currentGhostData.gostId : null) : null;
    // Use imageUrl from API if available, otherwise fallback to local assets
    const currentGhostImage = currentGhostData?.imageUrl ? { uri: currentGhostData.imageUrl } : currentGhostItem ? GHOST_ITEMS_MAP[currentGhostItem] : null;
    const isLastGhost = currentGhostIndex === ghostItemsData.length - 1;
    const allPhotosCaptures = capturedPhotos.length === ghostItemsData.length && hasGhostItems;

    // Check if current ghost has a captured photo
    // IMPORTANT: Use the EXACT same logic as when taking photo to find the photo
    // When taking photo: templateId = currentGhostData?.gostId || currentGhostItem || "no-template"
    const currentGhostIdForPhoto = currentGhostData?.gostId || currentGhostItem || "no-template";
    const currentGhostPhoto = useMemo(() => {
        // Find photo using the same templateId logic used when taking the photo
        const photo = capturedPhotos.find((p) => {
            // Match by templateId (which was set to ghostId when photo was taken)
            return p.templateId === currentGhostIdForPhoto;
        });
        return photo || null;
    }, [currentGhostIdForPhoto, capturedPhotos]);
    const hasCurrentPhoto = !!currentGhostPhoto;

    // Get template metadata - use data from gost object if available, fallback to metadata
    const getTemplateName = () => {
        if (currentGhostData?.name) return currentGhostData.name;
        if (!currentGhostItem) return "Template";
        return getGhostName(currentGhostItem);
    };

    const getTemplateDescription = () => {
        if (currentGhostData?.description) return currentGhostData.description;
        if (!currentGhostItem) return "Follow the guide lines to position correctly.";
        return getGhostDescription(currentGhostItem);
    };

    const handleCloseGuide = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowGuideModal(false);
    };

    const handleShowSample = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowSampleModal(true);
    };

    const handleCloseSample = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowSampleModal(false);
    };

    // Simple toggle functions
    const toggleFlash = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const modes: FlashMode[] = ["auto", "on", "off"];
        const currentIndex = modes.indexOf(cameraState.flashMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        setCameraState((prev) => ({ ...prev, flashMode: modes[nextIndex] }));
    };

    const toggleGrid = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCameraState((prev) => ({ ...prev, isGridEnabled: !prev.isGridEnabled }));
    };

    const handleSelectTemplate = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({
            pathname: "/camera/template-select" as any,
            params: { patientId },
        });
    };

    const handleGoToReview = useCallback(
        (photos: CapturedPhoto[]) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.push({
                pathname: "/camera/review" as any,
                params: {
                    patientId,
                    photos: JSON.stringify(photos),
                    ...(templateId && { templateId }),
                    ...(beforeMediaId && { beforeMediaId }),
                },
            });
        },
        [patientId, templateId, beforeMediaId],
    );

    // Auto-navigate to review for non-template photos OR template with single ghost after successful upload
    useEffect(() => {
        // For non-template photos OR template with single ghost
        const isSingleGhostTemplate = hasGhostItems && ghostItemsData.length === 1;
        if ((!hasGhostItems || isSingleGhostTemplate) && capturedPhotos.length > 0) {
            // Check if all photos are uploaded
            const relevantPhotos = isSingleGhostTemplate ? capturedPhotos.filter((p) => p.templateId !== "no-template") : capturedPhotos.filter((p) => p.templateId === "no-template");

            const allUploaded =
                relevantPhotos.length > 0 &&
                relevantPhotos.every((p) => {
                    return p.tempFilename || tempFilenameMapRef.current.has(p.id);
                });

            // Only navigate if we have at least one photo and all are uploaded
            if (allUploaded && relevantPhotos.length > 0) {
                // Small delay to ensure state is updated
                const timeoutId = setTimeout(() => {
                    const finalPhotos = capturedPhotos.map((p) => {
                        const tempFilenameFromRef = tempFilenameMapRef.current.get(p.id);
                        if (tempFilenameFromRef && !p.tempFilename) {
                            return { ...p, tempFilename: tempFilenameFromRef, uploadStatus: "success" as const };
                        }
                        return p;
                    });
                    handleGoToReview(finalPhotos);
                }, 200);

                return () => clearTimeout(timeoutId);
            }
        }
    }, [capturedPhotos, hasGhostItems, ghostItemsData.length, handleGoToReview]);

    // Handle retake - remove photo for current ghost and allow retaking
    const handleRetake = useCallback(() => {
        if (!currentGhostData) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // Use the same logic as when taking photo to find and remove the photo
        const ghostId = currentGhostData?.gostId || currentGhostItem || "no-template";

        setCapturedPhotos((prev) => {
            return prev.filter((p) => p.templateId !== ghostId);
        });
    }, [currentGhostData, currentGhostItem]);

    // Pick from gallery for a ghost slot (long-press on thumbnail) – same flow as retake/capture: add photo, temp upload, save on review
    const handlePickFromGalleryForGhost = useCallback(
        async (ghostItem: GhostItemData, index: number) => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Permission Required", "Gallery permission is required to pick a photo.");
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: false,
                quality: 0.95,
            });
            if (result.canceled || !result.assets[0]) return;

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const asset = result.assets[0];
            let uriToUse = asset.uri;
            const mime = asset.mimeType ?? "image/jpeg";
            if (!/^image\/(jpe?g|png)$/i.test(mime)) {
                const { uri } = await ImageManipulator.manipulateAsync(asset.uri, [], {
                    compress: 0.9,
                    format: ImageManipulator.SaveFormat.JPEG,
                });
                uriToUse = uri;
            }

            const ghostId = ghostItem.gostId;
            const ghostName = ghostItem.name ?? ghostId;
            const photoTimestamp = Date.now();
            const currentPhotoId = `photo-${photoTimestamp}`;
            const newPhoto: CapturedPhoto = {
                id: currentPhotoId,
                uri: uriToUse,
                templateId: ghostId,
                templateName: ghostName,
                timestamp: photoTimestamp,
                isCompleted: true,
                uploadStatus: "pending",
            };

            setCapturedPhotos((prev) => {
                const existing = prev.findIndex((p) => p.templateId === ghostId);
                if (existing !== -1) {
                    const updated = [...prev];
                    updated[existing] = newPhoto;
                    return updated;
                }
                return [...prev, newPhoto];
            });
            setCurrentGhostIndex(index);

            const file = {
                uri: uriToUse,
                type: "image/jpeg",
                name: `gallery-${ghostId}-${photoTimestamp}.jpg`,
            };
            setCapturedPhotos((prev) => prev.map((p) => (p.id === currentPhotoId ? { ...p, uploadStatus: "uploading" } : p)));

            try {
                const response = await uploadToTempAsync(file);
                const responseAny = response as { data?: { filename?: string }; filename?: string };
                const tempFilename = responseAny?.data?.filename ?? responseAny?.filename;
                if (tempFilename) {
                    tempFilenameMapRef.current.set(currentPhotoId, tempFilename);
                    setCapturedPhotos((prev) => prev.map((p) => (p.id === currentPhotoId ? { ...p, tempFilename, uploadStatus: "success" as const } : p)));
                } else {
                    setCapturedPhotos((prev) => prev.map((p) => (p.id === currentPhotoId ? { ...p, uploadStatus: "error" as const } : p)));
                }
            } catch {
                setCapturedPhotos((prev) => prev.map((p) => (p.id === currentPhotoId ? { ...p, uploadStatus: "error" as const } : p)));
            }
        },
        [uploadToTempAsync],
    );

    // Take photo
    const handleTakePhoto = useCallback(async () => {
        if (!cameraRef.current || isCapturing) return;

        setIsCapturing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        flashAnim.value = withSequence(withTiming(1, { duration: 50 }), withTiming(0, { duration: 150 }));

        try {
            // Maximum quality: quality 1, skipProcessing false (skipProcessing true can override quality per docs)
            const photo = await cameraRef.current.takePictureAsync({
                quality: 1,
                skipProcessing: false,
            });

            if (photo) {
                const originalWidth = photo.width;
                const originalHeight = photo.height;
                const viewport = cropViewportRef.current ?? viewportRef.current;

                let cropX: number;
                let cropY: number;
                let cropWidth: number;
                let cropHeight: number;

                if (viewport && viewport.viewportWidth > 0 && viewport.viewportHeight > 0) {
                    // Map viewport (screen) to image pixels assuming preview is "cover"
                    const scale = Math.max(SCREEN_WIDTH / originalWidth, SCREEN_HEIGHT / originalHeight);
                    const scaledWidth = originalWidth * scale;
                    const scaledHeight = originalHeight * scale;

                    const visibleX = scaledWidth > SCREEN_WIDTH ? (originalWidth - SCREEN_WIDTH / scale) / 2 : 0;
                    const visibleWidth = scaledWidth > SCREEN_WIDTH ? SCREEN_WIDTH / scale : originalWidth;
                    const visibleY = scaledHeight > SCREEN_HEIGHT ? (originalHeight - SCREEN_HEIGHT / scale) / 2 : 0;
                    const visibleHeight = scaledHeight > SCREEN_HEIGHT ? SCREEN_HEIGHT / scale : originalHeight;

                    cropX = visibleX + viewport.viewportLeft / scale;
                    cropWidth = viewport.viewportWidth / scale;
                    cropHeight = viewport.viewportHeight / scale;
                    const cropYOffset = hasGhostItems ? CROP_Y_OFFSET_UP_TEMPLATE : CROP_Y_OFFSET_UP_NO_TEMPLATE;
                    cropY = visibleY + viewport.viewportTop / scale - cropHeight * cropYOffset;

                    cropX = Math.max(0, Math.min(originalWidth - 1, Math.round(cropX)));
                    cropY = Math.max(0, Math.min(originalHeight - 1, Math.round(cropY)));
                    cropWidth = Math.max(1, Math.min(originalWidth - cropX, Math.round(cropWidth)));
                    cropHeight = Math.max(1, Math.min(originalHeight - cropY, Math.round(cropHeight)));
                } else {
                    // Fallback: center crop to 3:2
                    const targetRatio = ASPECT_RATIO;
                    const currentRatio = originalHeight / originalWidth;
                    if (currentRatio > targetRatio) {
                        cropWidth = originalWidth;
                        cropHeight = Math.round(originalWidth * targetRatio);
                        cropX = 0;
                        cropY = Math.round((originalHeight - cropHeight) / 2);
                    } else {
                        cropHeight = originalHeight;
                        cropWidth = Math.round(originalHeight / targetRatio);
                        cropX = Math.round((originalWidth - cropWidth) / 2);
                        cropY = 0;
                    }
                }

                // Lossless crop: PNG output (no second lossy encode; only camera capture is lossy)
                const croppedPhoto = await ImageManipulator.manipulateAsync(
                    photo.uri,
                    [
                        {
                            crop: {
                                originX: cropX,
                                originY: cropY,
                                width: cropWidth,
                                height: cropHeight,
                            },
                        },
                    ],
                    { format: ImageManipulator.SaveFormat.PNG },
                );

                const finalPhotoUri = croppedPhoto.uri;

                const ghostId = currentGhostData?.gostId || currentGhostItem || "no-template";
                const ghostName = currentGhostData?.name || currentGhostItem || "Quick Photo";
                const photoTimestamp = Date.now();
                const newPhoto: CapturedPhoto = {
                    id: `photo-${photoTimestamp}`,
                    uri: finalPhotoUri,
                    templateId: ghostId,
                    templateName: ghostName,
                    timestamp: photoTimestamp,
                    isCompleted: true,
                    uploadStatus: "pending",
                };

                setCapturedPhotos((prev) => {
                    // Replace if exists for this ghost item (using gostId)
                    const existing = prev.findIndex((p) => p.templateId === ghostId);
                    if (existing !== -1) {
                        const updated = [...prev];
                        updated[existing] = newPhoto;
                        return updated;
                    }
                    return [...prev, newPhoto];
                });

                // Immediately upload ALL photos to temp-upload service
                // Capture photoId in closure to avoid race conditions with parallel uploads
                const currentPhotoId = newPhoto.id;

                try {
                    const filename = finalPhotoUri.split("/").pop() || "image.png";
                    const match = /\.(\w+)$/.exec(filename);
                    const type = match ? `image/${match[1]}` : "image/png";

                    const file: { uri: string; type: string; name: string } = {
                        uri: finalPhotoUri,
                        type: type,
                        name: filename,
                    };

                    // Update status to uploading
                    setCapturedPhotos((prev) => prev.map((p) => (p.id === currentPhotoId ? { ...p, uploadStatus: "uploading" } : p)));

                    // Upload immediately to temp-upload using mutateAsync with closure
                    uploadToTempAsync(file)
                        .then((response) => {
                            // Response structure: {success: true, data: {filename: '...'}}
                            const responseAny = response as { data?: { filename?: string }; filename?: string; id?: string | number };
                            const tempFilename = responseAny?.data?.filename || responseAny?.filename || (responseAny?.id ? String(responseAny.id) : undefined);

                            if (tempFilename) {
                                // Update ref immediately (synchronous)
                                tempFilenameMapRef.current.set(currentPhotoId, tempFilename);

                                // Update state (async)
                                setCapturedPhotos((prev) => {
                                    return prev.map((p) => {
                                        if (p.id === currentPhotoId && !p.tempFilename) {
                                            return { ...p, tempFilename, uploadStatus: "success" as const };
                                        }
                                        return p;
                                    });
                                });
                            }
                        })
                        .catch((error) => {
                            // Update upload status to error
                            setCapturedPhotos((prev) => {
                                return prev.map((p) => {
                                    if (p.id === currentPhotoId && p.uploadStatus === "uploading") {
                                        return { ...p, uploadStatus: "error" as const };
                                    }
                                    return p;
                                });
                            });
                        });
                } catch (error) {
                    setCapturedPhotos((prev) => prev.map((p) => (p.id === currentPhotoId ? { ...p, uploadStatus: "error" } : p)));
                }

                if (hasGhostItems) {
                    // Show checkmark animation only when using templates - fast & snappy
                    checkmarkScale.value = withSequence(
                        withTiming(1, { duration: 120 }), // Quick fade in
                        withTiming(0, { duration: 180 }), // Quick fade out
                    );

                    // Move to next ghost quickly (don't wait for full animation)
                    setTimeout(() => {
                        const currentIndex = currentGhostIndexRef.current;
                        if (currentIndex < ghostItemsData.length - 1) {
                            // Move to next ghost
                            setCurrentGhostIndex((prev) => prev + 1);
                        }
                        // Don't auto-navigate to review - user must click Save button
                    }, 200);
                }
                // No template - don't auto-navigate, user must click Save button
            }
        } catch (error) {
            // Error handled by upload status
        } finally {
            setIsCapturing(false);
        }
    }, [isCapturing, currentGhostData, currentGhostItem, hasGhostItems, ghostItemsData.length, uploadToTempAsync]);

    const renderThumbnailItem = useCallback(
        ({ item: ghostItem, index }: { item: GhostItemData; index: number }) => {
            const ghostId = ghostItem.gostId;
            const photo = capturedPhotos.find((p) => p.templateId === ghostId);
            const isActive = index === currentGhostIndex;
            const isCompleted = !!photo;

            return (
                <ThumbnailIconItem
                    ghostItem={ghostItem}
                    index={index}
                    isActive={isActive}
                    isCompleted={isCompleted}
                    photo={photo}
                    onPress={() => {
                        setCurrentGhostIndex(index);
                    }}
                    onLongPress={() => handlePickFromGalleryForGhost(ghostItem, index)}
                />
            );
        },
        [capturedPhotos, currentGhostIndex, handlePickFromGalleryForGhost],
    );

    const handleClose = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    }, []);

    const isWaitingForUploadToReview = useMemo(() => {
        const isSingleGhostTemplate = hasGhostItems && ghostItemsData.length === 1;
        if (!(!hasGhostItems || isSingleGhostTemplate) || capturedPhotos.length === 0) return false;
        const relevantPhotos = isSingleGhostTemplate ? capturedPhotos.filter((p) => p.templateId !== "no-template") : capturedPhotos.filter((p) => p.templateId === "no-template");
        return relevantPhotos.length > 0 && relevantPhotos.some((p) => p.uploadStatus === "uploading");
    }, [hasGhostItems, ghostItemsData.length, capturedPhotos]);

    const getFlashIcon = () => {
        const option = FLASH_OPTIONS.find((o) => o.mode === cameraState.flashMode);
        return option?.icon || "bolt.badge.automatic";
    };

    // Animated styles
    const flashOverlayStyle = useAnimatedStyle(() => ({
        opacity: flashAnim.value,
    }));

    const checkmarkAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: checkmarkScale.value }],
        opacity: checkmarkScale.value, // Opacity already animated from 0 to 1
    }));

    // Loading state - wait for patient and template data
    if (isPatientLoading || (templateId && isTemplateLoading)) {
        return (
            <View style={[styles.container, { backgroundColor: colors.system.black, justifyContent: "center", alignItems: "center" }]}>
                <ActivityIndicator size="large" color={colors.system.white} />
            </View>
        );
    }

    // Error state - if patient or template not found
    if (isPatientError || (templateId && isTemplateError)) {
        return (
            <View style={[styles.container, { backgroundColor: colors.system.black, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }]}>
                <ErrorState
                    title={isPatientError ? "Failed to load patient" : "Failed to load template"}
                    message={
                        isPatientError
                            ? patientError instanceof Error
                                ? patientError.message
                                : (patientError as unknown as { message?: string })?.message || "Failed to load patient data"
                            : templateError instanceof Error
                              ? templateError.message
                              : (templateError as unknown as { message?: string })?.message || "Failed to load template data"
                    }
                    onRetry={() => {
                        if (isPatientError) refetchPatient();
                        if (templateId && isTemplateError) refetchTemplate();
                    }}
                    icon="exclamationmark.triangle.fill"
                />
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20, padding: 12, backgroundColor: colors.system.blue, borderRadius: 8 }}>
                    <BaseText color="system.white">Go Back</BaseText>
                </TouchableOpacity>
            </View>
        );
    }

    // Error state - if patient not found
    if (!patientData?.data) {
        return (
            <View style={[styles.container, { backgroundColor: colors.system.black, justifyContent: "center", alignItems: "center" }]}>
                <ErrorState title="Patient not found" message="The patient you're looking for doesn't exist." onRetry={() => router.back()} />
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20, padding: 12, backgroundColor: colors.system.blue, borderRadius: 8 }}>
                    <BaseText color="system.white">Go Back</BaseText>
                </TouchableOpacity>
            </View>
        );
    }

    // Permission handling
    if (!permission) {
        return (
            <View style={[styles.container, { backgroundColor: colors.system.black }]}>
                <BaseText color="labels.primary">Loading...</BaseText>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={[styles.container, styles.permissionContainer]}>
                <IconSymbol name="camera" size={64} color={colors.system.white} />
                <BaseText type="Title2" color="labels.primary" className="mt-4 text-center">
                    Camera Access Required
                </BaseText>
                <BaseText type="Body" color="labels.secondary" className="mt-2 text-center px-8">
                    Please allow camera access to take photos
                </BaseText>
                <TouchableOpacity style={styles.permissionButton} onPress={requestPermission} activeOpacity={0.8}>
                    <BaseText type="Body" weight={600} color="system.white">
                        Grant Permission
                    </BaseText>
                </TouchableOpacity>
            </View>
        );
    }

    // Calculate 3:2 viewport dimensions that fit within available space
    const headerHeight = insets.top + 64; // Header: insets.top + 8 (paddingTop) + 44 (button height) + 12 (paddingBottom)
    const bottomHeight = (hasGhostItems ? 172 : 108) + insets.bottom;
    const availableHeight = SCREEN_HEIGHT - headerHeight - bottomHeight;

    // 3:2 viewport - fit within available space while maintaining ratio
    // Calculate max viewport that fits: either full width with calculated height, or full height with calculated width
    const maxViewportHeightByWidth = SCREEN_WIDTH * ASPECT_RATIO; // Height if we use full width
    const maxViewportWidthByHeight = availableHeight / ASPECT_RATIO; // Width if we use full height

    let viewportWidth: number;
    let viewportHeight: number;

    if (maxViewportHeightByWidth <= availableHeight) {
        // Full width fits, use it
        viewportWidth = SCREEN_WIDTH;
        viewportHeight = maxViewportHeightByWidth;
    } else {
        // Need to scale down to fit available height
        viewportHeight = availableHeight;
        viewportWidth = maxViewportWidthByHeight;
    }

    // Center the viewport
    const viewportTop = headerHeight + (availableHeight - viewportHeight) / 2;
    const viewportLeft = (SCREEN_WIDTH - viewportWidth) / 2;
    const viewportBottom = SCREEN_HEIGHT - viewportTop - viewportHeight;

    viewportRef.current = { viewportTop, viewportLeft, viewportWidth, viewportHeight };

    // Fixed viewport for cropping so all photos (template + non-template) align in review
    const bottomHeightForCrop = 172 + insets.bottom;
    const availableHeightForCrop = SCREEN_HEIGHT - headerHeight - bottomHeightForCrop;
    const maxViewportHeightByWidthCrop = SCREEN_WIDTH * ASPECT_RATIO;
    const maxViewportWidthByHeightCrop = availableHeightForCrop / ASPECT_RATIO;
    const cropViewportWidth = maxViewportHeightByWidthCrop <= availableHeightForCrop ? SCREEN_WIDTH : maxViewportWidthByHeightCrop;
    const cropViewportHeight = maxViewportHeightByWidthCrop <= availableHeightForCrop ? maxViewportHeightByWidthCrop : availableHeightForCrop;
    const cropViewportTop = headerHeight + (availableHeightForCrop - cropViewportHeight) / 2;
    const cropViewportLeft = (SCREEN_WIDTH - cropViewportWidth) / 2;
    cropViewportRef.current = {
        viewportTop: cropViewportTop,
        viewportLeft: cropViewportLeft,
        viewportWidth: cropViewportWidth,
        viewportHeight: cropViewportHeight,
    };

    return (
        <View style={styles.container}>
            {/* Camera View - Full screen behind everything; autofocus on center, no pinch */}
            <View style={StyleSheet.absoluteFill}>
                <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={cameraState.cameraPosition} flash={cameraState.flashMode} zoom={cameraState.zoomLevel} onCameraReady={handleCameraReady} autofocus="off" {...(Platform.OS === "ios" && { selectedLens })} />
            </View>

            {/* Top Mask - Covers area above viewport */}
            <View style={[styles.viewportMask, { top: 0, left: 0, right: 0, height: viewportTop }]} />

            {/* Bottom Mask - Covers area below viewport */}
            <View style={[styles.viewportMask, { bottom: 0, left: 0, right: 0, height: viewportBottom }]} />

            {/* Left Mask - Covers area to the left of viewport (when viewport is narrower than screen) */}
            {viewportLeft > 0 && <View style={[styles.viewportMask, { top: viewportTop, left: 0, width: viewportLeft, height: viewportHeight }]} />}

            {/* Right Mask - Covers area to the right of viewport (when viewport is narrower than screen) */}
            {viewportLeft > 0 && <View style={[styles.viewportMask, { top: viewportTop, right: 0, width: viewportLeft, height: viewportHeight }]} />}

            {/* 3:2 Viewport Container */}
            <View
                style={[
                    styles.viewportContainer,
                    {
                        top: viewportTop,
                        left: viewportLeft,
                        width: viewportWidth,
                        height: viewportHeight,
                    },
                ]}
                pointerEvents="box-none"
            >
                {/* Show captured photo if exists, otherwise show grid and ghost overlay */}
                {hasCurrentPhoto && currentGhostPhoto ? (
                    /* Captured Photo Overlay - Show the taken photo */
                    <View style={[styles.capturedPhotoOverlay, { backgroundColor: colors.system.black }]}>
                        <Image source={{ uri: currentGhostPhoto.uri }} style={styles.capturedPhotoImage} contentFit="contain" />
                    </View>
                ) : (
                    <>
                        {/* Development Overlay - Border to show 3:2 capture area */}
                        {__DEV__ && <View style={[StyleSheet.absoluteFill, { borderWidth: 2, borderColor: "rgba(0,199,190,0.8)", borderStyle: "dashed" }]} pointerEvents="none" />}

                        {/* Grid Overlay - iOS style */}
                        {cameraState.isGridEnabled && (
                            <View style={[styles.gridContainer, StyleSheet.absoluteFill]} pointerEvents="none">
                                {/* Vertical lines - Rule of Thirds */}
                                <View style={[styles.gridLine, styles.gridVertical, { left: "33.33%" }]} />
                                <View style={[styles.gridLine, styles.gridVertical, { left: "66.66%" }]} />
                                {/* Horizontal lines - Rule of Thirds */}
                                <View style={[styles.gridLine, styles.gridHorizontal, { top: "33.33%" }]} />
                                <View style={[styles.gridLine, styles.gridHorizontal, { top: "66.66%" }]} />
                            </View>
                        )}

                        {/* Level Indicator (Horizon Line) - Only show when grid enabled; yellow + haptic when level, then fade */}
                        {cameraState.isGridEnabled && (
                            <Animated.View style={[styles.levelContainer, StyleSheet.absoluteFill, levelLineAnimatedStyle]} pointerEvents="none">
                                <Animated.View style={[styles.levelLine, { top: "50%" }, levelLineRotationStyle, levelLineColorStyle]} />
                            </Animated.View>
                        )}

                        {/* Ghost Overlay */}
                        {currentGhostImage && <GhostOverlay ghostImageSource={currentGhostImage} />}
                    </>
                )}
            </View>

            {/* Sample/Retake Button and Camera Controls - Absolute positioned above thumbnails */}
            {hasGhostItems && (
                <View style={{ position: "absolute", bottom: 195 + insets.bottom, left: 0, right: 0, alignItems: "center", justifyContent: "center", pointerEvents: "box-none", zIndex: 10 }}>
                    {/* If photo is captured and not uploading, show Retake; else Sample */}
                    {hasCurrentPhoto && !isWaitingForUploadToReview ? (
                        <Host style={{ width: "100%" }} matchContents={{ vertical: true }}>
                            <HStack alignment="center" spacing={20} modifiers={[padding({ horizontal: 0, vertical: 0 })]}>
                                <HStack
                                    alignment="center"
                                    modifiers={[
                                        padding({ all: 0 }),
                                        frame({ width: 90, height: 44 }),
                                        glassEffect({
                                            glass: {
                                                variant: "regular",
                                            },
                                        }),
                                    ]}
                                >
                                    <Button onPress={handleRetake} variant="plain">
                                        Retake
                                    </Button>
                                </HStack>
                            </HStack>
                        </Host>
                    ) : (
                        <Host style={{ width: "100%" }} matchContents={{ vertical: true }}>
                            <HStack alignment="center" spacing={20} modifiers={[padding({ horizontal: 0, vertical: 0 })]}>
                                <HStack
                                    alignment="center"
                                    modifiers={[
                                        padding({ all: 0 }),
                                        frame({ width: 90, height: 44 }),
                                        glassEffect({
                                            glass: {
                                                variant: "regular",
                                            },
                                        }),
                                    ]}
                                >
                                    <Button onPress={handleShowSample} variant="plain">
                                        Sample
                                    </Button>
                                </HStack>
                            </HStack>
                        </Host>
                    )}
                </View>
            )}

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.7}>
                    <View style={styles.closeButtonBg}>
                        <IconSymbol name="chevron.left" size={24} color={colors.system.white} />
                    </View>
                </TouchableOpacity>

                <View style={styles.patientInfo}>
                    <Avatar name={patientName || "Patient"} size={44} haveRing imageUrl={patientAvatar} color={doctorColor as string} />
                    <View style={styles.patientTextContainer}>
                        <BaseText type="Subhead" weight={600} color="system.white">
                            {patientName || "Patient Name"}
                        </BaseText>
                        <BaseText type="Caption1" color="system.white" style={{ opacity: 0.8 }}>
                            {doctorName || "Dr. Name"}
                        </BaseText>
                    </View>
                </View>

                <View style={styles.headerRight}>
                    {/* Save Button - Only show for template photos with more than one ghost (single ghost templates auto-navigate) */}
                    {hasGhostItems &&
                        ghostItemsData.length > 1 &&
                        (() => {
                            // Check if any photo is currently uploading
                            const isUploading = capturedPhotos.some((p) => p.uploadStatus === "uploading");

                            // Check if save button should be enabled
                            // With template: need all photos captured and uploaded
                            const allCaptured = capturedPhotos.length === ghostItemsData.length;
                            const allUploaded = capturedPhotos.every((p) => {
                                // Check state first, then ref
                                return p.tempFilename || tempFilenameMapRef.current.has(p.id);
                            });
                            const canSave = allCaptured && allUploaded;

                            const isDisabled = !canSave || isUploading;

                            return (
                                <TouchableOpacity
                                    style={[styles.saveButtonHeader, isDisabled && styles.saveButtonHeaderDisabled]}
                                    onPress={() => {
                                        if (isDisabled) return;
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        // Merge tempFilename from ref into photos before going to review
                                        const finalPhotos = capturedPhotos.map((p) => {
                                            const tempFilenameFromRef = tempFilenameMapRef.current.get(p.id);
                                            if (tempFilenameFromRef && !p.tempFilename) {
                                                return { ...p, tempFilename: tempFilenameFromRef, uploadStatus: "success" as const };
                                            }
                                            return p;
                                        });
                                        handleGoToReview(finalPhotos);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    {isUploading ? (
                                        <ActivityIndicator size="small" color={colors.system.white} />
                                    ) : (
                                        <BaseText type="Body" weight={600} color={isDisabled ? "text-secondary" : "system.white"}>
                                            Save
                                        </BaseText>
                                    )}
                                </TouchableOpacity>
                            );
                        })()}
                </View>
            </View>

            {/* Template Select Button and Camera Controls - Only show when no ghost items selected */}
            {!hasGhostItems && (
                <View style={styles.templateButtonContainer}>
                    {/* If photo is captured and not uploading, show Retake; if capturing/uploading show nothing; else Select template */}
                    {hasCurrentPhoto && !isWaitingForUploadToReview ? (
                        <Host style={{ width: "100%" }} matchContents={{ vertical: true }}>
                            <HStack alignment="center" spacing={20} modifiers={[padding({ horizontal: 0, vertical: 20 })]}>
                                <HStack
                                    alignment="center"
                                    modifiers={[
                                        padding({ all: 0 }),
                                        frame({ width: 90, height: 44 }),
                                        glassEffect({
                                            glass: {
                                                variant: "regular",
                                            },
                                        }),
                                    ]}
                                >
                                    <Button
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            setCapturedPhotos((prev) => prev.filter((p) => p.templateId !== "no-template"));
                                        }}
                                        variant="plain"
                                    >
                                        Retake
                                    </Button>
                                </HStack>
                            </HStack>
                        </Host>
                    ) : isCapturing || isWaitingForUploadToReview ? null : (
                        <Host style={{ width: "100%" }} matchContents={{ vertical: true }}>
                            <HStack alignment="center" spacing={20} modifiers={[padding({ horizontal: 0, vertical: 10 })]}>
                                <Button onPress={handleSelectTemplate} variant="glassProminent" controlSize="large" color={MINT_COLOR}>
                                    Select a template
                                </Button>
                            </HStack>
                        </Host>
                    )}
                </View>
            )}

            {/* Flash effect overlay */}
            <Animated.View style={[styles.flashOverlay, flashOverlayStyle]} pointerEvents="none" />

            {/* Checkmark animation */}
            <Animated.View style={[styles.checkmarkOverlay, checkmarkAnimStyle]}>
                <View style={styles.checkmarkCircle}>
                    <IconSymbol name="checkmark" size={48} color={colors.system.white} />
                </View>
            </Animated.View>

            <View style={[styles.bottomControlsWrapper, { paddingBottom: insets.bottom + 16 }]}>
                {/* Ghost item thumbnails - only show when has ghost items */}
                {hasGhostItems && (
                    <View style={styles.thumbnailsContainer}>
                        <FlatList data={ghostItemsData} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailsList} keyExtractor={(item, index) => item.gostId || String(index)} renderItem={renderThumbnailItem} />
                    </View>
                )}

                <View style={[styles.bottomControls, hasCurrentPhoto && { opacity: 0.3 }]} pointerEvents={hasCurrentPhoto ? "none" : "auto"}>
                    {/* Grid */}
                    <Host matchContents>
                        <HStack
                            alignment="center"
                            modifiers={[
                                padding({ all: 0 }),
                                frame({ width: containerSize, height: containerSize }),
                                glassEffect({
                                    glass: {
                                        variant: "regular",
                                    },
                                }),
                            ]}
                        >
                            <TouchableOpacity onPress={toggleGrid} className="w-[44px] h-[44px]  items-center justify-center" disabled={hasCurrentPhoto}>
                                <IconSymbol size={iconSize} name="grid" color={colors.system.white as any} style={{ bottom: -2, left: 2 }} />
                            </TouchableOpacity>
                            {/* <Button variant="plain" onPress={toggleGrid} systemImage="grid" /> */}
                        </HStack>
                    </Host>

                    {/* Shutter Button */}
                    <TouchableOpacity style={styles.shutterButton} onPress={handleTakePhoto} activeOpacity={0.9} disabled={isCapturing || isWaitingForUploadToReview || hasCurrentPhoto}>
                        <View style={styles.shutterOuter}>
                            <View style={styles.shutterInner}>{(isCapturing || isWaitingForUploadToReview) && <ActivityIndicator color={colors.system.gray3} size="small" />}</View>
                        </View>
                    </TouchableOpacity>

                    {/* Flash */}
                    <Host matchContents>
                        <HStack
                            alignment="center"
                            modifiers={[
                                padding({ all: 0 }),
                                frame({ width: containerSize, height: containerSize }),
                                glassEffect({
                                    glass: {
                                        variant: "regular",
                                    },
                                }),
                            ]}
                        >
                            <TouchableOpacity onPress={toggleFlash} className="w-[44px] h-[44px]  items-center justify-center" disabled={hasCurrentPhoto}>
                                <IconSymbol size={iconSize} name={getFlashIcon() as any} color={colors.system.white as any} style={{ bottom: -2, left: 3 }} />
                            </TouchableOpacity>
                            {/* <Button variant="plain" onPress={toggleFlash} systemImage={getFlashIcon() as any} /> */}
                        </HStack>
                    </Host>
                </View>
            </View>

            {/* Sample Modal */}
            <Modal visible={showSampleModal} transparent animationType="fade" onRequestClose={handleCloseSample}>
                <View style={styles.guideModalContainer}>
                    <View style={[styles.guideModalContent, { paddingBottom: insets.bottom }]}>
                        {currentGhostData && (
                            <>
                                {currentGhostData.sampleImageUrl ? (
                                    <Image source={{ uri: currentGhostData.sampleImageUrl }} style={styles.guideImage} contentFit="contain" />
                                ) : currentGhostData.imageUrl ? (
                                    <Image source={{ uri: currentGhostData.imageUrl }} style={styles.guideImage} contentFit="contain" />
                                ) : currentGhostItem ? (
                                    <Image source={getGhostSample(currentGhostItem)} style={styles.guideImage} contentFit="contain" />
                                ) : null}
                                <BaseText type="Title1" weight={600} color="labels.primary" align="center" className="mt-4 text-center">
                                    {getTemplateName()}
                                </BaseText>
                                <BaseText type="Body" align="center" color="labels.primary" className="text-center mt-2 px-8">
                                    {getTemplateDescription()}
                                </BaseText>
                            </>
                        )}
                        <TouchableOpacity style={styles.closeGuideButton} onPress={handleCloseSample} activeOpacity={0.8}>
                            <BaseText type="Body" weight={600} color="system.white">
                                Close
                            </BaseText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.system.black,
    },
    viewportMask: {
        position: "absolute",
        backgroundColor: colors.system.black,
        zIndex: 1,
    },
    viewportContainer: {
        position: "absolute",
        overflow: "hidden",
        zIndex: 2,
    },
    permissionContainer: {
        justifyContent: "center",
        alignItems: "center",
    },
    permissionButton: {
        marginTop: 24,
        backgroundColor: colors.system.blue,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    header: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingBottom: 12,
        backgroundColor: colors.system.black,
        zIndex: 10,
    },
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    headerControlButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: "hidden",
    },
    headerControlButtonBg: {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
        borderRadius: 22,
    },
    closeButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: "hidden",
    },
    closeButtonBg: {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
        borderRadius: 22,
    },
    patientInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flex: 1,
        marginLeft: 12,
    },
    patientTextContainer: {
        alignItems: "flex-start",
    },
    templateBadge: {
        position: "absolute",
        top: 120,
        alignSelf: "center",
        backgroundColor: "rgba(0,0,0,0.6)",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    templateButtonContainer: {
        position: "absolute",
        bottom: 160,
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 20, // Above grid lines
        justifyContent: "center",
        paddingHorizontal: 20,
    },
    bottomControlsRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "transparent",
        justifyContent: "space-between",
        width: "100%",
        paddingHorizontal: 40,
    },
    bottomControlButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: "hidden",
    },
    bottomControlButtonBg: {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
        borderRadius: 22,
    },
    templateButton: {
        backgroundColor: MINT_COLOR,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
    },
    saveButtonHeader: {
        backgroundColor: MINT_COLOR,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        minWidth: 60,
        alignItems: "center",
        justifyContent: "center",
    },
    saveButtonHeaderDisabled: {
        backgroundColor: "rgba(255,255,255,0.2)",
    },
    ghostOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
    },
    ghostImageWrapper: {
        justifyContent: "center",
        alignItems: "center",
    },
    ghostImage: {
        width: "90%",
        height: "90%",
        opacity: 1,
    },
    capturedPhotoOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
    },
    capturedPhotoImage: {
        width: "100%",
        height: "100%",
        opacity: 1,
    },
    bottomControlsWrapper: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.system.black,
        paddingTop: 16,
        zIndex: 10,
    },
    thumbnailsContainer: {
        marginBottom: 16,
        paddingHorizontal: 30,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    sampleButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(0,199,190,0.8)",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
    },
    sampleButtonAbsolute: {
        position: "absolute",
        left: 0,
        right: 0,
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,199,190,0.8)",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        zIndex: 10,
    },
    thumbnailsList: {
        gap: 4,
    },
    thumbnail: {
        width: THUMBNAIL_SIZE,
        height: THUMBNAIL_SIZE,
        borderRadius: 8,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "transparent",
        overflow: "hidden",
    },
    thumbnailActive: {
        borderColor: colors.system.blue,
    },
    thumbnailCompleted: {
        borderColor: MINT_COLOR,
    },
    thumbnailImage: {
        width: "100%",
        height: "100%",
    },
    thumbnailCheck: {
        position: "absolute",
        top: 2,
        right: 2,
    },
    thumbnailPlaceholder: {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    thumbnailIconContainer: {
        width: "100%",
        height: "100%",
        position: "relative",
    },
    thumbnailIcon: {
        width: "100%",
        height: "100%",
        borderRadius: 8,
    },
    bottomControls: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 30,
    },
    bottomControlCircleButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.2)",
    },
    shutterButton: {
        width: 76,
        height: 76,
        justifyContent: "center",
        alignItems: "center",
    },
    shutterOuter: {
        width: 76,
        height: 76,
        borderRadius: 38,
        borderWidth: 5,
        borderColor: colors.system.white,
        justifyContent: "center",
        alignItems: "center",
    },
    shutterInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.system.white,
        justifyContent: "center",
        alignItems: "center",
    },
    flashOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.system.white,
    },
    checkmarkOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
    },
    checkmarkCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: MINT_COLOR,
        justifyContent: "center",
        alignItems: "center",
    },
    cameraViewportDebug: {
        position: "absolute",
        left: 0,
        right: 0,
        borderWidth: 4,
        borderColor: "rgba(255,255,0,0.8)", // Yellow border for debugging
        backgroundColor: "rgba(255,255,0,0.1)", // Light yellow background
    },
    gridContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
    },
    gridLine: {
        position: "absolute",
        backgroundColor: "rgba(255,255,255,0.25)",
        shadowColor: colors.system.black,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 0.5,
        elevation: 1,
    },
    gridVertical: {
        width: 1,
        top: 0,
        bottom: 0,
    },
    gridHorizontal: {
        height: 1,
        left: 0,
        right: 0,
    },
    levelContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
    },
    levelLine: {
        position: "absolute",
        left: "28%",
        right: "28%",
        height: 1,
        shadowColor: colors.system.black,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 0.5,
        elevation: 1,
    },
    guideModalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.7)",
    },
    guideModalContent: {
        backgroundColor: colors.system.white,
        borderRadius: 20,
        padding: 20,
        alignItems: "center",
        width: SCREEN_WIDTH * 0.85,
    },
    guideImage: {
        width: "100%",
        height: SCREEN_WIDTH * 1.085,
    },
    closeGuideButton: {
        marginTop: 20,
        backgroundColor: MINT_COLOR,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        width: "70%",
        alignItems: "center",
    },
});
