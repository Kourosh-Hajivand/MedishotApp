import { BaseText } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { useGetPracticeTemplates } from "@/utils/hook/usePractice";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { PracticeTemplate, Template } from "@/utils/service/models/ResponseModels";
import { Button, Host } from "@expo/ui/swift-ui";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, Layout } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LayoutPattern } from "./_components/create-template/types";
import { getItemLayoutStyle } from "./_components/create-template/utils";

const { width } = Dimensions.get("window");
const TEMPLATE_SIZE = (width - 60) / 2;

// Helper function to select layout pattern based on item count if not provided
const getDefaultLayoutPattern = (itemCount: number): LayoutPattern => {
    switch (itemCount) {
        case 1:
            return "left-right"; // Single item can use any layout
        case 2:
            return "left-right";
        case 3:
            return "left-tall";
        case 4:
            return "grid-2x2";
        case 5:
            return "grid-2x3";
        case 6:
            return "grid-3x2";
        case 7:
            return "grid-3x3";
        case 8:
            return "grid-4x2";
        case 9:
            return "grid-3x3-full";
        default:
            // For more than 9 items, use grid-3x3-full
            if (itemCount > 9) return "grid-3x3-full";
            return "left-right";
    }
};

type GhostItemInfo = {
    gostId: string;
    imageUrl?: string | null; // gost_image.url - for overlay center
    sampleImageUrl?: string | null; // image.url - for sample modal
    iconUrl?: string | null; // icon.url - for thumbnails
    name?: string;
    description?: string | null;
};

type TemplateType = {
    id: string;
    name: string;
    ghostItems: GhostItemInfo[];
    previewCount: number;
    layoutPattern: LayoutPattern;
    isCustom?: boolean;
    templateData?: Template | PracticeTemplate;
};

