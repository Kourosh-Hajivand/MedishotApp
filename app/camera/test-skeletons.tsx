import { BaseText } from "@/components";
import { ImageSkeleton } from "@/components/skeleton/ImageSkeleton";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { router } from "expo-router";
import React, { useState } from "react";
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PreviewCanvas } from "./_components/create-template/PreviewCanvas";
import { LayoutPattern, TemplateItem } from "./_components/create-template/types";

const { width } = Dimensions.get("window");
const TEMPLATE_SIZE = (width - 60) / 2;

// Mock template items for testing
const mockTemplateItems: TemplateItem[] = Array.from({ length: 9 }, (_, i) => ({
    id: String(i + 1),
    name: `Item ${i + 1}`,
    image: `https://picsum.photos/200/300?random=${i + 1}`,
}));

// All layout patterns grouped by item count
const TEST_LAYOUTS: Array<{ itemCount: number; layouts: LayoutPattern[] }> = [
    {
        itemCount: 2,
        layouts: ["left-right", "top-bottom"],
    },
    {
        itemCount: 3,
        layouts: ["left-tall", "top-wide", "right-tall", "top-two"],
    },
    {
        itemCount: 4,
        layouts: ["grid-2x2", "grid-2x2-alt", "grid-2x2-vertical"],
    },
    {
        itemCount: 5,
        layouts: ["grid-2x3", "grid-2x3-alt", "grid-2x3-horizontal"],
    },
    {
        itemCount: 6,
        layouts: ["grid-2x3", "grid-3x2"],
    },
    {
        itemCount: 7,
        layouts: ["grid-3x3", "grid-3x3-alt", "grid-3x3-horizontal"],
    },
    {
        itemCount: 8,
        layouts: ["grid-4x2", "grid-2x4"],
    },
    {
        itemCount: 9,
        layouts: ["grid-3x3-full", "grid-3x3-full-alt", "grid-3x3-full-horizontal"],
    },
];

