import { BaseText } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol.ios";
import colors from "@/theme/colors";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Dimensions, LayoutChangeEvent, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { AdjustChange, ImageEditorToolProps } from "./types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MINT_COLOR = "#00c7be";
const YELLOW_COLOR = "#fc0";

// Progress Circle Component (like iOS)
interface ProgressCircleProps {
    value: number; // -100 to 100
}

const ProgressCircle: React.FC<ProgressCircleProps> = ({ value }) => {
    const size = 52;
    const strokeWidth = 2;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    // Calculate progress: -100 to 100 -> 0 to 1
    const progress = Math.abs(value) / 100;
    const strokeDashoffset = circumference * (1 - progress);

    // For iOS-like behavior:
    // Positive values: clockwise from top (normal direction)
    // Negative values: counter-clockwise from top (flip horizontally)
    const isNegative = value < 0;

    return (
        <View style={styles.progressCircleContainer}>
            {/* Background circle - always normal */}
            <Svg width={size} height={size} style={styles.progressSvg}>
                <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.labels.quaternary} strokeWidth={strokeWidth} fill="transparent" />
            </Svg>
            {/* Progress circle - can be flipped for counter-clockwise */}
            <Svg width={size} height={size} style={[styles.progressSvg, { transform: isNegative ? [{ scaleX: -1 }] : [] }]}>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={YELLOW_COLOR}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    // Start from top (12 o'clock) by rotating -90 degrees
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </Svg>
        </View>
    );
};

interface AdjustmentOption {
    id: string;
    name: string;
    icon: string;
    value: number;
    min: number;
    max: number;
    defaultValue: number;
}

const ADJUSTMENT_OPTIONS: AdjustmentOption[] = [
    { id: "exposure", name: "EXPOSURE", icon: "sun.max.fill", value: 0, min: -100, max: 100, defaultValue: 0 },
    { id: "brightness", name: "BRIGHTNESS", icon: "sun.max.fill", value: 0, min: -100, max: 100, defaultValue: 0 },
    { id: "contrast", name: "CONTRAST", icon: "circle.lefthalf.filled", value: 0, min: -100, max: 100, defaultValue: 0 },
    { id: "saturation", name: "SATURATION", icon: "circle.lefthalf.filled", value: 0, min: -100, max: 100, defaultValue: 0 },
    { id: "warmth", name: "WARMTH", icon: "thermometer.sun.fill", value: 0, min: -100, max: 100, defaultValue: 0 },
    { id: "highlights", name: "HIGHLIGHTS", icon: "circle.lefthalf.filled", value: 0, min: -100, max: 100, defaultValue: 0 },
    { id: "shadows", name: "SHADOWS", icon: "circle.lefthalf.filled", value: 0, min: -100, max: 100, defaultValue: 0 },
];

