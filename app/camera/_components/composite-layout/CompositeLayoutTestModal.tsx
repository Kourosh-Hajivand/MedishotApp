import { BaseText } from "@/components";
import colors from "@/theme/colors";
import { Image } from "expo-image";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Dimensions, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { LayoutPattern } from "../create-template/types";
import { CompositeLayout, getCompositeLayoutStyle, GhostItemData } from "./index";

const { width } = Dimensions.get("window");

// List of all layout patterns
const ALL_LAYOUT_PATTERNS: LayoutPattern[] = [
    "left-right",
    "top-bottom",
    "left-tall",
    "top-wide",
    "right-tall",
    "top-two",
    "grid-2x2",
    "grid-2x2-alt",
    "grid-2x2-vertical",
    "grid-2x3",
    "grid-2x3-alt",
    "grid-2x3-horizontal",
    "grid-3x2",
    "grid-3x3",
    "grid-3x3-alt",
    "grid-3x3-horizontal",
    "grid-4x2",
    "grid-2x4",
    "grid-3x3-full",
    "grid-3x3-full-alt",
    "grid-3x3-full-horizontal",
];

// Get compatible layouts for a given photo count
const getCompatibleLayouts = (photoCount: number): LayoutPattern[] => {
    switch (photoCount) {
        case 1:
            // All layouts support 1 photo (default case)
            return ALL_LAYOUT_PATTERNS;
        case 2:
            // Layouts that work well with 2 photos
            return ["left-right", "top-bottom"];
        case 3:
            // Layouts designed for 3 photos
            return ["left-tall", "top-wide", "right-tall", "top-two"];
        case 4:
            // Layouts designed for 4 photos
            return ["grid-2x2", "grid-2x2-alt", "grid-2x2-vertical"];
        case 5:
            // Layouts designed for 5 photos
            return ["grid-2x3-alt", "grid-2x3-horizontal"];
        case 6:
            // Layouts designed for 6 photos
            return ["grid-2x3", "grid-3x2"];
        case 7:
            // No specific layout for 7, but can use 9-photo layouts
            return ["grid-3x3", "grid-3x3-alt", "grid-3x3-horizontal", "grid-3x3-full", "grid-3x3-full-alt", "grid-3x3-full-horizontal"];
        case 8:
            // Layouts designed for 8 photos
            return ["grid-2x4", "grid-4x2"];
        case 9:
            // Layouts designed for 9 photos
            return ["grid-3x3", "grid-3x3-alt", "grid-3x3-horizontal", "grid-3x3-full", "grid-3x3-full-alt", "grid-3x3-full-horizontal"];
        default:
            return ALL_LAYOUT_PATTERNS;
    }
};

// Test images - using different colored squares for better visibility
const TEST_IMAGES = [
    "https://picsum.photos/seed/1/300/450",
    "https://picsum.photos/seed/2/300/450",
    "https://picsum.photos/seed/3/300/450",
    "https://picsum.photos/seed/4/300/450",
    "https://picsum.photos/seed/5/300/450",
    "https://picsum.photos/seed/6/300/450",
    "https://picsum.photos/seed/7/300/450",
    "https://picsum.photos/seed/8/300/450",
    "https://picsum.photos/seed/9/300/450",
];

interface CompositeLayoutTestModalProps {
    visible: boolean;
    onClose: () => void;
}