export default function TestSkeletonsScreen() {
    const insets = useSafeAreaInsets();
    const [selectedItemCount, setSelectedItemCount] = useState<number>(2);
    const [selectedLayout, setSelectedLayout] = useState<LayoutPattern>("left-right");
    const [showSkeleton, setShowSkeleton] = useState(true);

    const selectedItems = mockTemplateItems.slice(0, selectedItemCount).map((item) => item.id);
    const currentLayouts = TEST_LAYOUTS.find((l) => l.itemCount === selectedItemCount)?.layouts || [];

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                    <IconSymbol name="xmark" size={20} color={colors.labels.secondary} />
                </TouchableOpacity>
                <BaseText type="Headline" weight={600} color="labels.primary">
                    Test Loading Skeletons
                </BaseText>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
                {/* Controls */}
                <View style={styles.controlsContainer}>
                    <BaseText type="Title2" weight={600} color="labels.primary" style={styles.sectionTitle}>
                        Controls
                    </BaseText>

                    {/* Item Count Selector */}
                    <View style={styles.controlRow}>
                        <BaseText type="Body" weight={500} color="labels.secondary">
                            Item Count:
                        </BaseText>
                        <View style={styles.buttonRow}>
                            {[2, 3, 4, 5, 6, 7, 8, 9].map((count) => (
                                <TouchableOpacity
                                    key={count}
                                    style={[styles.countButton, selectedItemCount === count && styles.countButtonActive]}
                                    onPress={() => {
                                        setSelectedItemCount(count);
                                        const layouts = TEST_LAYOUTS.find((l) => l.itemCount === count)?.layouts || [];
                                        if (layouts.length > 0) {
                                            setSelectedLayout(layouts[0]);
                                        }
                                    }}
                                >
                                    <BaseText type="Body" weight={600} color={selectedItemCount === count ? "system.white" : "labels.primary"}>
                                        {count}
                                    </BaseText>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Layout Selector */}
                    <View style={styles.controlRow}>
                        <BaseText type="Body" weight={500} color="labels.secondary">
                            Layout Pattern:
                        </BaseText>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.layoutScroll}>
                            <View style={styles.buttonRow}>
                                {currentLayouts.map((layout) => (
                                    <TouchableOpacity
                                        key={layout}
                                        style={[styles.layoutButton, selectedLayout === layout && styles.layoutButtonActive]}
                                        onPress={() => setSelectedLayout(layout)}
                                    >
                                        <BaseText type="Body" weight={600} color={selectedLayout === layout ? "system.white" : "labels.primary"} style={styles.layoutButtonText}>
                                            {layout}
                                        </BaseText>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>

                    {/* Toggle Skeleton */}
                    <View style={styles.controlRow}>
                        <TouchableOpacity
                            style={[styles.toggleButton, showSkeleton && styles.toggleButtonActive]}
                            onPress={() => setShowSkeleton(!showSkeleton)}
                        >
                            <BaseText type="Body" weight={600} color={showSkeleton ? "system.white" : "labels.primary"}>
                                {showSkeleton ? "Hide Skeleton" : "Show Skeleton"}
                            </BaseText>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Preview Section */}
                <View style={styles.previewSection}>
                    <BaseText type="Title2" weight={600} color="labels.primary" style={styles.sectionTitle}>
                        Preview ({selectedItemCount} items - {selectedLayout})
                    </BaseText>

                    <View style={styles.previewContainer}>
                        {showSkeleton ? (
                            <View style={styles.previewBox}>
                                <ImageSkeleton width={width - 40} height={(width - 40) * 0.92} borderRadius={16} variant="rectangular" />
                            </View>
                        ) : (
                            <PreviewCanvas selectedItems={selectedItems} templateItems={mockTemplateItems} selectedLayout={selectedLayout} />
                        )}
                    </View>
                </View>

                {/* All Layouts Grid */}
                <View style={styles.allLayoutsSection}>
                    <BaseText type="Title2" weight={600} color="labels.primary" style={styles.sectionTitle}>
                        All Layout Patterns ({selectedItemCount} items)
                    </BaseText>

                    <View style={styles.layoutsGrid}>
                        {currentLayouts.map((layout) => (
                            <View key={layout} style={styles.layoutCard}>
                                <BaseText type="Body" weight={500} color="labels.secondary" style={styles.layoutCardTitle}>
                                    {layout}
                                </BaseText>
                                <View style={styles.layoutCardPreview}>
                                    {showSkeleton ? (
                                        <ImageSkeleton width={TEMPLATE_SIZE} height={TEMPLATE_SIZE} borderRadius={12} variant="rectangular" />
                                    ) : (
                                        <View style={styles.miniPreviewBox}>
                                            <PreviewCanvas
                                                selectedItems={selectedItems}
                                                templateItems={mockTemplateItems}
                                                selectedLayout={layout}
                                            />
                                        </View>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.system.white,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.system.gray6,
        justifyContent: "center",
        alignItems: "center",
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: 40,
    },
    controlsContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    sectionTitle: {
        marginBottom: 16,
    },
    controlRow: {
        marginBottom: 20,
    },
    buttonRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 8,
    },
    countButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: colors.system.gray6,
        minWidth: 50,
        alignItems: "center",
    },
    countButtonActive: {
        backgroundColor: "#00c7be",
    },
    layoutScroll: {
        marginTop: 8,
    },
    layoutButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: colors.system.gray6,
        marginRight: 8,
    },
    layoutButtonActive: {
        backgroundColor: "#00c7be",
    },
    layoutButtonText: {
        fontSize: 12,
    },
    toggleButton: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: colors.system.gray6,
        alignItems: "center",
    },
    toggleButtonActive: {
        backgroundColor: "#00c7be",
    },
    previewSection: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 16,
    },
    previewContainer: {
        alignItems: "center",
        marginTop: 16,
    },
    previewBox: {
        width: width - 40,
        height: (width - 40) * 0.92,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: colors.system.gray6,
        alignItems: "center",
        justifyContent: "center",
    },
    miniPreviewBox: {
        width: TEMPLATE_SIZE,
        height: TEMPLATE_SIZE,
        borderRadius: 12,
        overflow: "hidden",
    },
    skeletonContainer: {
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    allLayoutsSection: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    layoutsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        marginTop: 16,
        gap: 10,
    },
    layoutCard: {
        width: TEMPLATE_SIZE,
        marginBottom: 20,
    },
    layoutCardTitle: {
        marginBottom: 8,
        textAlign: "center",
        fontSize: 12,
    },
    layoutCardPreview: {
        width: TEMPLATE_SIZE,
        height: TEMPLATE_SIZE,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: colors.system.gray6,
        alignItems: "center",
        justifyContent: "center",
    },
});
