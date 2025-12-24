import { GHOST_ASSETS } from "@/assets/gost/ghostAssets";
import { BaseText } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LAYOUT_PATTERNS_2_ITEMS, LAYOUT_PATTERNS_3_ITEMS, LAYOUT_PATTERNS_4_ITEMS, LAYOUT_PATTERNS_5_ITEMS, LAYOUT_PATTERNS_6_ITEMS, LAYOUT_PATTERNS_7_ITEMS, LAYOUT_PATTERNS_8_ITEMS, LAYOUT_PATTERNS_9_ITEMS, MINT_COLOR, TEMPLATE_ITEMS } from "./create-template/constants";
import { LayoutPatternSelector } from "./create-template/LayoutPatternSelector";
import { PreviewCanvas } from "./create-template/PreviewCanvas";
import { TemplateItemList } from "./create-template/TemplateItemList";
import { LayoutPattern } from "./create-template/types";

export default function CreateTemplateScreen() {
    const insets = useSafeAreaInsets();
    const { patientId, patientName, patientAvatar, doctorName } = useLocalSearchParams<{
        patientId: string;
        patientName: string;
        patientAvatar?: string;
        doctorName: string;
    }>();

    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [selectedLayout, setSelectedLayout] = useState<LayoutPattern>("left-right");

    // Auto-select first item and center it when component mounts
    useEffect(() => {
        if (selectedItems.length === 0 && TEMPLATE_ITEMS.length > 0) {
            setSelectedItems([TEMPLATE_ITEMS[0].id]);
        }
    }, []);

    // Auto-select default layout based on number of selected items
    useEffect(() => {
        if (selectedItems.length === 2) {
            setSelectedLayout("left-right"); // First layout for 2 items
        } else if (selectedItems.length === 3) {
            setSelectedLayout("left-tall"); // First layout for 3 items
        } else if (selectedItems.length === 4) {
            setSelectedLayout("grid-2x2"); // First layout for 4 items
        } else if (selectedItems.length === 5) {
            setSelectedLayout("grid-2x3"); // First layout for 5 items
        } else if (selectedItems.length === 6) {
            setSelectedLayout("grid-2x3"); // First layout for 6 items
        } else if (selectedItems.length === 7) {
            setSelectedLayout("grid-3x3"); // First layout for 7 items
        } else if (selectedItems.length === 8) {
            setSelectedLayout("grid-4x2"); // First layout for 8 items
        } else if (selectedItems.length === 9) {
            setSelectedLayout("grid-3x3-full"); // First layout for 9 items
        }
    }, [selectedItems.length]);

    const handleItemToggle = (itemId: string) => {
        Haptics.selectionAsync();
        setSelectedItems((prev) => {
            if (prev.includes(itemId)) {
                // Allow deselecting
                return prev.filter((id) => id !== itemId);
            } else {
                // Prevent selecting more than 9 items
                if (prev.length >= 9) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    return prev;
                }
                return [...prev, itemId];
            }
        });
    };

    const handleLayoutSelect = (layoutId: LayoutPattern) => {
        Haptics.selectionAsync();
        setSelectedLayout(layoutId);
        console.log("====================================");
        console.log(layoutId);
        console.log("====================================");
    };

    const handleCreateTemplate = () => {
        if (selectedItems.length === 0) return;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Create template preview array
        const preview = selectedItems.map((itemId) => {
            const item = TEMPLATE_ITEMS.find((i) => i.id === itemId);
            return item?.image || GHOST_ASSETS.face;
        });

        // Navigate back to template-select with new template data
        const templateData = {
            id: `custom-${Date.now()}`,
            name: `Custom Template`,
            ghostItems: selectedItems,
            preview: preview,
            layoutPattern: selectedLayout,
        };

        router.back();
        // Use setTimeout to ensure navigation completes before setting params
        setTimeout(() => {
            router.setParams({
                newTemplate: JSON.stringify(templateData),
            });
        }, 100);
    };

    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    // Get patterns based on selected items count
    const getPatterns = () => {
        if (selectedItems.length === 2) return LAYOUT_PATTERNS_2_ITEMS;
        else if (selectedItems.length === 3) return LAYOUT_PATTERNS_3_ITEMS;
        else if (selectedItems.length === 4) return LAYOUT_PATTERNS_4_ITEMS;
        else if (selectedItems.length === 5) return LAYOUT_PATTERNS_5_ITEMS;
        else if (selectedItems.length === 6) return LAYOUT_PATTERNS_6_ITEMS;
        else if (selectedItems.length === 7) return LAYOUT_PATTERNS_7_ITEMS;
        else if (selectedItems.length === 8) return LAYOUT_PATTERNS_8_ITEMS;
        else if (selectedItems.length === 9) return LAYOUT_PATTERNS_9_ITEMS;
        return [];
    };

    return (
        <View style={[styles.container]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                    <IconSymbol name="xmark" size={20} color={colors.labels.secondary} />
                </TouchableOpacity>

                <BaseText type="Headline" weight={600} color="labels.secondary">
                    Custom Templates
                </BaseText>

                <View style={{ width: 36 }} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
                {/* Title */}
                <View style={styles.titleSection}>
                    <BaseText type="Title1" weight={700} color="labels.primary" className="text-center">
                        Create Your Template
                    </BaseText>
                </View>

                {/* Preview Canvas */}
                <View style={styles.previewContainer}>
                    <PreviewCanvas selectedItems={selectedItems} templateItems={TEMPLATE_ITEMS} selectedLayout={selectedLayout} />

                    {/* Layout Pattern Selector - Show for 2+ items */}
                    {selectedItems.length >= 2 && <LayoutPatternSelector patterns={getPatterns()} selectedLayout={selectedLayout} onSelect={handleLayoutSelect} />}
                </View>

                {/* Template Items Selection */}
                <TemplateItemList items={TEMPLATE_ITEMS} selectedItems={selectedItems} onToggle={handleItemToggle} maxSelection={9} />
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity style={[styles.createButton, selectedItems.length === 0 && styles.createButtonDisabled]} onPress={handleCreateTemplate} activeOpacity={0.8} disabled={selectedItems.length === 0}>
                    <BaseText type="Body" weight={600} color="system.white">
                        Create Template
                    </BaseText>
                </TouchableOpacity>
            </View>
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
        paddingTop: 10,
        paddingHorizontal: 20,
    },
    titleSection: {
        marginBottom: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    previewContainer: {
        alignItems: "center",
        marginBottom: 44,
        position: "relative",
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 12,
        backgroundColor: colors.system.white,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    createButton: {
        backgroundColor: MINT_COLOR,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    createButtonDisabled: {
        backgroundColor: colors.system.gray3,
    },
});