export const CompositeLayoutTestModal: React.FC<CompositeLayoutTestModalProps> = ({ visible, onClose }) => {
    const [selectedLayout, setSelectedLayout] = useState<LayoutPattern>("grid-2x2");
    const [photoCount, setPhotoCount] = useState(4);
    const [containerWidth, setContainerWidth] = useState(width);
    const [padding, setPadding] = useState(10);
    const [gap, setGap] = useState(10);
    const [showDebugLabels, setShowDebugLabels] = useState(true);

    // Create ghost items and photos based on selected count
    const ghostItems: GhostItemData[] = useMemo(() => {
        return Array.from({ length: photoCount }, (_, i) => ({
            gostId: `ghost-${i + 1}`,
            imageUrl: null,
            rowIndex: Math.floor(i / 2),
            columnIndex: i % 2,
        }));
    }, [photoCount]);

    const testPhotos = useMemo(() => {
        return Array.from({ length: photoCount }, (_, i) => ({
            id: `photo-${i + 1}`,
            uri: TEST_IMAGES[i % TEST_IMAGES.length],
            templateId: `ghost-${i + 1}`,
        }));
    }, [photoCount]);

    const handleLayoutChange = (layout: LayoutPattern) => {
        setSelectedLayout(layout);
    };

    const handlePhotoCountChange = (count: number) => {
        const newCount = Math.max(1, Math.min(9, count));
        setPhotoCount(newCount);
        
        // Filter layouts based on photo count
        const compatibleLayouts = getCompatibleLayouts(newCount);
        
        // If current selected layout is not compatible, select the first compatible one
        if (!compatibleLayouts.includes(selectedLayout)) {
            setSelectedLayout(compatibleLayouts[0] || "grid-2x2");
        }
    };

    // Get filtered layouts based on photo count
    const filteredLayouts = useMemo(() => {
        return getCompatibleLayouts(photoCount);
    }, [photoCount]);

    // Update selected layout if it's not compatible with current photo count
    useEffect(() => {
        if (!filteredLayouts.includes(selectedLayout) && filteredLayouts.length > 0) {
            setSelectedLayout(filteredLayouts[0]);
        }
    }, [photoCount, filteredLayouts, selectedLayout]);

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <BaseText type="Title1" weight={700} color="labels.primary">
                        Composite Layout Test
                    </BaseText>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <BaseText type="Body" weight={600} color="system.blue">
                            Close
                        </BaseText>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                    {/* Preview Section */}
                    <View style={styles.previewSection}>
                        <BaseText type="Headline" weight={600} color="labels.primary" style={styles.sectionTitle}>
                            Preview
                        </BaseText>
                        <View style={styles.previewContainer}>
                            <View style={[styles.compositeWrapper, { width: containerWidth, height: containerWidth }]}>
                                <CompositeLayout
                                    ghostItems={ghostItems}
                                    photos={testPhotos}
                                    layoutPattern={selectedLayout}
                                    containerWidth={containerWidth}
                                    padding={padding}
                                    gap={gap}
                                    showDebugLabels={showDebugLabels}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Layout Selection */}
                    <View style={styles.section}>
                        <BaseText type="Headline" weight={600} color="labels.primary" style={styles.sectionTitle}>
                            Select Layout
                        </BaseText>
                        <View style={styles.layoutGrid}>
                            {filteredLayouts.length > 0 ? (
                                filteredLayouts.map((layout) => (
                                    <TouchableOpacity
                                        key={layout}
                                        style={[styles.layoutButton, selectedLayout === layout && styles.layoutButtonActive]}
                                        onPress={() => handleLayoutChange(layout)}
                                    >
                                        <BaseText type="Caption1" weight={selectedLayout === layout ? 600 : 400} color={selectedLayout === layout ? "system.white" : "labels.primary"}>
                                            {layout}
                                        </BaseText>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <BaseText type="Body" color="labels.secondary">
                                    No compatible layouts for {photoCount} photo{photoCount > 1 ? "s" : ""}
                                </BaseText>
                            )}
                        </View>
                    </View>

                    {/* Photo Count */}
                    <View style={styles.section}>
                        <BaseText type="Headline" weight={600} color="labels.primary" style={styles.sectionTitle}>
                            Photo Count: {photoCount}
                        </BaseText>
                        <View style={styles.countButtons}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((count) => (
                                <TouchableOpacity
                                    key={count}
                                    style={[styles.countButton, photoCount === count && styles.countButtonActive]}
                                    onPress={() => handlePhotoCountChange(count)}
                                >
                                    <BaseText type="Body" weight={photoCount === count ? 600 : 400} color={photoCount === count ? "system.white" : "labels.primary"}>
                                        {count}
                                    </BaseText>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Style Options */}
                    <View style={styles.section}>
                        <BaseText type="Headline" weight={600} color="labels.primary" style={styles.sectionTitle}>
                            Style Settings
                        </BaseText>

                        {/* Container Width */}
                        <View style={styles.optionRow}>
                            <BaseText type="Body" color="labels.secondary">
                                Container Width: {containerWidth}px
                            </BaseText>
                            <View style={styles.sliderContainer}>
                                <TouchableOpacity
                                    style={styles.sliderButton}
                                    onPress={() => setContainerWidth(Math.max(200, containerWidth - 50))}
                                >
                                    <BaseText>-</BaseText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.sliderButton}
                                    onPress={() => setContainerWidth(Math.min(500, containerWidth + 50))}
                                >
                                    <BaseText>+</BaseText>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Padding */}
                        <View style={styles.optionRow}>
                            <BaseText type="Body" color="labels.secondary">
                                Padding: {padding}px
                            </BaseText>
                            <View style={styles.sliderContainer}>
                                <TouchableOpacity style={styles.sliderButton} onPress={() => setPadding(Math.max(0, padding - 5))}>
                                    <BaseText>-</BaseText>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.sliderButton} onPress={() => setPadding(Math.min(50, padding + 5))}>
                                    <BaseText>+</BaseText>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Gap */}
                        <View style={styles.optionRow}>
                            <BaseText type="Body" color="labels.secondary">
                                Gap: {gap}px
                            </BaseText>
                            <View style={styles.sliderContainer}>
                                <TouchableOpacity style={styles.sliderButton} onPress={() => setGap(Math.max(0, gap - 5))}>
                                    <BaseText>-</BaseText>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.sliderButton} onPress={() => setGap(Math.min(50, gap + 5))}>
                                    <BaseText>+</BaseText>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Debug Labels */}
                        <TouchableOpacity style={styles.toggleRow} onPress={() => setShowDebugLabels(!showDebugLabels)}>
                            <BaseText type="Body" color="labels.secondary">
                                Show Debug Labels
                            </BaseText>
                            <View style={[styles.toggle, showDebugLabels && styles.toggleActive]}>
                                {showDebugLabels && <View style={styles.toggleDot} />}
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Layout Info */}
                    <View style={styles.section}>
                        <BaseText type="Headline" weight={600} color="labels.primary" style={styles.sectionTitle}>
                            Layout Info
                        </BaseText>
                        <View style={styles.infoContainer}>
                            <BaseText type="Caption1" color="labels.secondary">
                                Pattern: {selectedLayout}
                            </BaseText>
                            <BaseText type="Caption1" color="labels.secondary">
                                Photos: {photoCount}
                            </BaseText>
                            <BaseText type="Caption1" color="labels.secondary">
                                Container: {containerWidth}x{containerWidth}px
                            </BaseText>
                            <BaseText type="Caption1" color="labels.secondary">
                                Padding: {padding}px | Gap: {gap}px
                            </BaseText>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.system.white,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    closeButton: {
        padding: 8,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    previewSection: {
        marginBottom: 32,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        marginBottom: 16,
    },
    previewContainer: {
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.system.gray6,
        borderRadius: 16,
        padding: 20,
        minHeight: 400,
    },
    compositeWrapper: {
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: colors.system.white,
    },
    layoutGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    layoutButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: colors.system.gray6,
        borderWidth: 1,
        borderColor: colors.border,
    },
    layoutButtonActive: {
        backgroundColor: colors.system.blue,
        borderColor: colors.system.blue,
    },
    countButtons: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    countButton: {
        width: 50,
        height: 50,
        borderRadius: 8,
        backgroundColor: colors.system.gray6,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
        justifyContent: "center",
    },
    countButtonActive: {
        backgroundColor: colors.system.blue,
        borderColor: colors.system.blue,
    },
    optionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    sliderContainer: {
        flexDirection: "row",
        gap: 8,
    },
    sliderButton: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: colors.system.gray6,
        alignItems: "center",
        justifyContent: "center",
    },
    toggleRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
    },
    toggle: {
        width: 50,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.system.gray4,
        justifyContent: "center",
        paddingHorizontal: 2,
    },
    toggleActive: {
        backgroundColor: colors.system.blue,
    },
    toggleDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.system.white,
        alignSelf: "flex-end",
    },
    infoContainer: {
        backgroundColor: colors.system.gray6,
        padding: 16,
        borderRadius: 8,
        gap: 8,
    },
});
