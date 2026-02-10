import { BaseText } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import React, { useCallback, useMemo, useState } from "react";
import { Dimensions, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { Extrapolation, interpolate, type SharedValue, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type ViewMode = "vertical" | "horizontal" | "splitLine" | "slider";

const VIEW_MODES: { key: ViewMode; icon: "rectangle.split.2x1" | "rectangle.split.1x2" | "line.vertical" | "square" }[] = [
    { key: "vertical", icon: "rectangle.split.2x1" },
    { key: "horizontal", icon: "rectangle.split.1x2" },
    { key: "splitLine", icon: "line.vertical" },
    { key: "slider", icon: "square" },
];

interface ComparePair {
    beforeUrl: string;
    afterUrl: string;
}

export default function BeforeAfterCompareScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { patientId, pairsJson, currentIndex: currentIndexParam, beforeUrl: beforeUrlParam, afterUrl: afterUrlParam } = useLocalSearchParams<{
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
                    <BaseText type="Body" color="labels.secondary">No comparison available.</BaseText>
                </View>
            </View>
        );
    }

    const isVertical = viewMode === "vertical";
    const isHorizontal = viewMode === "horizontal";
    const isSplitLine = viewMode === "splitLine";
    const isSlider = viewMode === "slider";

    return (
        <View style={[styles.container, styles.containerWhite, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <IconSymbol name="chevron.left" size={24} color={colors.system.blue as any} />
                </TouchableOpacity>
            </View>

            {/* Content - no thumbnails, only comparison */}
            <View style={styles.content}>
                {isVertical && (
                    <View style={styles.verticalSplit}>
                        <View style={styles.halfVertical}>
                            <Image source={{ uri: before }} style={StyleSheet.absoluteFill} contentFit="cover" />
                            <View style={[styles.label, styles.labelBefore]}>
                                <BaseText type="Caption1" weight="600" color="labels.secondary">Before</BaseText>
                            </View>
                        </View>
                        <View style={styles.halfVertical}>
                            <Image source={{ uri: after }} style={StyleSheet.absoluteFill} contentFit="cover" />
                            <View style={[styles.label, styles.labelAfter]}>
                                <BaseText type="Caption1" weight="600" color="system.white">After</BaseText>
                            </View>
                        </View>
                    </View>
                )}

                {isHorizontal && (
                    <View style={styles.horizontalSplit}>
                        <View style={styles.halfHorizontal}>
                            <Image source={{ uri: before }} style={StyleSheet.absoluteFill} contentFit="cover" />
                            <View style={[styles.label, styles.labelBefore]}>
                                <BaseText type="Caption1" weight="600" color="labels.secondary">Before</BaseText>
                            </View>
                        </View>
                        <View style={styles.halfHorizontal}>
                            <Image source={{ uri: after }} style={StyleSheet.absoluteFill} contentFit="cover" />
                            <View style={[styles.label, styles.labelAfter]}>
                                <BaseText type="Caption1" weight="600" color="system.white">After</BaseText>
                            </View>
                        </View>
                    </View>
                )}

                {isSplitLine && (
                    <BeforeAfterSplitLine beforeUrl={before} afterUrl={after} />
                )}

                {isSlider && (
                    <BeforeAfterSliderOpacity beforeUrl={before} afterUrl={after} />
                )}
            </View>

            {/* Bottom toolbar: left arrow | view modes | right arrow, no thumbnails */}
            <View style={[styles.toolbar, { paddingBottom: insets.bottom + 16 }]}>
                <View style={styles.toolbarRow}>
                    <TouchableOpacity
                        onPress={handlePrev}
                        style={[styles.arrowButton, !canGoPrev && styles.arrowDisabled]}
                        disabled={!canGoPrev}
                    >
                        <IconSymbol
                            name="chevron.left"
                            size={24}
                            color={canGoPrev ? (colors.system.blue as any) : (colors.system.gray4 as any)}
                        />
                    </TouchableOpacity>

                    <View style={styles.toolbarIcons}>
                        {VIEW_MODES.map(({ key, icon }) => (
                            <TouchableOpacity
                                key={key}
                                onPress={() => selectViewMode(key)}
                                style={[styles.toolbarIcon, viewMode === key && styles.toolbarIconActive]}
                            >
                                <IconSymbol
                                    name={icon as any}
                                    size={22}
                                    color={viewMode === key ? (colors.system.white as any) : (colors.system.blue as any)}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity
                        onPress={handleNext}
                        style={[styles.arrowButton, !canGoNext && styles.arrowDisabled]}
                        disabled={!canGoNext}
                    >
                        <IconSymbol
                            name="chevron.right"
                            size={24}
                            color={canGoNext ? (colors.system.blue as any) : (colors.system.gray4 as any)}
                        />
                    </TouchableOpacity>
                </View>
                {hasMultiple && (
                    <BaseText type="Caption2" color="labels.tertiary" style={styles.pageIndicator}>
                        {currentIndex + 1}/{pairs.length}
                    </BaseText>
                )}
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

    const updatePosition = useCallback((pageX: number) => {
        const x = pageX - padding;
        const ratio = Math.max(0.05, Math.min(0.95, x / SCREEN_WIDTH));
        dividerX.value = SCREEN_WIDTH * ratio;
    }, [dividerX]);

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
        transform: [{ translateX: dividerX.value - 24 }],
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
                <Image source={{ uri: beforeUrl }} style={styles.splitLineImageFull} contentFit="cover" />
            </Animated.View>

            {/* Right: after image */}
            <Animated.View style={[styles.splitLineRight, rightLeftStyle]}>
                <Animated.View style={[StyleSheet.absoluteFill, afterImageStyle]}>
                    <Image source={{ uri: afterUrl }} style={styles.splitLineImageFull} contentFit="cover" />
                </Animated.View>
            </Animated.View>

            {/* Labels in fixed overlay so divider movement doesn't clip them; pointerEvents none so drag works */}
            <View style={styles.splitLineLabelsOverlay} pointerEvents="none">
                <Animated.View style={[styles.label, styles.labelBefore, styles.labelSplitLineBefore, beforeLabelStyle]}>
                    <BaseText type="Caption1" weight="600" color="labels.secondary">Before</BaseText>
                </Animated.View>
                <Animated.View style={[styles.label, styles.labelAfter, styles.labelSplitLineAfter, afterLabelStyle]}>
                    <BaseText type="Caption1" weight="600" color="system.white">After</BaseText>
                </Animated.View>
            </View>

            {/* Vertical white line + draggable hit area */}
            <Animated.View style={[styles.splitLineDivider, dividerLineStyle]}>
                <View style={styles.splitLineDividerLine} pointerEvents="none" />
            </Animated.View>
            <Animated.View
                style={[styles.splitLineDividerHitArea, dividerLineStyle]}
                onStartShouldSetResponder={() => true}
                onResponderGrant={(e) => updatePosition(e.nativeEvent.pageX)}
                onResponderMove={(e) => updatePosition(e.nativeEvent.pageX)}
            />

            {/* Draggable handle at bottom */}
            <View
                style={styles.splitLineHandleArea}
                onStartShouldSetResponder={() => true}
                onResponderGrant={(e) => updatePosition(e.nativeEvent.pageX)}
                onResponderMove={(e) => updatePosition(e.nativeEvent.pageX)}
            >
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

/** Slider mode: two images stacked, opacity of top (after) controlled by slider */
function BeforeAfterSliderOpacity({ beforeUrl, afterUrl }: { beforeUrl: string; afterUrl: string }) {
    const sliderValue = useSharedValue(0.5);
    const trackWidth = SCREEN_WIDTH - 40;
    const padding = 20;

    const updatePosition = useCallback((pageX: number) => {
        const w = SCREEN_WIDTH - padding * 2;
        const x = pageX - padding;
        const ratio = Math.max(0, Math.min(1, x / w));
        sliderValue.value = withSpring(ratio, { damping: 20, stiffness: 200 });
    }, [sliderValue]);

    const afterImageStyle = useAnimatedStyle(() => ({
        opacity: sliderValue.value,
    }));

    return (
        <View style={styles.sliderContainer}>
            {/* Bottom layer: before */}
            <Image source={{ uri: beforeUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
            {/* Top layer: after, opacity 0..1 */}
            <Animated.View style={[StyleSheet.absoluteFill, afterImageStyle]} pointerEvents="none">
                <Image source={{ uri: afterUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
            </Animated.View>

            {/* Slider track */}
            <View
                style={styles.sliderTrack}
                onStartShouldSetResponder={() => true}
                onResponderGrant={(e) => updatePosition(e.nativeEvent.pageX)}
                onResponderMove={(e) => updatePosition(e.nativeEvent.pageX)}
            >
                <View style={styles.sliderLabels}>
                    <BaseText type="Caption1" color="labels.tertiary">Before</BaseText>
                    <BaseText type="Caption1" color="labels.tertiary">After</BaseText>
                </View>
                <SliderThumb value={sliderValue} trackWidth={trackWidth} />
            </View>
        </View>
    );
}

function SliderThumb({ value, trackWidth }: { value: SharedValue<number>; trackWidth: number }) {
    const style = useAnimatedStyle(() => ({
        transform: [{ translateX: value.value * trackWidth - 14 }],
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: "center",
        alignItems: "center",
    },
    content: {
        flex: 1,
        backgroundColor: colors.system.gray6,
    },
    splitLineContainer: {
        flex: 1,
        position: "relative",
        backgroundColor: colors.system.gray6,
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
        bottom: 0,
        height: 52,
        justifyContent: "center",
        alignItems: "center",
    },
    splitLineHandle: {
        position: "absolute",
        left: 0,
        width: 48,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(255,255,255,0.9)",
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
        backgroundColor: colors.system.gray,
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
        bottom: 64,
        left: 12,
    },
    labelSplitLineAfter: {
        bottom: 64,
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
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
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
    toolbar: {
        paddingHorizontal: 20,
        paddingTop: 12,
        alignItems: "center",
        backgroundColor: colors.system.white,
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
    arrowDisabled: {
        opacity: 0.5,
    },
    toolbarIcons: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        backgroundColor: colors.system.gray6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 24,
    },
    toolbarIcon: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 20,
    },
    toolbarIconActive: {
        backgroundColor: colors.system.blue,
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
        position: "relative",
        backgroundColor: colors.system.black,
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
        width: 28,
        justifyContent: "center",
        alignItems: "center",
    },
    sliderThumb: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.system.blue,
        borderWidth: 3,
        borderColor: colors.system.white,
    },
});
