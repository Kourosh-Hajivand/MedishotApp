import { BaseText } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { TEMPLATE_CATEGORIES } from "@/utils/constants/templates";
import { PhotoTemplate } from "@/utils/types/camera.types";
import { Button, Host } from "@expo/ui/swift-ui";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Dimensions, FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut, Layout } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const TEMPLATE_SIZE = (width - 80) / 4;

export default function TemplateSelectScreen() {
    const insets = useSafeAreaInsets();
    const { patientId, patientName, patientAvatar, doctorName } = useLocalSearchParams<{
        patientId: string;
        patientName: string;
        patientAvatar?: string;
        doctorName: string;
    }>();

    const [selectedCategory, setSelectedCategory] = useState<string>("face");
    const [selectedTemplates, setSelectedTemplates] = useState<PhotoTemplate[]>([]);

    const handleCategorySelect = (categoryId: string) => {
        Haptics.selectionAsync();
        setSelectedCategory(categoryId);
    };

    const handleTemplateToggle = (template: PhotoTemplate) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedTemplates((prev) => {
            const exists = prev.find((t) => t.id === template.id);
            if (exists) {
                return prev.filter((t) => t.id !== template.id);
            }
            return [...prev, template];
        });
    };

    const isTemplateSelected = (templateId: string) => {
        return selectedTemplates.some((t) => t.id === templateId);
    };

    const getTemplateIndex = (templateId: string) => {
        return selectedTemplates.findIndex((t) => t.id === templateId) + 1;
    };

    const handleCreateCustomTemplate = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({
            pathname: "/(fullmodals)/camera/create-template",
            params: { patientId, patientName, patientAvatar, doctorName },
        });
    };

    const handleContinue = () => {
        if (selectedTemplates.length === 0) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push({
            pathname: "/(fullmodals)/camera/capture",
            params: {
                patientId,
                patientName,
                patientAvatar,
                doctorName,
                templates: JSON.stringify(selectedTemplates.map((t) => t.id)),
            },
        });
    };

    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    const currentTemplates = TEMPLATE_CATEGORIES.find((c) => c.id === selectedCategory)?.templates || [];

    const renderTemplateItem = ({ item, index }: { item: PhotoTemplate; index: number }) => {
        const isSelected = isTemplateSelected(item.id);
        const selectionIndex = getTemplateIndex(item.id);

        return (
            <Animated.View entering={FadeInDown.delay(index * 50).springify()} layout={Layout.springify()}>
                <TouchableOpacity style={[styles.templateCard, isSelected && styles.templateCardSelected]} onPress={() => handleTemplateToggle(item)} activeOpacity={0.8}>
                    <View style={styles.templateImageContainer}>
                        {/* Placeholder for template overlay image */}
                        <View style={styles.templatePlaceholder}>
                            <IconSymbol name={item.category === "face" ? "face.smiling" : item.category === "teeth" ? "mouth" : "figure.stand"} size={32} color={colors.labels.tertiary} />
                        </View>

                        {/* Selection indicator */}
                        {isSelected && (
                            <Animated.View entering={FadeIn.springify()} exiting={FadeOut} style={styles.selectionBadge}>
                                <BaseText type="Caption2" weight={700} color="system.white">
                                    {selectionIndex}
                                </BaseText>
                            </Animated.View>
                        )}
                    </View>

                    <BaseText type="Caption2" weight={isSelected ? 600 : 400} color={isSelected ? "system.blue" : "labels.primary"} className="mt-1 text-center" numberOfLines={1}>
                        {item.name}
                    </BaseText>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <Host style={{ width: 60, height: 36 }}>
                    <Button variant="plain" onPress={handleClose}>
                        Close
                    </Button>
                </Host>

                <BaseText type="Headline" weight={600} color="labels.primary">
                    Ready Templates
                </BaseText>

                <TouchableOpacity style={styles.addButton} onPress={handleCreateCustomTemplate} activeOpacity={0.7}>
                    <BaseText type="Subhead" weight={600} color="system.blue">
                        + Template
                    </BaseText>
                </TouchableOpacity>
            </View>

            {/* Category Tabs */}
            <View style={styles.categoryContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                    {TEMPLATE_CATEGORIES.map((category) => (
                        <TouchableOpacity key={category.id} style={[styles.categoryTab, selectedCategory === category.id && styles.categoryTabActive]} onPress={() => handleCategorySelect(category.id)} activeOpacity={0.7}>
                            <IconSymbol name={category.icon as any} size={18} color={selectedCategory === category.id ? MINT_COLOR : colors.labels.secondary} />
                            <BaseText type="Subhead" weight={selectedCategory === category.id ? 600 : 400} color={selectedCategory === category.id ? "system.blue" : "labels.secondary"}>
                                {category.name}
                            </BaseText>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Templates Grid */}
            <FlatList data={currentTemplates} renderItem={renderTemplateItem} keyExtractor={(item) => item.id} numColumns={4} contentContainerStyle={styles.templatesGrid} showsVerticalScrollIndicator={false} columnWrapperStyle={styles.templateRow} />

            {/* Selected Templates Preview */}
            {selectedTemplates.length > 0 && (
                <Animated.View entering={FadeInDown.springify()} style={styles.selectedPreview}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectedScroll}>
                        {selectedTemplates.map((template, index) => (
                            <Animated.View key={template.id} entering={FadeIn.delay(index * 30).springify()} style={styles.selectedItem}>
                                <View style={styles.selectedThumbnail}>
                                    <View style={styles.selectedNumber}>
                                        <BaseText type="Caption2" weight={700} color="system.white">
                                            {index + 1}
                                        </BaseText>
                                    </View>
                                    <IconSymbol name={template.category === "face" ? "face.smiling" : template.category === "teeth" ? "mouth" : "figure.stand"} size={20} color={colors.labels.tertiary} />
                                </View>
                                <TouchableOpacity style={styles.removeButton} onPress={() => handleTemplateToggle(template)}>
                                    <IconSymbol name="xmark.circle.fill" size={18} color={colors.labels.tertiary} />
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                    </ScrollView>
                </Animated.View>
            )}

            {/* Continue Button */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity style={[styles.continueButton, selectedTemplates.length === 0 && styles.continueButtonDisabled]} onPress={handleContinue} activeOpacity={0.8} disabled={selectedTemplates.length === 0}>
                    <BaseText type="Body" weight={600} color="system.white">
                        Continue ({selectedTemplates.length})
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
    addButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    categoryContainer: {
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    categoryScroll: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    categoryTab: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.system.gray6,
    },
    categoryTabActive: {
        backgroundColor: `${MINT_COLOR}15`,
    },
    templatesGrid: {
        padding: 16,
    },
    templateRow: {
        justifyContent: "flex-start",
        gap: 12,
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
        backgroundColor: colors.system.gray6,
        borderWidth: 2,
        borderColor: "transparent",
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center",
    },
    templatePlaceholder: {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
    },
    selectionBadge: {
        position: "absolute",
        top: 6,
        right: 6,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: MINT_COLOR,
        justifyContent: "center",
        alignItems: "center",
    },
    selectedPreview: {
        backgroundColor: colors.system.gray6,
        paddingVertical: 12,
    },
    selectedScroll: {
        paddingHorizontal: 16,
        gap: 12,
    },
    selectedItem: {
        position: "relative",
    },
    selectedThumbnail: {
        width: 56,
        height: 56,
        borderRadius: 10,
        backgroundColor: colors.system.white,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: MINT_COLOR,
    },
    selectedNumber: {
        position: "absolute",
        top: 4,
        left: 4,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: MINT_COLOR,
        justifyContent: "center",
        alignItems: "center",
    },
    removeButton: {
        position: "absolute",
        top: -6,
        right: -6,
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
});
