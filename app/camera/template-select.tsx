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
import { LayoutPattern } from "./create-template/types";
import { getItemLayoutStyle } from "./create-template/utils";

// Ghost items mapping - using PNG (renamed files without spaces)
const GHOST_IMAGES: Record<string, any> = {
    face: require("@/assets/gost/Face.png"),
    faceTurnRight: require("@/assets/gost/Face-turn_right.png"),
    faceTurnLeft: require("@/assets/gost/Face-turn_left.png"),
    faceDown: require("@/assets/gost/Face-down.png"),
    faceRightSide: require("@/assets/gost/Face-_right_side.png"),
    faceLeftSide: require("@/assets/gost/Face-_left_side.png"),
    upperTeethFront: require("@/assets/gost/upper_teeth-close_up-front.png"),
    upperTeethRightSide: require("@/assets/gost/upper_teeth-close_up-_right_side.png"),
    upperTeethLeftSide: require("@/assets/gost/upper_teeth-close_up-_left_side.png"),
    upperJawDownView: require("@/assets/gost/upper_jaw_teeth-_down_view.png"),
    lowerJawUpView: require("@/assets/gost/lower_jaw_teeth-_up_view.png"),
    allTeethOpenRightSide: require("@/assets/gost/all_teeth-open_right_side.png"),
    allTeethOpenMouthLeftSide: require("@/assets/gost/all_teeth-open_mouth-left_side.png"),
    allTeethOpenLeftSide: require("@/assets/gost/all_teeth-open_left_side.png"),
    allTeethFrontOpen: require("@/assets/gost/all_teeth-front_-_open.png"),
    allTeethFrontClosed: require("@/assets/gost/all_teeth-front_-_closed.png"),
    allTeethOpenMouthFront: require("@/assets/gost/all_teeth_open_mouth-front.png"),
    allTeethOpenMouthRightSide: require("@/assets/gost/all_teeth-open_mouth-right_side.png"),
};

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
            ghostItems: ["face", "faceTurnRight", "faceTurnLeft", "faceDown"],
            previewCount: 4,
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
                                        {GHOST_IMAGES[ghostId] ? <Image source={GHOST_IMAGES[ghostId]} style={styles.templatePreviewImage} contentFit="contain" /> : <IconSymbol name="photo" size={32} color={colors.labels.secondary} />}
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