export const ToolAdjust: React.FC<ImageEditorToolProps> = ({ onChange, onCancel }) => {
    const [selectedAdjustment, setSelectedAdjustment] = useState<string>("exposure");
    const [adjustmentValues, setAdjustmentValues] = useState<Record<string, number>>(() => {
        const initial: Record<string, number> = {};
        ADJUSTMENT_OPTIONS.forEach((opt) => {
            initial[opt.id] = opt.defaultValue;
        });
        return initial;
    });
    const [sliderWidth, setSliderWidth] = useState(0);
    const sliderX = useSharedValue(0);
    const scrollViewRef = React.useRef<ScrollView>(null);
    const buttonLayouts = React.useRef<Record<string, { x: number; width: number }>>({});
    const scrollX = useSharedValue(0);
    const isScrolling = React.useRef(false);

    const currentAdjustment = ADJUSTMENT_OPTIONS.find((opt) => opt.id === selectedAdjustment);
    const currentValue = adjustmentValues[selectedAdjustment] || 0;

    // Update slider position when adjustment changes
    React.useEffect(() => {
        if (sliderWidth > 0 && currentAdjustment) {
            const range = currentAdjustment.max - currentAdjustment.min;
            const percentage = (currentValue - currentAdjustment.min) / range;
            sliderX.value = percentage * sliderWidth;
        }
    }, [selectedAdjustment, sliderWidth, currentValue]);

    const handleAdjustmentSelect = (id: string) => {
        Haptics.selectionAsync();
        setSelectedAdjustment(id);

        // Scroll to center the selected item
        const layout = buttonLayouts.current[id];
        if (layout && scrollViewRef.current) {
            const screenWidth = Dimensions.get("window").width;
            // Add offset to shift item left for better centering
            const scrollToX = layout.x - screenWidth / 2 + layout.width / 2 - 20;
            isScrolling.current = true;
            scrollViewRef.current.scrollTo({ x: Math.max(0, scrollToX), animated: true });
            setTimeout(() => {
                isScrolling.current = false;
            }, 300);
        }
    };

    const handleScroll = (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        scrollX.value = offsetX;

        if (isScrolling.current) return;

        const screenWidth = Dimensions.get("window").width;
        // Shift center point slightly left for better alignment
        const centerX = offsetX + screenWidth / 2 - 12;

        // Find the item closest to center
        let closestId: string | null = null;
        let minDistance = Infinity;

        ADJUSTMENT_OPTIONS.forEach((option) => {
            const layout = buttonLayouts.current[option.id];
            if (layout) {
                const itemCenterX = layout.x + layout.width / 2;
                const distance = Math.abs(centerX - itemCenterX);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestId = option.id;
                }
            }
        });

        if (closestId && closestId !== selectedAdjustment) {
            setSelectedAdjustment(closestId);
        }
    };

    const handleMomentumScrollEnd = (event: any) => {
        // Snap to center when scroll ends
        const screenWidth = Dimensions.get("window").width;
        const currentScrollX = event.nativeEvent.contentOffset.x;
        const centerX = currentScrollX + screenWidth / 2 - 12;

        let closestId: string | null = null;
        let minDistance = Infinity;
        let closestX = 0;
        let closestWidth = 0;

        ADJUSTMENT_OPTIONS.forEach((option) => {
            const layout = buttonLayouts.current[option.id];
            if (layout) {
                const itemCenterX = layout.x + layout.width / 2;
                const distance = Math.abs(centerX - itemCenterX);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestId = option.id;
                    closestX = layout.x;
                    closestWidth = layout.width;
                }
            }
        });

        if (closestId && scrollViewRef.current) {
            setSelectedAdjustment(closestId);
            // Add offset to shift item left for better centering
            const scrollToX = closestX - screenWidth / 2 + closestWidth / 2 - 20;
            scrollViewRef.current.scrollTo({ x: Math.max(0, scrollToX), animated: true });
        }
    };

    const handleValueChange = (value: number) => {
        const newValues = { ...adjustmentValues, [selectedAdjustment]: value };
        setAdjustmentValues(newValues);

        // Convert to AdjustChange format
        const adjustChange: AdjustChange = {
            brightness: newValues.brightness,
            contrast: newValues.contrast,
            saturation: newValues.saturation,
            warmth: newValues.warmth,
            highlights: newValues.highlights,
            shadows: newValues.shadows,
        };

        // Map exposure to brightness for now (or handle separately)
        if (newValues.exposure !== undefined) {
            adjustChange.brightness = newValues.exposure;
        }

        onChange({
            type: "adjust",
            data: adjustChange,
        });
    };

    const triggerHaptic = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const lastHapticValue = React.useRef<number | null>(null);

    const updateValueFromPosition = (x: number) => {
        if (!currentAdjustment || sliderWidth === 0) return;
        const percentage = Math.max(0, Math.min(1, x / sliderWidth));
        const range = currentAdjustment.max - currentAdjustment.min;
        const newValue = Math.round(currentAdjustment.min + percentage * range);

        // Haptic feedback when value changes (like Apple's slider)
        if (newValue !== currentValue) {
            // Haptic feedback on every value change (like Apple's native slider)
            // Only trigger if value actually changed from last haptic
            if (lastHapticValue.current === null || newValue !== lastHapticValue.current) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                lastHapticValue.current = newValue;
            }

            handleValueChange(newValue);
        }
    };

    const panStartX = useSharedValue(0);
    const panGesture = Gesture.Pan()
        .onStart((e) => {
            panStartX.value = sliderX.value;
            runOnJS(triggerHaptic)();
            // Reset haptic tracking when starting new gesture
            lastHapticValue.current = null;
        })
        .onUpdate((e) => {
            if (sliderWidth > 0) {
                const newX = Math.max(0, Math.min(sliderWidth, panStartX.value + e.translationX));
                sliderX.value = newX;
                runOnJS(updateValueFromPosition)(newX);
            }
        })
        .onEnd(() => {
            // Snap to nearest value
            if (sliderWidth > 0 && currentAdjustment) {
                const percentage = sliderX.value / sliderWidth;
                const range = currentAdjustment.max - currentAdjustment.min;
                const newValue = Math.round(currentAdjustment.min + percentage * range);
                const finalPercentage = (newValue - currentAdjustment.min) / range;
                sliderX.value = withSpring(finalPercentage * sliderWidth);
            }
        });

    const onSliderLayout = (event: LayoutChangeEvent) => {
        const { width } = event.nativeEvent.layout;
        setSliderWidth(width);
        if (currentAdjustment) {
            const range = currentAdjustment.max - currentAdjustment.min;
            const percentage = (currentValue - currentAdjustment.min) / range;
            sliderX.value = percentage * width;
        }
    };

    const sliderThumbStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: sliderX.value }],
        };
    });

    const sliderFillStyle = useAnimatedStyle(() => {
        return {
            width: sliderX.value,
        };
    });

    const handleReset = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const resetValues: Record<string, number> = {};
        ADJUSTMENT_OPTIONS.forEach((opt) => {
            resetValues[opt.id] = opt.defaultValue;
        });
        setAdjustmentValues(resetValues);
        setSelectedAdjustment("exposure");

        onChange({
            type: "adjust",
            data: {
                brightness: 0,
                contrast: 0,
                saturation: 0,
                warmth: 0,
                highlights: 0,
                shadows: 0,
            },
        });
    };

    const formatValue = (value: number): string => {
        if (value === 0) return "";
        return value > 0 ? `+${value}` : `${value}`;
    };

    return (
        <View style={styles.container}>
            {/* Adjustment Buttons Row */}
            <View style={styles.buttonsContainer}>
                <ScrollView ref={scrollViewRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.buttonsScrollContent} style={styles.buttonsScroll} onScroll={handleScroll} scrollEventThrottle={16} onMomentumScrollEnd={handleMomentumScrollEnd} decelerationRate="fast">
                    {ADJUSTMENT_OPTIONS.map((option) => {
                        const isSelected = selectedAdjustment === option.id;
                        const value = adjustmentValues[option.id] || 0;
                        const hasValue = value !== 0;

                        return (
                            <View
                                key={option.id}
                                style={styles.buttonWrapper}
                                onLayout={(event) => {
                                    const { x, width } = event.nativeEvent.layout;
                                    buttonLayouts.current[option.id] = { x, width };
                                }}
                            >
                                <TouchableOpacity onPress={() => handleAdjustmentSelect(option.id)} style={[styles.adjustmentButton, isSelected && hasValue && styles.adjustmentButtonActive, isSelected && !hasValue && styles.adjustmentButtonSelected]} activeOpacity={0.8}>
                                    {hasValue && isSelected ? (
                                        <BaseText type="Callout" weight={400} style={[styles.buttonValueText, { color: isSelected && hasValue ? YELLOW_COLOR : colors.labels.primary }]}>
                                            {formatValue(value)}
                                        </BaseText>
                                    ) : (
                                        <IconSymbol name={option.icon as any} size={20} color={isSelected ? colors.labels.primary : colors.labels.secondary} />
                                    )}
                                </TouchableOpacity>
                                {isSelected && hasValue && (
                                    <View style={styles.activeIndicator}>
                                        <ProgressCircle value={value} />
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Label and Slider Container */}
            <View style={styles.sliderSectionContainer}>
                {/* Label */}
                <View style={styles.labelContainer}>
                    <BaseText type="Subhead" weight="600" color="labels.primary" style={styles.labelText}>
                        {currentAdjustment?.name || "EXPOSURE"}
                    </BaseText>
                </View>

                {/* Slider with Ruler */}
                <View style={styles.sliderWrapper} onLayout={onSliderLayout}>
                    <GestureDetector gesture={panGesture}>
                        <View style={styles.sliderContainer}>
                            {/* Ruler with tick marks - Top layer (15px height) */}
                            <View style={styles.rulerContainer}>
                                <View style={styles.rulerTrack}>
                                    {Array.from({ length: 21 }, (_, i) => {
                                        const position = (i / 20) * 100;
                                        const isMajorTick = i % 5 === 0;
                                        const currentPercentage = sliderWidth > 0 ? (currentValue - (currentAdjustment?.min || -100)) / ((currentAdjustment?.max || 100) - (currentAdjustment?.min || -100)) : 0.5;
                                        const thumbPosition = currentPercentage * 100;
                                        const isAtPosition = Math.abs(position - thumbPosition) < 2.5;
                                        const isCenter = i === 10; // Center position (0 value)

                                        return (
                                            <View key={i} style={[styles.tickMark, isMajorTick && styles.majorTickMark, { left: `${position}%` }]}>
                                                {isAtPosition && <View style={styles.verticalLine} />}
                                            </View>
                                        );
                                    })}
                                </View>
                                {/* Bottom layer (10.2px height) with center dot */}
                                <View style={styles.rulerBottomLayer}>
                                    {Array.from({ length: 21 }, (_, i) => {
                                        const position = (i / 20) * 100;
                                        const currentPercentage = sliderWidth > 0 ? (currentValue - (currentAdjustment?.min || -100)) / ((currentAdjustment?.max || 100) - (currentAdjustment?.min || -100)) : 0.5;
                                        const thumbPosition = currentPercentage * 100;
                                        const isAtPosition = Math.abs(position - thumbPosition) < 2.5;
                                        const isCenter = i === 10; // Center position (0 value)

                                        return (
                                            <View key={`bottom-${i}`} style={{ position: "absolute", left: `${position}%`, marginLeft: -1.5 }}>
                                                {isCenter && !isAtPosition && <View style={styles.centerDot} />}
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        </View>
                    </GestureDetector>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        gap: 16,
    },
    buttonsContainer: {
        height: 52,
        position: "relative",
    },
    buttonsScroll: {
        flex: 1,
    },
    buttonsScrollContent: {
        paddingHorizontal: Dimensions.get("window").width / 2 - 26, // Center first item (half screen - half button width)
        gap: 0, // Gap handled by marginHorizontal in buttonWrapper
        alignItems: "flex-start",
    },
    buttonWrapper: {
        width: 52,
        height: 52,
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: 10, // Space between buttons
    },
    adjustmentButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 2,
        borderColor: "#b2b2b2",
        backgroundColor: colors.system.white,
        alignItems: "center",
        justifyContent: "center",
    },
    adjustmentButtonSelected: {
        borderColor: colors.labels.primary,
    },
    adjustmentButtonActive: {
        borderColor: "rgba(255, 204, 0, 0.2)",
        borderWidth: 2,
    },
    buttonValueText: {
        fontSize: 16,
        lineHeight: 21,
        letterSpacing: -0.31,
    },
    activeIndicator: {
        position: "absolute",
        width: 52,
        height: 52,
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
    },
    progressCircleContainer: {
        width: 52,
        height: 52,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
    },
    progressSvg: {
        position: "absolute",
        top: 0,
        left: 0,
    },
    sliderSectionContainer: {
        gap: 8,
        alignItems: "center",
    },
    labelContainer: {
        backgroundColor: colors.system.white,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginBottom: 8,
    },
    labelText: {
        fontSize: 15,
        lineHeight: 20,
        letterSpacing: -0.23,
    },
    sliderWrapper: {
        width: "100%",
        paddingHorizontal: 20,
    },
    sliderContainer: {
        width: "100%",
        position: "relative",
    },
    rulerContainer: {
        height: 25.2,
        marginBottom: 0,
        position: "relative",
        width: "100%",
    },
    rulerTrack: {
        height: 15,
        position: "relative",
        width: "100%",
        top: 0.44,
    },
    rulerBottomLayer: {
        height: 10.2,
        position: "absolute",
        width: "100%",
        top: 15,
    },
    tickMark: {
        position: "absolute",
        width: 1,
        height: 15,
        backgroundColor: colors.labels.quaternary,
        top: 0,
        marginLeft: -0.5,
    },
    majorTickMark: {
        height: 15,
        backgroundColor: colors.labels.secondary,
    },
    verticalLine: {
        position: "absolute",
        width: 1,
        height: 25.2,
        backgroundColor: colors.labels.primary,
        top: -4, // Start from rulerTrack position, then extend to align with thumb
        left: "50%",
        marginLeft: -0.5,
    },
    centerDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: colors.labels.primary,
        top: 0,
    },
    sliderTrack: {
        height: 10.2,
        position: "relative",
        width: "100%",
    },
    sliderTrackBackground: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: colors.system.gray5,
        borderRadius: 5,
    },
    sliderTrackFill: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: YELLOW_COLOR,
        borderRadius: 5,
        opacity: 0.3,
    },
    sliderThumb: {
        position: "absolute",
        width: 10.2,
        height: 10.2,
        borderRadius: 5.1,
        backgroundColor: colors.labels.primary,
        top: 0,
        marginLeft: -5.1,
        zIndex: 10,
    },
    resetButton: {
        backgroundColor: "rgba(120, 120, 128, 0.12)",
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        marginTop: 8,
    },
});
