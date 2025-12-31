import { GHOST_ASSETS } from "@/assets/gost/ghostAssets";
import { BaseText } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { useGetGosts } from "@/utils/hook/useGost";
import { useCreatePracticeTemplate } from "@/utils/hook/usePractice";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { CreateTemplateDto } from "@/utils/service/models/RequestModels";
import { PracticeTemplateResponse } from "@/utils/service/models/ResponseModels";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LAYOUT_PATTERNS_2_ITEMS, LAYOUT_PATTERNS_3_ITEMS, LAYOUT_PATTERNS_4_ITEMS, LAYOUT_PATTERNS_5_ITEMS, LAYOUT_PATTERNS_6_ITEMS, LAYOUT_PATTERNS_7_ITEMS, LAYOUT_PATTERNS_8_ITEMS, LAYOUT_PATTERNS_9_ITEMS, MINT_COLOR } from "./create-template/constants";
import { LayoutPatternSelector } from "./create-template/LayoutPatternSelector";
import { PreviewCanvas } from "./create-template/PreviewCanvas";
import { TemplateItemList } from "./create-template/TemplateItemList";
import { LayoutPattern, TemplateItem } from "./create-template/types";

export default function CreateTemplateScreen() {
    const insets = useSafeAreaInsets();
    const { patientId, patientName, patientAvatar, doctorName } = useLocalSearchParams<{
        patientId: string;
        patientName: string;
        patientAvatar?: string;
        doctorName: string;
    }>();

    const { selectedPractice } = useProfileStore();
    const { data: gostsData, isLoading: isLoadingGosts } = useGetGosts();
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [selectedLayout, setSelectedLayout] = useState<LayoutPattern>("left-right");

    const { mutate: createTemplate, isPending: isCreatingTemplate } = useCreatePracticeTemplate(
        (data: PracticeTemplateResponse) => {
            console.log("✅ Template created successfully:", data);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Success", "Template created successfully", [
                {
                    text: "OK",
                    onPress: () => router.back(),
                },
            ]);
        },
        (error: Error) => {
            console.error("❌ Error creating template:", error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Error", error.message || "Failed to create template");
        },
    );

    // Convert Gost[] to TemplateItem[]
    const templateItems: TemplateItem[] = useMemo(() => {
        if (!gostsData?.data || !Array.isArray(gostsData.data)) return [];
        return gostsData.data.map((gost) => {
            // Use gost_image.url first, fallback to image.url, then default
            const imageUrl = gost.gost_image?.url || gost.image?.url || null;
            return {
                id: String(gost.id),
                name: gost.name,
                image: imageUrl || GHOST_ASSETS.face,
            };
        });
    }, [gostsData?.data]);

    // Auto-select first item and center it when component mounts
    useEffect(() => {
        if (selectedItems.length === 0 && templateItems.length > 0) {
            setSelectedItems([templateItems[0].id]);
        }
    }, [templateItems.length]);

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

        if (!selectedPractice?.id) {
            Alert.alert("Error", "Please select a practice first");
            return;
        }

        // Build CreateTemplateDto - gosts as array of number IDs
        const gosts = selectedItems
            .map((itemId) => {
                const gostId = parseInt(itemId, 10);
                if (isNaN(gostId)) {
                    console.error(`Invalid gost ID: ${itemId}`);
                    return null;
                }
                return gostId;
            })
            .filter((gost): gost is number => gost !== null);

        // Calculate grid_layout based on selected layout pattern
        const getGridLayout = (layout: LayoutPattern): { rows?: number; columns?: number } | undefined => {
            // Extract grid dimensions from layout pattern
            const gridMatch = layout.match(/grid-(\d+)x(\d+)/);
            if (gridMatch) {
                return {
                    rows: parseInt(gridMatch[1], 10),
                    columns: parseInt(gridMatch[2], 10),
                };
            }
            // For non-grid layouts, calculate based on item count
            if (selectedItems.length <= 2) {
                return { rows: 1, columns: 2 };
            } else if (selectedItems.length <= 4) {
                return { rows: 2, columns: 2 };
            } else if (selectedItems.length <= 6) {
                return { rows: 2, columns: 3 };
            } else if (selectedItems.length <= 9) {
                return { rows: 3, columns: 3 };
            }
            return undefined;
        };

        const templateData: CreateTemplateDto = {
            name: `Custom Template ${new Date().toLocaleDateString()}`,
            description: `Template with ${selectedItems.length} items`,
            grid_layout: getGridLayout(selectedLayout),
            layout_pattern: selectedLayout,
            gosts: gosts,
        };

        // Log the data being sent
        console.log("====================================");
        console.log("📤 Creating Template with data:");
        console.log("Practice ID:", selectedPractice.id);
        console.log("Template Data:", JSON.stringify(templateData, null, 2));
        console.log("Selected Items:", selectedItems);
        console.log("Selected Layout:", selectedLayout);
        console.log("====================================");

        // Validate data before sending
        if (gosts.length === 0) {
            Alert.alert("Error", "No valid gosts selected");
            return;
        }

        if (!templateData.name) {
            Alert.alert("Error", "Template name is required");
            return;
        }

        // Call API to create template
        createTemplate({
            practiceId: selectedPractice.id,
            data: templateData,
        });
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

                {isLoadingGosts ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={MINT_COLOR} />
                    </View>
                ) : (
                    <>
                        {/* Preview Canvas */}
                        <View style={styles.previewContainer}>
                            <PreviewCanvas selectedItems={selectedItems} templateItems={templateItems} selectedLayout={selectedLayout} />

                            {/* Layout Pattern Selector - Show for 2+ items */}
                            {selectedItems.length >= 2 && <LayoutPatternSelector patterns={getPatterns()} selectedLayout={selectedLayout} onSelect={handleLayoutSelect} />}
                        </View>

                        {/* Template Items Selection */}
                        <TemplateItemList items={templateItems} selectedItems={selectedItems} onToggle={handleItemToggle} maxSelection={9} />
                    </>
                )}
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity style={[styles.createButton, (selectedItems.length === 0 || isCreatingTemplate) && styles.createButtonDisabled]} onPress={handleCreateTemplate} activeOpacity={0.8} disabled={selectedItems.length === 0 || isCreatingTemplate}>
                    {isCreatingTemplate ? (
                        <ActivityIndicator size="small" color={colors.system.white} />
                    ) : (
                        <BaseText type="Body" weight={600} color="system.white">
                            Create Template
                        </BaseText>
                    )}
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
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        minHeight: 200,
    },
});
