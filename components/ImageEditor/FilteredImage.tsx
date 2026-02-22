/**
 * FilteredImage Component
 * 
 * This component provides better image filtering using WebView with CSS filters
 * for real-time preview. This is more accurate than overlay-based approaches.
 * 
 * Alternative: Use react-native-image-filter-kit for native performance
 * (requires: npm install react-native-image-filter-kit)
 */

import { AdjustChange } from "./types";
import type { ImageContentFit } from "expo-image";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

interface FilteredImageProps {
    source: { uri: string };
    style?: any;
    adjustments: AdjustChange | null;
    contentFit?: ImageContentFit;
    onLoad?: (event: { width: number; height: number }) => void;
}

export const FilteredImage: React.FC<FilteredImageProps> = ({ source, style, adjustments, contentFit = "contain", onLoad }) => {
    // For now, use overlay approach (current implementation)
    // TODO: Consider using react-native-image-filter-kit for better performance
    // or WebView with CSS filters for more accurate results

    const handleLoad = (event: any) => {
        if (onLoad) {
            let imgWidth = 0;
            let imgHeight = 0;

            if (event?.source?.width && event?.source?.height) {
                imgWidth = event.source.width;
                imgHeight = event.source.height;
            } else if (event?.nativeEvent?.source?.width && event?.nativeEvent?.source?.height) {
                imgWidth = event.nativeEvent.source.width;
                imgHeight = event.nativeEvent.source.height;
            }

            if (imgWidth && imgHeight) {
                onLoad({ width: imgWidth, height: imgHeight });
            }
        }
    };

    return (
        <View style={[styles.container, style]}>
            <Image source={source} style={StyleSheet.absoluteFill} contentFit={contentFit} onLoad={handleLoad} />
            {adjustments && (
                <>
                    {/* Exposure + Brightness (هر دو روی روشنایی اثر می‌ذارن) */}
                    {(() => {
                        const exposure = adjustments.exposure ?? 0;
                        const brightness = adjustments.brightness ?? 0;
                        const combined = exposure + brightness;
                        if (combined === 0) return null;
                        return (
                            <View
                                style={[
                                    StyleSheet.absoluteFill,
                                    {
                                        backgroundColor: combined > 0 ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)",
                                        opacity: Math.abs(combined) / 200,
                                    },
                                ]}
                            />
                        );
                    })()}
                    {/* Contrast */}
                    {adjustments.contrast !== undefined && adjustments.contrast !== 0 && (
                        <LinearGradient
                            colors={
                                adjustments.contrast > 0
                                    ? ["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.4)", "rgba(0, 0, 0, 0)"]
                                    : ["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 0.4)", "rgba(255, 255, 255, 0)"]
                            }
                            locations={[0, 0.5, 1]}
                            style={[
                                StyleSheet.absoluteFill,
                                {
                                    opacity: Math.abs(adjustments.contrast) / 200,
                                },
                            ]}
                        />
                    )}
                    {/* Saturation */}
                    {adjustments.saturation !== undefined && adjustments.saturation !== 0 && (
                        <View
                            style={[
                                StyleSheet.absoluteFill,
                                {
                                    backgroundColor: adjustments.saturation < 0 ? "rgba(128, 128, 128, 0.3)" : "transparent",
                                    opacity: adjustments.saturation < 0 ? Math.abs(adjustments.saturation) / 200 : 0,
                                },
                            ]}
                        />
                    )}
                    {/* Warmth */}
                    {adjustments.warmth !== undefined && adjustments.warmth !== 0 && (
                        <LinearGradient
                            colors={
                                adjustments.warmth > 0
                                    ? ["rgba(255, 200, 0, 0)", "rgba(255, 200, 0, 0.2)", "rgba(255, 200, 0, 0)"]
                                    : ["rgba(0, 150, 255, 0)", "rgba(0, 150, 255, 0.2)", "rgba(0, 150, 255, 0)"]
                            }
                            locations={[0, 0.5, 1]}
                            style={[
                                StyleSheet.absoluteFill,
                                {
                                    opacity: Math.abs(adjustments.warmth) / 200,
                                },
                            ]}
                        />
                    )}
                    {/* Highlights */}
                    {adjustments.highlights !== undefined && adjustments.highlights !== 0 && (
                        <LinearGradient
                            colors={["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 0.3)"]}
                            locations={[0, 1]}
                            style={[
                                StyleSheet.absoluteFill,
                                {
                                    opacity: Math.abs(adjustments.highlights) / 200,
                                },
                            ]}
                        />
                    )}
                    {/* Shadows */}
                    {adjustments.shadows !== undefined && adjustments.shadows !== 0 && (
                        <LinearGradient
                            colors={["rgba(0, 0, 0, 0.3)", "rgba(0, 0, 0, 0)"]}
                            locations={[0, 1]}
                            style={[
                                StyleSheet.absoluteFill,
                                {
                                    opacity: Math.abs(adjustments.shadows) / 200,
                                },
                            ]}
                        />
                    )}
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
    },
});

