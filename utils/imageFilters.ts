/**
 * Image filter utilities using CSS-like filters via react-native-svg
 * This provides better performance and accuracy than overlay-based approaches
 */

import { AdjustChange } from "@/components/ImageEditor/types";

/**
 * Converts adjustment values to CSS filter string
 * This can be used with WebView or other components that support CSS filters
 */
export function adjustmentsToCSSFilter(adjustments: AdjustChange | null): string {
    if (!adjustments) return "";

    const filters: string[] = [];

    // Brightness: -100 to 100 -> 0% to 200%
    if (adjustments.brightness !== undefined && adjustments.brightness !== 0) {
        const brightness = 1 + adjustments.brightness / 100;
        filters.push(`brightness(${brightness})`);
    }

    // Contrast: -100 to 100 -> 0% to 200%
    if (adjustments.contrast !== undefined && adjustments.contrast !== 0) {
        const contrast = 1 + adjustments.contrast / 100;
        filters.push(`contrast(${contrast})`);
    }

    // Saturation: -100 to 100 -> 0% to 200%
    if (adjustments.saturation !== undefined && adjustments.saturation !== 0) {
        const saturation = 1 + adjustments.saturation / 100;
        filters.push(`saturate(${saturation})`);
    }

    // Warmth: -100 (cool/blue) to 100 (warm/orange)
    // Using sepia and hue-rotate to simulate warmth
    if (adjustments.warmth !== undefined && adjustments.warmth !== 0) {
        const warmth = adjustments.warmth / 100;
        // Positive warmth = more orange/red (hue-rotate negative)
        // Negative warmth = more blue (hue-rotate positive)
        const hueRotate = -warmth * 30; // Max 30 degrees rotation
        filters.push(`hue-rotate(${hueRotate}deg)`);
        if (warmth > 0) {
            filters.push(`sepia(${Math.abs(warmth) * 0.3})`);
        }
    }

    return filters.join(" ");
}

/**
 * Applies adjustments using overlay-based approach (current implementation)
 * Returns overlay configuration for each adjustment
 */
export function getAdjustmentOverlays(adjustments: AdjustChange | null) {
    if (!adjustments) return [];

    const overlays: Array<{
        type: "brightness" | "contrast" | "saturation" | "warmth" | "highlights" | "shadows";
        config: any;
    }> = [];

    // Brightness
    if (adjustments.brightness !== undefined && adjustments.brightness !== 0) {
        overlays.push({
            type: "brightness",
            config: {
                backgroundColor: adjustments.brightness > 0 ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)",
                opacity: Math.abs(adjustments.brightness) / 200,
            },
        });
    }

    // Contrast
    if (adjustments.contrast !== undefined && adjustments.contrast !== 0) {
        overlays.push({
            type: "contrast",
            config: {
                colors:
                    adjustments.contrast > 0
                        ? ["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.4)", "rgba(0, 0, 0, 0)"]
                        : ["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 0.4)", "rgba(255, 255, 255, 0)"],
                locations: [0, 0.5, 1],
                opacity: Math.abs(adjustments.contrast) / 200,
            },
        });
    }

    // Saturation
    if (adjustments.saturation !== undefined && adjustments.saturation !== 0) {
        overlays.push({
            type: "saturation",
            config: {
                backgroundColor: adjustments.saturation < 0 ? "rgba(128, 128, 128, 0.3)" : "transparent",
                opacity: adjustments.saturation < 0 ? Math.abs(adjustments.saturation) / 200 : 0,
            },
        });
    }

    // Warmth
    if (adjustments.warmth !== undefined && adjustments.warmth !== 0) {
        overlays.push({
            type: "warmth",
            config: {
                colors:
                    adjustments.warmth > 0
                        ? ["rgba(255, 200, 0, 0)", "rgba(255, 200, 0, 0.2)", "rgba(255, 200, 0, 0)"]
                        : ["rgba(0, 150, 255, 0)", "rgba(0, 150, 255, 0.2)", "rgba(0, 150, 255, 0)"],
                locations: [0, 0.5, 1],
                opacity: Math.abs(adjustments.warmth) / 200,
            },
        });
    }

    // Highlights
    if (adjustments.highlights !== undefined && adjustments.highlights !== 0) {
        overlays.push({
            type: "highlights",
            config: {
                colors: ["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 0.3)"],
                locations: [0, 1],
                opacity: Math.abs(adjustments.highlights) / 200,
            },
        });
    }

    // Shadows
    if (adjustments.shadows !== undefined && adjustments.shadows !== 0) {
        overlays.push({
            type: "shadows",
            config: {
                colors: ["rgba(0, 0, 0, 0.3)", "rgba(0, 0, 0, 0)"],
                locations: [0, 1],
                opacity: Math.abs(adjustments.shadows) / 200,
            },
        });
    }

    return overlays;
}




