import { BaseText } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Dimensions, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { Extrapolation, interpolate, type SharedValue, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type ViewMode = "vertical" | "horizontal" | "splitLine" | "slider";

const VIEW_MODES: { key: ViewMode; icon: "square.split.2x1" | "square.split.1x2" | "square.and.line.vertical.and.square" | "square.on.square" }[] = [
    { key: "horizontal", icon: "square.split.2x1" },
    { key: "vertical", icon: "square.split.1x2" },
    { key: "splitLine", icon: "square.and.line.vertical.and.square" },
    { key: "slider", icon: "square.on.square" },
];

interface ComparePair {
    beforeUrl: string;
    afterUrl: string;
}

export default function BeforeAfterCompareScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const {
        patientId,
        pairsJson,
        currentIndex: currentIndexParam,
        beforeUrl: beforeUrlParam,
        afterUrl: afterUrlParam,
    } = useLocalSearchParams<{
        patientId: string;
        pairsJson?: string;
        currentIndex?: string;
        beforeUrl?: string;
        afterUrl?: string;
    }>();

    const pairs = useMemo<ComparePair[]>(() => {
        if (pairsJson) {
            try {
                const decoded = decodeURIComponent(pairsJson);
                const arr = JSON.parse(decoded) as ComparePair[];
                return Array.isArray(arr) ? arr.filter((p) => p?.beforeUrl && p?.afterUrl) : [];
            } catch {
                return [];
            }
        }
        if (beforeUrlParam && afterUrlParam) {
            return [{ beforeUrl: decodeURIComponent(beforeUrlParam), afterUrl: decodeURIComponent(afterUrlParam) }];
        }
        return [];
    }, [pairsJson, beforeUrlParam, afterUrlParam]);

    const initialIndex = useMemo(() => {
        const n = parseInt(currentIndexParam ?? "0", 10);
        if (pairs.length === 0) return 0;
        return Math.max(0, Math.min(n, pairs.length - 1));
    }, [currentIndexParam, pairs.length]);

    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [viewMode, setViewMode] = useState<ViewMode>("vertical");

    const pair = pairs[currentIndex];
    const before = pair?.beforeUrl ?? "";
    const after = pair?.afterUrl ?? "";
    const hasMultiple = pairs.length > 1;
    const canGoPrev = hasMultiple && currentIndex > 0;
    const canGoNext = hasMultiple && currentIndex < pairs.length - 1;

    const handleBack = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    }, [router]);

    const handlePrev = useCallback(() => {
        if (!canGoPrev) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentIndex((i) => i - 1);
    }, [canGoPrev]);

    const handleNext = useCallback(() => {
        if (!canGoNext) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentIndex((i) => i + 1);
    }, [canGoNext]);

    const selectViewMode = useCallback((mode: ViewMode) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setViewMode(mode);
    }, []);

    if (pairs.length === 0 || !before || !after) {
        return (
            <View style={[styles.container, styles.containerWhite, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={24} color={colors.system.blue as any} />
                </TouchableOpacity>
                <View style={styles.centered}>
                    <BaseText type="Body" color="labels.secondary">
                        No comparison available.
                    </BaseText>
                </View>
            </View>
        );
    }

    const isVertical = viewMode === "vertical";
    const isHorizontal = viewMode === "horizontal";
    const isSplitLine = viewMode === "splitLine";
    const isSlider = viewMode === "slider";

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.system.gray6 }]}>
            {/* Header: light gray, back left, page indicator 1/4 right */}
            <View style={[styles.header, styles.headerLightGray, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={handleBack} style={styles.backButtonCircle} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <IconSymbol name="chevron.left" size={24} color={colors.system.black as any} />
                </TouchableOpacity>
                {hasMultiple && (
                    <BaseText type="Caption1" weight="600" color="labels.secondary" style={styles.headerPageIndicator}>
                        {currentIndex + 1}/{pairs.length}
                    </BaseText>
                )}
            </View>

            {/* Content: full space, contain = no crop, image as large as possible */}
            <View style={[styles.content, styles.contentWhite]}>
                {isVertical && (
                    <View style={styles.verticalSplit}>
                        <View style={styles.halfVertical}>
                            <Image source={{ uri: before }} style={StyleSheet.absoluteFill} contentFit="cover" />
                            <View style={[styles.label, styles.labelBeforePill]}>
                                <BaseText type="Caption1" weight="600" color="labels.secondary">
                                    Before
                                </BaseText>
                            </View>
                        </View>
                        <View style={styles.halfVertical}>
                            <Image source={{ uri: after }} style={StyleSheet.absoluteFill} contentFit="cover" />
                            <View style={[styles.label, styles.labelAfterPill]}>
                                <BaseText type="Caption1" weight="600" color="system.blue">
                                    After
                                </BaseText>
                            </View>
                        </View>
                    </View>
                )}

                {isHorizontal && (
                    <View style={styles.horizontalSplit}>
                        <View style={styles.halfHorizontal}>
                            <Image source={{ uri: before }} style={StyleSheet.absoluteFill} contentFit="cover" />
                            <View style={[styles.label, styles.labelBeforePill]}>
                                <BaseText type="Caption1" weight="600" color="labels.secondary">
                                    Before
                                </BaseText>
                            </View>
                        </View>
                        <View style={styles.halfHorizontal}>
                            <Image source={{ uri: after }} style={StyleSheet.absoluteFill} contentFit="cover" />
                            <View style={[styles.label, styles.labelAfterPill]}>
                                <BaseText type="Caption1" weight="600" color="system.blue">
                                    After
                                </BaseText>
                            </View>
                        </View>
                    </View>
                )}

                {isSplitLine && <BeforeAfterSplitLine beforeUrl={before} afterUrl={after} />}

                {isSlider && <BeforeAfterSliderOpacity beforeUrl={before} afterUrl={after} />}
            </View>

            {/* Bottom toolbar: light gray bg; white circular arrows + white pill center (Figma) */}
            <View style={[styles.toolbar, { paddingBottom: insets.bottom }]}>
                <View style={styles.toolbarRow}>
                    <TouchableOpacity onPress={handlePrev} style={[styles.arrowButtonCircle, !canGoPrev && styles.arrowDisabled]} disabled={!canGoPrev}>
                        <IconSymbol name="chevron.left" size={24} color={canGoPrev ? (colors.system.black as any) : (colors.system.gray4 as any)} />
                    </TouchableOpacity>

                    <View style={styles.toolbarIconsPill}>
                        {VIEW_MODES.map(({ key, icon }) => (
                            <TouchableOpacity key={key} onPress={() => selectViewMode(key)} style={[styles.toolbarIcon]}>
                                <IconSymbol name={icon as any} size={key === "splitLine" ? 34 : 22} color={viewMode === key ? (colors.system.blue as any) : (colors.system.black as any)} />
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity onPress={handleNext} style={[styles.arrowButtonCircle, !canGoNext && styles.arrowDisabled]} disabled={!canGoNext}>
                        <IconSymbol name="chevron.right" size={24} color={canGoNext ? (colors.system.black as any) : (colors.system.gray4 as any)} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

/** Split-line mode: vertical divider, left = before, right = after, draggable line with handle at bottom (Figma 12198-10455) */
function BeforeAfterSplitLine({ beforeUrl, afterUrl }: { beforeUrl: string; afterUrl: string }) {
    const dividerX = useSharedValue(SCREEN_WIDTH * 0.5);
    const padding = 0;
    const labelMinSideWidth = 120;
    const labelFadeStart = 60;

    const updatePosition = useCallback(
        (pageX: number) => {
            const x = pageX - padding;
            const ratio = Math.max(0.05, Math.min(0.95, x / SCREEN_WIDTH));
            dividerX.value = SCREEN_WIDTH * ratio;
        },
        [dividerX],
    );

    const leftWidthStyle = useAnimatedStyle(() => ({
        width: dividerX.value,
    }));

    const rightLeftStyle = useAnimatedStyle(() => ({
        left: dividerX.value,
    }));

    const afterImageStyle = useAnimatedStyle(() => ({
        left: -dividerX.value,
        width: SCREEN_WIDTH,
    }));

    const dividerLineStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: dividerX.value - 1 }],
    }));

    const handleStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: dividerX.value - 32 }],
    }));

    const beforeLabelStyle = useAnimatedStyle(() => ({
        opacity: interpolate(dividerX.value, [labelFadeStart, labelMinSideWidth], [0, 1], Extrapolation.CLAMP),
    }));

    const afterLabelStyle = useAnimatedStyle(() => ({
        opacity: interpolate(SCREEN_WIDTH - dividerX.value, [labelFadeStart, labelMinSideWidth], [0, 1], Extrapolation.CLAMP),
    }));

    return (
        <View style={styles.splitLineContainer}>
            {/* Left: before image (no labels inside – they get clipped when divider moves) */}
            <Animated.View style={[styles.splitLineLeft, leftWidthStyle]}>
                <Image source={{ uri: beforeUrl }} style={styles.splitLineImageFull} contentFit="contain" />
            </Animated.View>

            {/* Right: after image */}
            <Animated.View style={[styles.splitLineRight, rightLeftStyle]}>
                <Animated.View style={[StyleSheet.absoluteFill, afterImageStyle]}>
                    <Image source={{ uri: afterUrl }} style={styles.splitLineImageFull} contentFit="contain" />
                </Animated.View>
            </Animated.View>

            {/* Labels in fixed overlay: light gray pill, Before=dark gray, After=blue */}
            <View style={styles.splitLineLabelsOverlay} pointerEvents="none">
                <Animated.View style={[styles.label, styles.labelBeforePill, styles.labelSplitLineBefore, beforeLabelStyle]}>
                    <BaseText type="Caption1" weight="600" color="labels.secondary">
                        Before
                    </BaseText>
                </Animated.View>
                <Animated.View style={[styles.label, styles.labelAfterPill, styles.labelSplitLineAfter, afterLabelStyle]}>
                    <BaseText type="Caption1" weight="600" color="system.blue">
                        After
                    </BaseText>
                </Animated.View>
            </View>

            {/* Vertical white line + draggable hit area */}
            <Animated.View style={[styles.splitLineDivider, dividerLineStyle]}>
                <View style={styles.splitLineDividerLine} pointerEvents="none" />
            </Animated.View>
            <Animated.View style={[styles.splitLineDividerHitArea, dividerLineStyle]} onStartShouldSetResponder={() => true} onResponderGrant={(e) => updatePosition(e.nativeEvent.pageX)} onResponderMove={(e) => updatePosition(e.nativeEvent.pageX)} />

            {/* Draggable handle at bottom */}
            <View style={styles.splitLineHandleArea} onStartShouldSetResponder={() => true} onResponderGrant={(e) => updatePosition(e.nativeEvent.pageX)} onResponderMove={(e) => updatePosition(e.nativeEvent.pageX)}>
                <Animated.View style={[styles.splitLineHandle, handleStyle]} pointerEvents="none">
                    <View style={styles.splitLineGrip}>
                        <View style={styles.splitLineGripLine} />
                        <View style={styles.splitLineGripLine} />
                        <View style={styles.splitLineGripLine} />
                    </View>
                </Animated.View>
            </View>
        </View>
    );
}

