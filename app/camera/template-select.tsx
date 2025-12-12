import { BaseText } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { Button, Host } from "@expo/ui/swift-ui";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Dimensions, FlatList, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, Layout } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Ghost items mapping - using PNG
const GHOST_IMAGES: Record<string, any> = {
    face: require("@/assets/gost/face.png"),
    leftFace: require("@/assets/gost/leftFace.png"),
    tooth: require("@/assets/gost/toth.png"),
};

const { width } = Dimensions.get("window");
const TEMPLATE_SIZE = (width - 60) / 2;

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
    const [customTemplates, setCustomTemplates] = useState<typeof STATIC_TEMPLATES>([]);

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

    // Static templates with ghost items inside - using placeholder icons temporarily
    const STATIC_TEMPLATES = [
        {
            id: "template-1",
            name: "Template 1",
            ghostItems: ["face", "tooth"],
            previewCount: 2,
        },
        {
            id: "template-2",
            name: "Template 2",
            ghostItems: ["face", "leftFace"],
            previewCount: 2,
        },
        {
            id: "template-3",
            name: "Template 3",
            ghostItems: ["tooth", "leftFace"],
            previewCount: 2,
        },
        {
            id: "template-4",
            name: "Template 4",
            ghostItems: ["face", "tooth", "leftFace"],
            previewCount: 3,
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
        // Navigate directly to capture with ghost items
        router.push({
            pathname: "/camera/capture" as any,
            params: {
                patientId,
                patientName,
                patientAvatar,
                doctorName,
                templateId: selectedTemplate,
                ghostItems: JSON.stringify(template.ghostItems),
            },
        });
    };

    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    const renderTemplateItem = ({ item, index }: { item: (typeof STATIC_TEMPLATES)[0]; index: number }) => {
        const isSelected = isTemplateSelected(item.id);

        return (
            <Animated.View entering={FadeInDown.delay(index * 50).springify()} layout={Layout.springify()}>
                <TouchableOpacity style={[styles.templateCard, isSelected && styles.templateCardSelected]} onPress={() => handleTemplateSelect(item.id)} activeOpacity={0.8}>
                    <View style={[styles.templateImageContainer, isSelected && styles.templateImageContainerSelected]}>
                        {/* Preview of ghost items inside template - using actual ghost images */}
                        <View style={styles.templatePreview}>
                            {item.ghostItems.map((ghostId: string, idx: number) => (
                                <View key={idx} style={styles.templatePreviewImageContainer}>
                                    {GHOST_IMAGES[ghostId] ? (
                                        <Image source={GHOST_IMAGES[ghostId]} style={styles.templatePreviewImage} contentFit="contain" />
                                    ) : (
                                        <IconSymbol name="photo" size={32} color={colors.labels.secondary} />
                                    )}
                                </View>
                            ))}
                        </View>
                    </View>

                    <BaseText type="Caption2" weight={isSelected ? 600 : 400} color={isSelected ? "system.blue" : "labels.primary"} className="mt-1 text-center" numberOfLines={1}>
                        {item.name}
                    </BaseText>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: 12 }]}>
            {/* Header */}
            <View style={styles.header}>
                <Host style={{ width: 60, height: 36 }}>
                    <Button variant="plain" onPress={handleClose}>
                        Close
                    </Button>
                </Host>

                <View style={styles.headerCenter}>
                    <BaseText type="Headline" weight={600} color="labels.primary">
                        Ready Templates
                    </BaseText>
                </View>

                <TouchableOpacity style={styles.addButton} onPress={handleCreateCustomTemplate} activeOpacity={0.7}>
                    <BaseText type="Subhead" weight={600} style={{ color: MINT_COLOR }}>
                        + Template
                    </BaseText>
                </TouchableOpacity>
            </View>

            {/* Templates Grid */}
            <FlatList
                data={[...customTemplates, ...STATIC_TEMPLATES]} // Custom templates first
                renderItem={renderTemplateItem}
                keyExtractor={(item) => item.id}
                numColumns={2}
                contentContainerStyle={styles.templatesGrid}
                showsVerticalScrollIndicator={false}
                columnWrapperStyle={styles.templateRow}
            />

            {/* Continue Button */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
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
        width: 60,
        alignItems: "flex-end",
    },
    templatesGrid: {
        padding: 20,
    },
    templateRow: {
        justifyContent: "space-between",
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
    },
    templatePreview: {
        width: "100%",
        height: "100%",
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        padding: 8,
    },
    templatePreviewImageContainer: {
        width: "40%",
        height: "40%",
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
