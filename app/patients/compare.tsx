import { BaseText } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { getRelativeTime } from "@/utils/helper/dateUtils";
import { alignImages } from "@/utils/alignApi";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { Extrapolation, interpolate, type SharedValue, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ALIGN_TEMPLATE_NAMES = ["Front Face Smile", "Front Face"] as const;
const LOG_TAG = "[CompareAlign]";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Thumbnail strip layout (like ImageViewerModal)
const THUMB_PADDING = SCREEN_WIDTH / 2 - 22;

type ViewMode = "vertical" | "horizontal" | "splitLine" | "slider";

const VIEW_MODES: { key: ViewMode; icon: "square.split.2x1" | "square.split.1x2" | "square.and.line.vertical.and.square" | "square.on.square" }[] = [
    { key: "horizontal", icon: "square.split.2x1" },
    // { key: "vertical", icon: "square.split.1x2" },
    { key: "splitLine", icon: "square.and.line.vertical.and.square" },
    { key: "slider", icon: "square.on.square" },
];

interface ComparePair {
    beforeUrl: string;
    afterUrl: string;
    beforeDate?: string;
    afterDate?: string;
    templateName?: string;
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
    const [viewMode, setViewMode] = useState<ViewMode>("horizontal");
    const [contentHeight, setContentHeight] = useState(0);
    // Key by "beforeUrl|afterUrl" so switching index or pair always shows the correct aligned image for that pair
    const [alignedAfterByKey, setAlignedAfterByKey] = useState<Record<string, string>>({});
    const thumbnailScrollRef = useRef<ScrollView>(null);
    const isProgrammaticScrollRef = useRef(false);

    // Align API: only for "Front Face Smile" or "Front Face". Store result by pair key (beforeUrl|afterUrl) so index switch shows correct image.
    useEffect(() => {
        if (pairs.length === 0) {
            console.log(`${LOG_TAG} pairs.length=0, skip align`);
            return;
        }
        setAlignedAfterByKey((prev) => {
            const next: Record<string, string> = {};
            pairs.forEach((p) => {
                const key = `${p.beforeUrl}|${p.afterUrl}`;
                if (prev[key]) next[key] = prev[key];
            });
            return next;
        });
        console.log(`${LOG_TAG} align effect run`, { pairsCount: pairs.length, pairs: pairs.map((p, i) => ({ i, templateName: p.templateName, beforeUrl: p.beforeUrl, afterUrl: p.afterUrl })) });
        let cancelled = false;
        const run = async () => {
            for (let i = 0; i < pairs.length; i++) {
                if (cancelled) return;
                const p = pairs[i];
                const name = p.templateName?.trim();
                const shouldAlign = name && ALIGN_TEMPLATE_NAMES.includes(name as (typeof ALIGN_TEMPLATE_NAMES)[number]);
                if (!shouldAlign || !p.beforeUrl || !p.afterUrl) {
                    console.log(`${LOG_TAG} pair[${i}] skip align`, { templateName: name ?? "—", hasBefore: !!p.beforeUrl, hasAfter: !!p.afterUrl });
                    continue;
                }
                const pairKey = `${p.beforeUrl}|${p.afterUrl}`;
                console.log(`${LOG_TAG} pair[${i}] calling alignImages`, { templateName: name, beforeUrl: p.beforeUrl, afterUrl: p.afterUrl });
                const result = await alignImages(p.beforeUrl, p.afterUrl);
                if (cancelled) return;
                if (result.success) {
                    console.log(`${LOG_TAG} pair[${i}] align ok`, { pairKey: pairKey.slice(0, 50), afterAlignedLength: result.afterAlignedCropped?.length });
                    setAlignedAfterByKey((prev) => ({ ...prev, [pairKey]: result.afterAlignedCropped }));
                } else {
                    console.log(`${LOG_TAG} pair[${i}] align fail`, { error: "error" in result ? result.error : "" });
                }
            }
        };
        run();
        return () => {
            cancelled = true;
        };
    }, [pairs]);

    // Badge bottom for horizontal mode: image is 3:2 contain, so image height = (SCREEN_WIDTH/2)*2/3; badge sits on image bottom
    const halfWidth = SCREEN_WIDTH / 2;
    const imageHeight3x2 = halfWidth * (2 / 3);
    const badgeBottomHorizontal = contentHeight > 0 ? Math.max(12, (contentHeight - imageHeight3x2) / 2.7) : 56;

    const ACTIVE_THUMB_WIDTH = 44;
    const INACTIVE_THUMB_WIDTH = 24;
    const THUMB_GAP = 2;
    const ACTIVE_MARGIN = 2;
    const THUMB_SLOT_WIDTH = ACTIVE_THUMB_WIDTH + ACTIVE_MARGIN * 2;
    const thumbnailStripWidth = pairs.length <= 0 ? SCREEN_WIDTH : THUMB_PADDING * 2 + pairs.length * THUMB_SLOT_WIDTH;
    const centerOffset = THUMB_PADDING + THUMB_SLOT_WIDTH / 2;

    const scrollThumbnailToIndex = useCallback(
        (index: number) => {
            if (pairs.length <= 0) return;
            isProgrammaticScrollRef.current = true;
            const clamped = Math.max(0, Math.min(index, pairs.length - 1));
            const x = centerOffset + clamped * THUMB_SLOT_WIDTH - SCREEN_WIDTH / 2;
            const offset = Math.max(0, Math.min(x, thumbnailStripWidth - SCREEN_WIDTH));
            thumbnailScrollRef.current?.scrollTo({ x: offset, animated: true });
            setTimeout(() => {
                isProgrammaticScrollRef.current = false;
            }, 350);
        },
        [pairs.length, thumbnailStripWidth, centerOffset],
    );

    useEffect(() => {
        if (pairs.length > 0) scrollThumbnailToIndex(initialIndex);
    }, [initialIndex, pairs.length, scrollThumbnailToIndex]);

    const onThumbnailScroll = useCallback(
        (e: { nativeEvent: { contentOffset: { x: number } } }) => {
            if (isProgrammaticScrollRef.current) return;
            const scrollX = e.nativeEvent.contentOffset.x;
            const centerInContent = scrollX + SCREEN_WIDTH / 2;
            const index = Math.round((centerInContent - centerOffset) / THUMB_SLOT_WIDTH);
            const clamped = Math.max(0, Math.min(index, pairs.length - 1));
            setCurrentIndex((prev) => (prev !== clamped ? clamped : prev));
        },
        [pairs.length, centerOffset],
    );

    const pair = pairs[currentIndex];
    const before = pair?.beforeUrl ?? "";
    const afterOriginal = pair?.afterUrl ?? "";
    const pairKey = before && afterOriginal ? `${before}|${afterOriginal}` : "";
    const afterDisplay = pairKey && alignedAfterByKey[pairKey] ? alignedAfterByKey[pairKey] : afterOriginal;

    const handleBack = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    }, [router]);

    const selectViewMode = useCallback((mode: ViewMode) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setViewMode(mode);
    }, []);

    if (pairs.length === 0 || !before || !afterOriginal) {
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
            </View>

            {/* Content: full space; horizontal = two halves with contain (own ratio), fill above tab */}
            <View style={[styles.content, styles.contentWhite]}>
                {/* {isVertical && (
                    <View style={styles.verticalSplit}>
                        <View style={styles.halfVertical}>
                            <Image source={{ uri: before }} style={StyleSheet.absoluteFill} contentFit="cover" />
                            <View style={[styles.label, styles.labelBeforePill]}>
                                <BaseText type="Caption1" weight="600" color="labels.secondary">Before</BaseText>
                            </View>
                        </View>
                        <View style={styles.halfVertical}>
                            <Image source={{ uri: after }} style={StyleSheet.absoluteFill} contentFit="cover" />
                            <View style={[styles.label, styles.labelAfterPill]}>
                                <BaseText type="Caption1" weight="600" color="system.blue">After</BaseText>
                            </View>
                        </View>
                    </View>
                )} */}

                {isHorizontal && (
                    <View
                        style={styles.horizontalSplit}
                        onLayout={(e) => {
                            const h = e.nativeEvent.layout.height;
                            if (h > 0) setContentHeight(h);
                        }}
                    >
                        <View style={styles.halfHorizontal}>
                            <Image key={`before-${pairKey}`} source={{ uri: before }} style={StyleSheet.absoluteFill} contentFit="contain" />
                            <View style={[styles.label, styles.labelBeforePill, styles.labelOnImage, { bottom: badgeBottomHorizontal }]}>
                                <BaseText type="Caption1" weight="600" color="labels.primary">
                                    Before
                                </BaseText>
                                {pair?.beforeDate ? (
                                    <BaseText type="Caption2" weight="400" color="labels.secondary" style={styles.labelDate}>
                                        {getRelativeTime(pair.beforeDate)}
                                    </BaseText>
                                ) : null}
                            </View>
                        </View>
                        <View style={styles.halfHorizontal}>
                            <Image key={`after-${pairKey}`} source={{ uri: afterDisplay }} style={StyleSheet.absoluteFill} contentFit="contain" />
                            <View style={[styles.label, styles.labelAfterPill, styles.labelOnImage, { bottom: badgeBottomHorizontal }]}>
                                <BaseText type="Caption1" weight="600" color="system.blue">
                                    After
                                </BaseText>
                                {pair?.afterDate ? (
                                    <BaseText type="Caption2" weight="400" color="labels.secondary" style={styles.labelDate}>
                                        {getRelativeTime(pair.afterDate)}
                                    </BaseText>
                                ) : null}
                            </View>
                        </View>
                    </View>
                )}

                {isSplitLine && <BeforeAfterSplitLine key={`split-${pairKey}`} beforeUrl={before} afterUrl={afterDisplay} beforeDate={pair?.beforeDate} afterDate={pair?.afterDate} />}

                {isSlider && <BeforeAfterSliderOpacity key={`slider-${pairKey}`} beforeUrl={before} afterUrl={afterDisplay} beforeDate={pair?.beforeDate} afterDate={pair?.afterDate} />}
            </View>

            {/* Thumbnail strip (like ImageViewerModal) – above tab bar, show even for single pair so layout is consistent */}
            {pairs.length > 0 && (
                <View style={styles.thumbnailStripWrap}>
                    <ScrollView
                        ref={thumbnailScrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={[styles.thumbnailStripContent, { width: thumbnailStripWidth }]}
                        style={styles.thumbnailStripScroll}
                        onScroll={onThumbnailScroll}
                        scrollEventThrottle={16}
                        decelerationRate="fast"
                        snapToInterval={THUMB_SLOT_WIDTH}
                        snapToAlignment="start"
                    >
                        {pairs.map((p, index) => {
                            const isActive = index === currentIndex;
                            return (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setCurrentIndex(index);
                                        scrollThumbnailToIndex(index);
                                    }}
                                    style={[styles.thumbnailSlot, { width: THUMB_SLOT_WIDTH }]}
                                    activeOpacity={0.8}
                                >
                                    <View
                                        style={[
                                            styles.thumbnailItem,
                                            {
                                                width: isActive ? ACTIVE_THUMB_WIDTH : INACTIVE_THUMB_WIDTH,
                                                marginHorizontal: isActive ? ACTIVE_MARGIN : (THUMB_SLOT_WIDTH - INACTIVE_THUMB_WIDTH) / 2,
                                                opacity: isActive ? 1 : 0.7,
                                                transform: [{ scale: isActive ? 1 : 0.95 }],
                                            },
                                        ]}
                                    >
                                        <Image source={{ uri: p.beforeUrl }} style={styles.thumbnailImage} contentFit="cover" />
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* Bottom toolbar: view mode pill only (no arrows) */}
            <View style={[styles.toolbar, { paddingBottom: insets.bottom }]}>
                <View style={styles.toolbarRow}>
                    <View style={styles.toolbarIconsPill}>
                        {VIEW_MODES.map(({ key, icon }) => (
                            <TouchableOpacity key={key} onPress={() => selectViewMode(key)} style={[styles.toolbarIcon]}>
                                <IconSymbol name={icon as any} size={key === "splitLine" ? 34 : 22} color={viewMode === key ? (colors.system.blue as any) : (colors.system.black as any)} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        </View>
    );
}

/** Split-line mode: vertical divider, left = before, right = after, draggable line with handle at bottom (Figma 12198-10455) */
function BeforeAfterSplitLine({ beforeUrl, afterUrl, beforeDate, afterDate }: { beforeUrl: string; afterUrl: string; beforeDate?: string; afterDate?: string }) {
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
                <Image key={beforeUrl} source={{ uri: beforeUrl }} style={styles.splitLineImageFull} contentFit="contain" />
            </Animated.View>

            {/* Right: after image */}
            <Animated.View style={[styles.splitLineRight, rightLeftStyle]}>
                <Animated.View style={[StyleSheet.absoluteFill, afterImageStyle]}>
                    <Image key={afterUrl} source={{ uri: afterUrl }} style={styles.splitLineImageFull} contentFit="contain" />
                </Animated.View>
            </Animated.View>

            {/* Labels in fixed overlay: light gray pill, Before=dark gray, After=blue + date */}
            <View style={styles.splitLineLabelsOverlay} pointerEvents="none">
                <Animated.View style={[styles.label, styles.labelBeforePill, styles.labelSplitLineBefore, styles.labelWithDate, beforeLabelStyle]}>
                    <BaseText type="Caption1" weight="600" color="labels.primary">
                        Before
                    </BaseText>
                    {beforeDate ? (
                        <BaseText type="Caption2" weight="400" color="labels.secondary" style={styles.labelDate}>
                            {getRelativeTime(beforeDate)}
                        </BaseText>
                    ) : null}
                </Animated.View>
                <Animated.View style={[styles.label, styles.labelAfterPill, styles.labelSplitLineAfter, styles.labelWithDate, afterLabelStyle]}>
                    <BaseText type="Caption1" weight="600" color="system.blue">
                        After
                    </BaseText>
                    {afterDate ? (
                        <BaseText type="Caption2" weight="400" color="labels.secondary" style={styles.labelDate}>
                            {getRelativeTime(afterDate)}
                        </BaseText>
                    ) : null}
                </Animated.View>
            </View>

            {/* Vertical white line + hit area (full height) */}
            <Animated.View style={[styles.splitLineDivider, dividerLineStyle]}>
                <View style={styles.splitLineDividerLine} pointerEvents="none" />
            </Animated.View>
            <Animated.View style={[styles.splitLineDividerHitArea, dividerLineStyle]} onStartShouldSetResponder={() => true} onResponderGrant={(e) => updatePosition(e.nativeEvent.pageX)} onResponderMove={(e) => updatePosition(e.nativeEvent.pageX)} />

            {/* Draggable handle: aligned with badges (same bottom) */}
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
function BeforeAfterSliderOpacity({ beforeUrl, afterUrl, beforeDate, afterDate }: { beforeUrl: string; afterUrl: string; beforeDate?: string; afterDate?: string }) {
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
            {/* Top: image area (no badges on image) */}
            <View style={styles.sliderImageArea}>
                <Image key={beforeUrl} source={{ uri: beforeUrl }} style={StyleSheet.absoluteFill} contentFit="contain" />
                <Animated.View style={[StyleSheet.absoluteFill, afterImageStyle]} pointerEvents="none">
                    <Image key={afterUrl} source={{ uri: afterUrl }} style={StyleSheet.absoluteFill} contentFit="contain" />
                </Animated.View>
            </View>

            {/* Below image: slider pill with Before/After + date */}
            <View style={styles.sliderPillWrap}>
                <View style={styles.sliderBox} onStartShouldSetResponder={() => true} onResponderGrant={(e) => updatePosition(e.nativeEvent.pageX)} onResponderMove={(e) => updatePosition(e.nativeEvent.pageX)}>
                    <View style={styles.sliderBoxLabelWrap}>
                        <BaseText type="Caption1" color="labels.primary" style={styles.sliderBoxLabel}>
                            Before
                        </BaseText>
                        {beforeDate ? (
                            <BaseText type="Caption2" weight="400" color="labels.secondary" style={styles.sliderBoxDate}>
                                {getRelativeTime(beforeDate)}
                            </BaseText>
                        ) : null}
                    </View>
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
                    <View style={styles.sliderBoxLabelWrap}>
                        <BaseText type="Caption1" weight="600" color="system.blue" style={styles.sliderBoxLabel}>
                            After
                        </BaseText>
                        {afterDate ? (
                            <BaseText type="Caption2" weight="400" color="labels.secondary" style={styles.sliderBoxDate}>
                                {getRelativeTime(afterDate)}
                            </BaseText>
                        ) : null}
                    </View>
                </View>
            </View>
        </View>
    );
}

function SliderThumb({ value, trackWidthSv }: { value: SharedValue<number>; trackWidthSv: SharedValue<number> }) {
    const THUMB_SIZE = 20;
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
        height: "94.7%",
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
        bottom: 48,
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
        bottom: 54,
        left: 12,
    },
    labelSplitLineAfter: {
        bottom: 54,
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
    labelOnImage: {
        gap: 0,
    },
    labelWithDate: {
        gap: 2,
    },
    labelDate: {
        marginTop: 2,
    },
    sliderBoxLabelWrap: {
        minWidth: 44,
        alignItems: "center",
        justifyContent: "center",
    },
    sliderBoxDate: {
        marginTop: 2,
        textAlign: "center",
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
        justifyContent: "center",
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
        flexDirection: "column",
    },
    sliderImageArea: {
        flex: 1,
        position: "relative",
        overflow: "hidden",
    },
    sliderPillWrap: {
        paddingHorizontal: 16,
        paddingTop: 8,
        backgroundColor: colors.system.gray6,
        paddingBottom: 8,
    },
    sliderBox: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 14,
        backgroundColor: colors.system.white,
        borderRadius: 999,
        gap: 20,
    },
    sliderBoxLabel: {
        minWidth: 44,
        textAlign: "center",
    },
    sliderTrackWrap: {
        flex: 1,
        height: 28,
        minWidth: 40,
        justifyContent: "center",
        position: "relative",
    },
    sliderTrackBg: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 12,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: colors.system.gray6,
    },
    sliderTrackFill: {
        position: "absolute",
        left: 0,
        top: 12,
        height: 3,
        borderRadius: 1.5,
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
        width: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    sliderThumb: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: colors.system.blue,
    },
    thumbnailStripWrap: {
        width: SCREEN_WIDTH,
        overflow: "hidden",
        marginBottom: 6,
        backgroundColor: colors.system.gray6,
    },
    thumbnailStripScroll: {
        flexGrow: 0,
    },
    thumbnailStripContent: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: THUMB_PADDING,
    },
    thumbnailSlot: {
        height: 44,
        justifyContent: "center",
        alignItems: "center",
    },
    thumbnailItem: {
        height: 44,
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: "rgba(0,0,0,0.06)",
    },
    thumbnailImage: {
        width: "100%",
        height: "100%",
    },
});