/** Slider mode: image on top, slider pill below image (above tab bar), opacity of after controlled by slider */
function BeforeAfterSliderOpacity({ beforeUrl, afterUrl }: { beforeUrl: string; afterUrl: string }) {
    const sliderValue = useSharedValue(0.5);
    const trackWidthSv = useSharedValue(SCREEN_WIDTH - 120);
    const trackXRef = React.useRef(0);

    const updatePosition = useCallback(
        (pageX: number) => {
            const ratio = Math.max(0, Math.min(1, (pageX - trackXRef.current) / trackWidthSv.value));
            sliderValue.value = ratio;
        },
        [sliderValue, trackWidthSv],
    );

    const afterImageStyle = useAnimatedStyle(() => ({
        opacity: sliderValue.value,
    }));

    const trackFillStyle = useAnimatedStyle(() => ({
        width: sliderValue.value * trackWidthSv.value,
    }));

    return (
        <View style={styles.sliderContainer}>
            {/* Top: image area (no overlap) */}
            <View style={styles.sliderImageArea}>
                <Image source={{ uri: beforeUrl }} style={StyleSheet.absoluteFill} contentFit="contain" />
                <Animated.View style={[StyleSheet.absoluteFill, afterImageStyle]} pointerEvents="none">
                    <Image source={{ uri: afterUrl }} style={StyleSheet.absoluteFill} contentFit="contain" />
                </Animated.View>
            </View>

            {/* Below image: slider pill (above tab bar) */}
            <View style={styles.sliderPillWrap}>
                <View style={styles.sliderBox} onStartShouldSetResponder={() => true} onResponderGrant={(e) => updatePosition(e.nativeEvent.pageX)} onResponderMove={(e) => updatePosition(e.nativeEvent.pageX)}>
                    <BaseText type="Caption1" color="labels.secondary" style={styles.sliderBoxLabel}>
                        Before
                    </BaseText>
                    <View
                        style={styles.sliderTrackWrap}
                        onLayout={(e) => {
                            const w = e.nativeEvent.layout.width;
                            trackWidthSv.value = w;
                            e.currentTarget.measureInWindow((x) => {
                                trackXRef.current = x;
                            });
                        }}
                    >
                        <View style={styles.sliderTrackBg} />
                        <Animated.View style={[styles.sliderTrackFill, trackFillStyle]} pointerEvents="none" />
                        <SliderThumb value={sliderValue} trackWidthSv={trackWidthSv} />
                    </View>
                    <BaseText type="Caption1" weight="600" color="system.blue" style={styles.sliderBoxLabel}>
                        After
                    </BaseText>
                </View>
            </View>
        </View>
    );
}

