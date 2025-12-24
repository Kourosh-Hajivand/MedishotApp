import { BaseText } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { Button, Host } from "@expo/ui/swift-ui";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, Layout } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LayoutPattern } from "./create-template/types";
import { getItemLayoutStyle } from "./create-template/utils";
import { GHOST_ASSETS } from "@/assets/gost/ghostAssets";

const { width } = Dimensions.get("window");
const TEMPLATE_SIZE = (width - 60) / 2;

type TemplateType = {
    id: string;
    name: string;
    ghostItems: string[];
    previewCount: number;
    layoutPattern: LayoutPattern;
};

export default function TemplateSelectScreen() {
    const insets = useSafeAreaInsets();
    const { patientId, patientName, patientAvatar, doctorName, newTemplate } = useLocalSearchParams<{
        patientId: string;
        patientName: string;
        patientAvatar?: string;
        doctorName: string;
        newTemplate?: string;
    }>();

    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [customTemplates, setCustomTemplates] = useState<TemplateType[]>([]);

    // Add new template when coming back from create-template
    React.useEffect(() => {
        if (newTemplate) {
            try {
                const template = JSON.parse(newTemplate);
                // Add previewCount based on ghostItems length
                const templateWithPreview = {
                    ...template,
                    previewCount: template.ghostItems?.length || 1,
                };
                setCustomTemplates((prev) => [templateWithPreview, ...prev]); // Add to beginning of list
            } catch (error) {
                console.error("Error parsing new template:", error);
            }
        }
    }, [newTemplate]);

    // Static templates with ghost items inside
    const STATIC_TEMPLATES: TemplateType[] = [
        {
            id: "template-face-complete",
            name: "Face Complete",
            ghostItems: ["face", "faceRightSide", "faceLeftSide"],
            previewCount: 3,
            layoutPattern: "left-tall",
        },
        {
            id: "template-face-angles",
            name: "Face Angles",
            ghostItems: ["face", "faceTurnRight", "faceTurnLeft"],
            previewCount: 3,
            layoutPattern: "grid-2x2",
        },
        {
            id: "template-all-teeth-front",
            name: "All Teeth Front",
            ghostItems: ["allTeethFrontOpen", "allTeethFrontClosed"],
            previewCount: 2,
            layoutPattern: "left-right",
        },
        {
            id: "template-all-teeth-sides",
            name: "All Teeth Sides",
            ghostItems: ["allTeethOpenRightSide", "allTeethOpenLeftSide"],
            previewCount: 2,
            layoutPattern: "left-right",
        },
        {
            id: "template-upper-teeth",
            name: "Upper Teeth",
            ghostItems: ["upperTeethFront", "upperTeethRightSide", "upperTeethLeftSide"],
            previewCount: 3,
            layoutPattern: "left-tall",
        },
        {
            id: "template-jaw-views",
            name: "Jaw Views",
            ghostItems: ["upperJawDownView", "lowerJawUpView"],
            previewCount: 2,
            layoutPattern: "left-right",
        },
    ];

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
            params: { patientId, patientName, patientAvatar, doctorName },
        });
    };

    const handleContinue = () => {
        if (!selectedTemplate) return;
        // Check both static and custom templates
        const template = STATIC_TEMPLATES.find((t) => t.id === selectedTemplate) || customTemplates.find((t) => t.id === selectedTemplate);
        if (!template) return;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Close this modal and go back to camera with ghost items
        router.dismiss();

        // Navigate to camera with template params
        setTimeout(() => {
            router.replace({
                pathname: "/camera" as any,
                params: {
                    patientId,
                    patientName,
                    patientAvatar,
                    doctorName,
                    templateId: selectedTemplate,
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

    const renderTemplateItem = ({ item, index }: { item: (typeof STATIC_TEMPLATES)[0] | (typeof customTemplates)[0]; index: number }) => {
        const isSelected = isTemplateSelected(item.id);
        const layoutPattern = item.layoutPattern || "left-right"; // Default fallback

        return (
            <Animated.View entering={FadeInDown.delay(index * 50).springify()} layout={Layout.springify()}>
                <TouchableOpacity style={[styles.templateCard, isSelected && styles.templateCardSelected]} onPress={() => handleTemplateSelect(item.id)} activeOpacity={0.8}>
                    <View style={[styles.templateImageContainer, isSelected && styles.templateImageContainerSelected]}>
                        {/* Preview of ghost items inside template - using actual ghost images with layout pattern */}
                        <View style={styles.templatePreview}>
                            {item.ghostItems.map((ghostId: string, idx: number) => {
                                const layoutStyle = getItemLayoutStyle(idx, item.ghostItems.length, layoutPattern, TEMPLATE_SIZE);
                                return (
                                    <Animated.View key={idx} style={[styles.templatePreviewImageContainer, layoutStyle]}>
                                        {GHOST_ASSETS[ghostId as keyof typeof GHOST_ASSETS] ? (
                                            <Image source={GHOST_ASSETS[ghostId as keyof typeof GHOST_ASSETS]} style={styles.templatePreviewImage} contentFit="contain" />
                                        ) : (
                                            <IconSymbol name="photo" size={32} color={colors.labels.secondary} />
                                        )}
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
                {/* Custom Templates Section */}
                {customTemplates.length > 0 && (
                    <>
                        <View style={styles.sectionHeaderFirst}>
                            <BaseText type="Headline" weight={600} color="labels.primary">
                                Custom Templates
                            </BaseText>
                        </View>
                        <View style={styles.templatesGrid}>
                            {customTemplates
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
                                        {row.map((item, itemIndex) => renderTemplateItem({ item, index: rowIndex * 2 + itemIndex }))}
                                        {row.length === 1 && <View style={styles.templateCard} />}
                                    </View>
                                ))}
                        </View>
                    </>
                )}

                {/* Ready Templates Section */}
                <View style={styles.sectionHeader}>
                    <BaseText type="Headline" weight={600} color="labels.primary">
                        Ready Templates
                    </BaseText>
                </View>
                <View style={styles.templatesGrid}>
                    {STATIC_TEMPLATES.reduce((rows: TemplateType[][], item, index) => {
                        if (index % 2 === 0) {
                            rows.push([item]);
                        } else {
                            rows[rows.length - 1].push(item);
                        }
                        return rows;
                    }, []).map((row, rowIndex) => (
                        <View key={`static-row-${rowIndex}`} style={styles.templateRow}>
                            {row.map((item, itemIndex) => renderTemplateItem({ item, index: customTemplates.length + rowIndex * 2 + itemIndex }))}
                            {row.length === 1 && <View style={styles.templateCard} />}
                        </View>
                    ))}
                </View>
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
});