export default function TemplateSelectScreen() {
    const insets = useSafeAreaInsets();
    const { patientId, patientName, patientAvatar, doctorName, doctorColor, newTemplate } = useLocalSearchParams<{
        patientId: string;
        patientName: string;
        patientAvatar?: string;
        doctorName: string;
        doctorColor?: string;
        newTemplate?: string;
    }>();

    const { selectedPractice } = useProfileStore();
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [customTemplates, setCustomTemplates] = useState<TemplateType[]>([]);

    // Fetch global templates (Ready Templates) - using practice templates endpoint which returns both global and practice templates
    // We need to fetch from a practice to get global templates (practise_id = null)
    const { data: globalTemplatesData, isLoading: isLoadingGlobalTemplates } = useGetPracticeTemplates(selectedPractice?.id ?? 0, !!selectedPractice?.id);

    // Fetch practice templates (Custom Templates)
    const { data: practiceTemplatesData, isLoading: isLoadingPracticeTemplates } = useGetPracticeTemplates(selectedPractice?.id ?? 0, !!selectedPractice?.id);

    // Convert API templates to TemplateType
    const globalTemplates: TemplateType[] = useMemo(() => {
        if (!globalTemplatesData?.data) return [];

        // Handle both array and paginated response
        let templates: any[] = [];
        if (Array.isArray(globalTemplatesData.data)) {
            templates = globalTemplatesData.data;
        } else if (globalTemplatesData.data && typeof globalTemplatesData.data === "object" && "data" in globalTemplatesData.data) {
            templates = (globalTemplatesData.data as any).data || [];
        }

        // Filter only global templates (practise_id === null) that have items and convert
        return templates
            .filter((template: any) => {
                // Only show templates that have items (cells or gosts)
                const hasCells = template.cells && Array.isArray(template.cells) && template.cells.length > 0;
                const hasGosts = template.gosts && Array.isArray(template.gosts) && template.gosts.length > 0;
                return template.practise_id === null && (hasCells || hasGosts);
            })
            .map((template: any) => {
                // Extract ghost items with image URLs - prefer cells, fallback to gosts
                const ghostItems: GhostItemInfo[] = [];

                if (template.cells && Array.isArray(template.cells) && template.cells.length > 0) {
                    // Sort by row_index and column_index to maintain order
                    const sortedCells = [...template.cells].sort((a: any, b: any) => {
                        if (a.row_index !== b.row_index) return a.row_index - b.row_index;
                        return a.column_index - b.column_index;
                    });
                    ghostItems.push(
                        ...sortedCells.map((cell: any) => ({
                            gostId: String(cell.gost.id),
                            // gost_image.url for overlay center
                            imageUrl: cell.gost.gost_image?.url || null,
                            // image.url for sample modal
                            sampleImageUrl: cell.gost.image?.url || null,
                            // icon.url for thumbnails
                            iconUrl: cell.gost.icon?.url || null,
                            name: cell.gost.name,
                            description: cell.gost.description || null,
                        })),
                    );
                } else if (template.gosts && Array.isArray(template.gosts) && template.gosts.length > 0) {
                    // Use gosts array if cells are empty
                    ghostItems.push(
                        ...template.gosts.map((gost: any) => ({
                            gostId: String(gost.id),
                            // gost_image.url for overlay center
                            imageUrl: gost.gost_image?.url || null,
                            // image.url for sample modal
                            sampleImageUrl: gost.image?.url || null,
                            // icon.url for thumbnails
                            iconUrl: gost.icon?.url || null,
                            name: gost.name,
                            description: gost.description || null,
                        })),
                    );
                }

                const itemCount = ghostItems.length;
                const layoutPattern = template.layout_pattern ? (template.layout_pattern as LayoutPattern) : getDefaultLayoutPattern(itemCount);

                return {
                    id: `global-${template.id}`,
                    name: template.name,
                    ghostItems,
                    previewCount: itemCount,
                    layoutPattern,
                    isCustom: false,
                    templateData: template,
                };
            });
    }, [globalTemplatesData]);

    const practiceTemplates: TemplateType[] = useMemo(() => {
        if (!practiceTemplatesData?.data) return [];

        // Filter only practice templates (practise_id !== null, matches selected practice, and has items)
        return practiceTemplatesData.data
            .filter((template: any) => {
                // Only show templates that belong to selected practice and have items
                const hasCells = template.cells && Array.isArray(template.cells) && template.cells.length > 0;
                const hasGosts = template.gosts && Array.isArray(template.gosts) && template.gosts.length > 0;
                return template.practise_id !== null && template.practise_id === selectedPractice?.id && (hasCells || hasGosts);
            })
            .map((template: any) => {
                // Extract ghost items with image URLs - prefer cells, fallback to gosts
                const ghostItems: GhostItemInfo[] = [];

                if (template.cells && Array.isArray(template.cells) && template.cells.length > 0) {
                    // Sort by row_index and column_index to maintain order
                    const sortedCells = [...template.cells].sort((a: any, b: any) => {
                        if (a.row_index !== b.row_index) return a.row_index - b.row_index;
                        return a.column_index - b.column_index;
                    });
                    ghostItems.push(
                        ...sortedCells.map((cell: any) => ({
                            gostId: String(cell.gost.id),
                            // gost_image.url for overlay center
                            imageUrl: cell.gost.gost_image?.url || null,
                            // image.url for sample modal
                            sampleImageUrl: cell.gost.image?.url || null,
                            // icon.url for thumbnails
                            iconUrl: cell.gost.icon?.url || null,
                            name: cell.gost.name,
                            description: cell.gost.description || null,
                        })),
                    );
                } else if (template.gosts && Array.isArray(template.gosts) && template.gosts.length > 0) {
                    // Use gosts array if cells are empty
                    ghostItems.push(
                        ...template.gosts.map((gost: any) => ({
                            gostId: String(gost.id),
                            // gost_image.url for overlay center
                            imageUrl: gost.gost_image?.url || null,
                            // image.url for sample modal
                            sampleImageUrl: gost.image?.url || null,
                            // icon.url for thumbnails
                            iconUrl: gost.icon?.url || null,
                            name: gost.name,
                            description: gost.description || null,
                        })),
                    );
                }

                const itemCount = ghostItems.length;
                const layoutPattern = template.layout_pattern ? (template.layout_pattern as LayoutPattern) : getDefaultLayoutPattern(itemCount);

                return {
                    id: `practice-${template.id}`,
                    name: template.name,
                    ghostItems,
                    previewCount: itemCount,
                    layoutPattern,
                    isCustom: true,
                    templateData: template,
                };
            });
    }, [practiceTemplatesData, selectedPractice?.id]);

    // Add new template when coming back from create-template
    React.useEffect(() => {
        if (newTemplate) {
            try {
                const template = JSON.parse(newTemplate);
                // Convert old format (string[]) to new format (GhostItemInfo[])
                const ghostItemsFormatted: GhostItemInfo[] = Array.isArray(template.ghostItems) ? template.ghostItems.map((item: string | GhostItemInfo) => (typeof item === "string" ? { gostId: item, imageUrl: null, sampleImageUrl: null, iconUrl: null, name: undefined, description: undefined } : item)) : [];
                const itemCount = ghostItemsFormatted.length || 1;
                const layoutPattern = template.layout_pattern ? (template.layout_pattern as LayoutPattern) : getDefaultLayoutPattern(itemCount);

                const templateWithPreview: TemplateType = {
                    ...template,
                    ghostItems: ghostItemsFormatted,
                    previewCount: itemCount,
                    layoutPattern,
                    isCustom: true,
                };
                setCustomTemplates((prev) => [templateWithPreview, ...prev]); // Add to beginning of list
            } catch (error) {
                console.error("Error parsing new template:", error);
            }
        }
    }, [newTemplate]);

    // Merge practice templates with newly created custom templates
    const allCustomTemplates = useMemo(() => {
        return [...practiceTemplates, ...customTemplates];
    }, [practiceTemplates, customTemplates]);

    const handleTemplateSelect = (templateId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (selectedTemplate === templateId) {
            setSelectedTemplate(null);
        } else {
            setSelectedTemplate(templateId);
        }
    };

    const isTemplateSelected = (templateId: string) => {
        return selectedTemplate === templateId;
    };

    const handleCreateCustomTemplate = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({
            pathname: "/camera/create-template" as any,
            params: { patientId, patientName, patientAvatar, doctorName, doctorColor },
        });
    };

    const handleContinue = () => {
        if (!selectedTemplate) return;
        // Check global, practice, and custom templates
        const template = globalTemplates.find((t) => t.id === selectedTemplate) || allCustomTemplates.find((t) => t.id === selectedTemplate);
        if (!template) return;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Close this modal and go back to camera with ghost items
        router.dismiss();

        // Extract template ID from the combined ID (remove prefix)
        const templateId = selectedTemplate.replace(/^(global|practice)-/, "");

        // Navigate to camera with template params
        setTimeout(() => {
            router.replace({
                pathname: "/camera" as any,
                params: {
                    patientId,
                    patientName,
                    patientAvatar,
                    doctorName,
                    doctorColor,
                    templateId,
                    ghostItems: JSON.stringify(template.ghostItems),
                    layoutPattern: template.layoutPattern || "left-right",
                },
            });
        }, 100);
    };

    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    const renderTemplateItem = ({ item, index }: { item: TemplateType; index: number }) => {
        const isSelected = isTemplateSelected(item.id);
        const layoutPattern = item.layoutPattern || "left-right"; // Default fallback

        return (
            <Animated.View key={item.id} entering={FadeInDown.delay(index * 50).springify()} layout={Layout.springify()}>
                <TouchableOpacity style={[styles.templateCard, isSelected && styles.templateCardSelected]} onPress={() => handleTemplateSelect(item.id)} activeOpacity={0.8}>
                    <View style={[styles.templateImageContainer, isSelected && styles.templateImageContainerSelected]}>
                        {/* Preview of ghost items inside template - using actual ghost images with layout pattern */}
                        <View style={styles.templatePreview}>
                            {item.ghostItems.length > 0
                                ? // Show actual ghost items if available
                                  item.ghostItems.map((ghostItem: GhostItemInfo, idx: number) => {
                                      const layoutStyle = getItemLayoutStyle(idx, item.ghostItems.length, layoutPattern, TEMPLATE_SIZE);
                                      return (
                                          <Animated.View key={idx} style={[styles.templatePreviewImageContainer, layoutStyle]}>
                                              {ghostItem.imageUrl ? <Image source={{ uri: ghostItem.imageUrl }} style={styles.templatePreviewImage} contentFit="contain" /> : <IconSymbol name="photo" size={32} color={colors.labels.secondary} />}
                                          </Animated.View>
                                      );
                                  })
                                : // Show placeholder images for practice templates that don't have ghostItems in list response
                                  Array.from({ length: item.previewCount }).map((_, idx: number) => {
                                      const layoutStyle = getItemLayoutStyle(idx, item.previewCount, layoutPattern, TEMPLATE_SIZE);
                                      return (
                                          <Animated.View key={idx} style={[styles.templatePreviewImageContainer, layoutStyle]}>
                                              <IconSymbol name="photo" size={32} color={colors.labels.secondary} />
                                          </Animated.View>
                                      );
                                  })}
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: 0 }]}>
            {/* Header */}
            <View style={styles.header}>
                <Host style={{ width: 60, height: 36 }}>
                    <Button variant="plain" onPress={handleClose}>
                        Close
                    </Button>
                </Host>

                <TouchableOpacity style={styles.addButton} onPress={handleCreateCustomTemplate} activeOpacity={0.7}>
                    <BaseText type="Subhead" weight={600} style={{ color: MINT_COLOR }}>
                        + Template
                    </BaseText>
                </TouchableOpacity>
            </View>

            {/* Templates Grid */}
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Loading State */}
                {(isLoadingGlobalTemplates || isLoadingPracticeTemplates) && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={MINT_COLOR} />
                        <BaseText type="Body" style={{ marginTop: 12 }} color="labels.secondary">
                            Loading templates...
                        </BaseText>
                    </View>
                )}

                {/* Custom Templates Section */}
                {!isLoadingPracticeTemplates && allCustomTemplates.length > 0 && (
                    <>
                        <View style={styles.sectionHeaderFirst}>
                            <BaseText type="Headline" weight={600} color="labels.primary">
                                Custom Templates
                            </BaseText>
                        </View>
                        <View style={styles.templatesGrid}>
                            {allCustomTemplates
                                .reduce((rows: TemplateType[][], item, index) => {
                                    if (index % 2 === 0) {
                                        rows.push([item]);
                                    } else {
                                        rows[rows.length - 1].push(item);
                                    }
                                    return rows;
                                }, [])
                                .map((row, rowIndex) => (
                                    <View key={`custom-row-${rowIndex}`} style={styles.templateRow}>
                                        {row.map((item, itemIndex) => (
                                            <React.Fragment key={item.id}>{renderTemplateItem({ item, index: rowIndex * 2 + itemIndex })}</React.Fragment>
                                        ))}
                                        {row.length === 1 && <View style={styles.templateCard} />}
                                    </View>
                                ))}
                        </View>
                    </>
                )}

                {/* Ready Templates Section */}
                {!isLoadingGlobalTemplates && globalTemplates.length > 0 && (
                    <>
                        <View style={styles.sectionHeader}>
                            <BaseText type="Headline" weight={600} color="labels.primary">
                                Ready Templates
                            </BaseText>
                        </View>
                        <View style={styles.templatesGrid}>
                            {globalTemplates
                                .reduce((rows: TemplateType[][], item, index) => {
                                    if (index % 2 === 0) {
                                        rows.push([item]);
                                    } else {
                                        rows[rows.length - 1].push(item);
                                    }
                                    return rows;
                                }, [])
                                .map((row, rowIndex) => (
                                    <View key={`global-row-${rowIndex}`} style={styles.templateRow}>
                                        {row.map((item, itemIndex) => (
                                            <React.Fragment key={item.id}>{renderTemplateItem({ item, index: allCustomTemplates.length + rowIndex * 2 + itemIndex })}</React.Fragment>
                                        ))}
                                        {row.length === 1 && <View style={styles.templateCard} />}
                                    </View>
                                ))}
                        </View>
                    </>
                )}

                {/* Empty State */}
                {!isLoadingGlobalTemplates && !isLoadingPracticeTemplates && globalTemplates.length === 0 && allCustomTemplates.length === 0 && (
                    <View style={styles.emptyContainer}>
                        <IconSymbol name="photo" size={48} color={colors.labels.secondary} />
                        <BaseText type="Body" style={{ marginTop: 12 }} color="labels.secondary">
                            No templates available
                        </BaseText>
                    </View>
                )}
            </ScrollView>

            {/* Continue Button */}
            <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
                <TouchableOpacity style={[styles.continueButton, !selectedTemplate && styles.continueButtonDisabled]} onPress={handleContinue} activeOpacity={0.8} disabled={!selectedTemplate}>
                    <BaseText type="Body" weight={600} color="system.white">
                        Continue
                    </BaseText>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// Figma Design Colors