function SliderThumb({ value, trackWidthSv }: { value: SharedValue<number>; trackWidthSv: SharedValue<number> }) {
    const THUMB_SIZE = 24;
    const style = useAnimatedStyle(() => ({
        transform: [{ translateX: value.value * trackWidthSv.value - THUMB_SIZE / 2 }],
    }));
    return (
        <Animated.View style={[styles.sliderThumbWrap, style]} pointerEvents="none">
            <View style={styles.sliderThumb} />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    containerWhite: {
        backgroundColor: colors.system.white,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    headerLightGray: {
        backgroundColor: colors.system.gray6,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: "center",
        alignItems: "center",
    },
    backButtonCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.system.white,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: colors.system.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    headerPageIndicator: {
        minWidth: 44,
        textAlign: "right",
    },
    content: {
        flex: 1,
    },
    contentWhite: {},
    splitLineContainer: {
        flex: 1,
        position: "relative",
    },
    splitLineLeft: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        overflow: "hidden",
    },
    splitLineImageFull: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: SCREEN_WIDTH,
    },
    splitLineRight: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        overflow: "hidden",
    },
    splitLineDivider: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 2,
        alignItems: "center",
        pointerEvents: "none",
    },
    splitLineDividerLine: {
        flex: 1,
        width: 2,
        backgroundColor: colors.system.white,
        shadowColor: colors.system.black,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 2,
        elevation: 2,
    },
    splitLineDividerHitArea: {
        position: "absolute",
        left: -16,
        width: 32,
        top: 0,
        bottom: 0,
        zIndex: 1,
    },
    splitLineHandleArea: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 16,
        height: 52,
        justifyContent: "center",
        alignItems: "center",
    },
    splitLineHandle: {
        position: "absolute",
        left: 0,
        width: 64,
        height: 48,
        borderRadius: 99,
        backgroundColor: "rgba(255,255,255,1)",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: colors.system.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
    },
    splitLineGrip: {
        gap: 4,
    },
    splitLineGripLine: {
        width: 20,
        height: 2,
        borderRadius: 1,
        backgroundColor: colors.system.black,
    },
    splitLineLabelsOverlay: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 0,
    },
    labelSplitLineBefore: {
        bottom: 88,
        left: 12,
    },
    labelSplitLineAfter: {
        bottom: 88,
        right: 12,
        left: undefined,
    },
    verticalSplit: {
        flex: 1,
    },
    halfVertical: {
        flex: 1,
        position: "relative",
        overflow: "hidden",
    },
    horizontalSplit: {
        flex: 1,
        flexDirection: "row",
    },
    halfHorizontal: {
        flex: 1,
        position: "relative",
        overflow: "hidden",
    },
    label: {
        position: "absolute",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 99,
    },
    labelBefore: {
        bottom: 12,
        left: 12,
        backgroundColor: "rgba(255,255,255,0.7)",
    },
    labelAfter: {
        top: 12,
        left: 12,
        backgroundColor: colors.system.blue,
    },
    labelBeforePill: {
        bottom: 12,
        left: 12,
        backgroundColor: colors.system.gray5,
    },
    labelAfterPill: {
        bottom: 12,
        left: 12,
        backgroundColor: colors.system.gray5,
    },
    toolbar: {
        paddingHorizontal: 20,
        paddingTop: 12,
        alignItems: "center",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: colors.system.black,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 8,
    },

    toolbarRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
    },
    arrowButton: {
        width: 44,
        height: 44,
        justifyContent: "center",
        alignItems: "center",
    },
    arrowButtonCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.system.white,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: colors.system.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    arrowDisabled: {
        opacity: 0.5,
    },
    toolbarIcons: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 24,
    },
    toolbarIconsPill: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        backgroundColor: colors.system.white,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 99,
        shadowColor: colors.system.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.01,
        shadowRadius: 4,
        elevation: 2,
    },
    toolbarIcon: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 20,
    },

    pageIndicator: {
        marginTop: 8,
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    sliderContainer: {
        flex: 1,
        // backgroundColor: colors.system.white,
        flexDirection: "column",
    },
    sliderImageArea: {
        flex: 1,
        position: "relative",
        overflow: "hidden",
    },
    sliderPillWrap: {
        paddingHorizontal: 20,
        paddingTop: 12,
        backgroundColor: colors.system.gray6,
    },
    sliderBox: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 4,
        paddingHorizontal: 14,
        backgroundColor: colors.system.white,
        borderRadius: 999,
        gap: 16,
    },
    sliderBoxLabel: {
        minWidth: 48,
        textAlign: "center",
    },
    sliderTrackWrap: {
        flex: 1,
        height: 40,
        justifyContent: "center",
        position: "relative",
    },
    sliderTrackBg: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 18,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.system.gray6,
    },
    sliderTrackFill: {
        position: "absolute",
        left: 0,
        top: 18,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.system.blue,
    },
    sliderTrack: {
        position: "absolute",
        left: 20,
        right: 20,
        bottom: 24,
        height: 48,
        justifyContent: "center",
    },
    sliderLabels: {
        position: "absolute",
        left: 0,
        right: 0,
        top: -20,
        flexDirection: "row",
        justifyContent: "space-between",
    },
    sliderThumbWrap: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 24,
        justifyContent: "center",
        alignItems: "center",
    },
    sliderThumb: {
        width: 18,
        height: 18,
        borderRadius: 12,
        backgroundColor: colors.system.blue,
    },
});