const MINT_COLOR = "#00c7be";

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.system.white,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerCenter: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    addButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        width: 120,
        alignItems: "flex-end",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    templatesGrid: {
        paddingHorizontal: 20,
        paddingTop: 0,
        paddingBottom: 0,
    },
    sectionHeader: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginTop: 8,
        marginBottom: 8,
    },
    sectionHeaderFirst: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginTop: 0,
        marginBottom: 8,
    },
    templateRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
        marginBottom: 16,
    },
    templateCard: {
        width: TEMPLATE_SIZE,
        alignItems: "center",
    },
    templateCardSelected: {},
    templateImageContainer: {
        width: TEMPLATE_SIZE,
        height: TEMPLATE_SIZE,
        borderRadius: 12,
        backgroundColor: colors.system.white,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center",
    },
    templateImageContainerSelected: {
        borderColor: MINT_COLOR,
        borderWidth: 2,
        backgroundColor: colors.system.white,
        margin: -1, // جبران کردن فضای border اضافی برای جلوگیری از پرش
    },
    templatePreview: {
        width: "100%",
        height: "100%",
        position: "relative",
    },
    templatePreviewImageContainer: {
        position: "absolute",
        justifyContent: "center",
        alignItems: "center",
    },
    templatePreviewImage: {
        width: "100%",
        height: "100%",
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 12,
        backgroundColor: colors.system.white,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    continueButton: {
        backgroundColor: MINT_COLOR,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    continueButtonDisabled: {
        backgroundColor: colors.system.gray3,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 60,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 60,
    },
});
