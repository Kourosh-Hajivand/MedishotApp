import { BaseText } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { PhotoTemplate } from "@/utils/types/camera.types";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Dimensions, FlatList, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const MINT_COLOR = "#00c7be";

// Pre-made template shapes for custom templates
const BASE_SHAPES = [
    { id: "shape-face-front", name: "Front Face", icon: "face.smiling" },
    { id: "shape-face-side", name: "Side Profile", icon: "person.crop.circle" },
    { id: "shape-teeth-smile", name: "Smile", icon: "mouth" },
    { id: "shape-teeth-open", name: "Open Mouth", icon: "mouth.fill" },
];

export default function CreateTemplateScreen() {
    const insets = useSafeAreaInsets();
    const { patientId, patientName, patientAvatar, doctorName } = useLocalSearchParams<{
        patientId: string;
        patientName: string;
        patientAvatar?: string;
        doctorName: string;
    }>();

    const [templateName, setTemplateName] = useState("");
    const [selectedShape, setSelectedShape] = useState<string | null>(null);
    const [customTemplates, setCustomTemplates] = useState<PhotoTemplate[]>([]);

    const handleShapeSelect = (shapeId: string) => {
        Haptics.selectionAsync();
        setSelectedShape(shapeId);
    };

    const handleCreateTemplate = () => {
        if (!templateName.trim() || !selectedShape) return;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const newTemplate: PhotoTemplate = {
            id: `custom-${Date.now()}`,
            name: templateName.trim(),
            category: "custom",
            overlayImage: null,
            description: `Custom template based on ${selectedShape}`,
            isCustom: true,
        };

        // In a real app, this would be saved to storage/API
        setCustomTemplates((prev) => [...prev, newTemplate]);
        setTemplateName("");
        setSelectedShape(null);
    };

    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    const renderShapeItem = ({ item }: { item: (typeof BASE_SHAPES)[0] }) => {
        const isSelected = selectedShape === item.id;

        return (
            <TouchableOpacity style={[styles.shapeCard, isSelected && styles.shapeCardSelected]} onPress={() => handleShapeSelect(item.id)} activeOpacity={0.8}>
                <View style={[styles.shapeIconContainer, isSelected && styles.shapeIconSelected]}>
                    <IconSymbol name={item.icon as any} size={36} color={isSelected ? MINT_COLOR : colors.labels.secondary} />
                </View>
                <BaseText type="Caption1" weight={isSelected ? 600 : 400} color={isSelected ? "system.blue" : "labels.primary"} className="text-center mt-2" numberOfLines={2}>
                    {item.name}
                </BaseText>

                {isSelected && (
                    <Animated.View entering={FadeIn.springify()} style={styles.checkmark}>
                        <IconSymbol name="checkmark.circle.fill" size={20} color={MINT_COLOR} />
                    </Animated.View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                    <IconSymbol name="xmark" size={20} color={colors.labels.secondary} />
                </TouchableOpacity>

                <BaseText type="Headline" weight={600} color="labels.primary">
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
                    <BaseText type="Body" color="labels.secondary" className="text-center mt-2">
                        Choose a base shape and customize your template
                    </BaseText>
                </View>

                {/* Preview */}
                <View style={styles.previewContainer}>
                    <View style={styles.previewBox}>
                        {selectedShape ? (
                            <Animated.View entering={FadeIn.springify()}>
                                <IconSymbol name={(BASE_SHAPES.find((s) => s.id === selectedShape)?.icon as any) || "face.smiling"} size={120} color={colors.labels.tertiary} />
                            </Animated.View>
                        ) : (
                            <View style={styles.previewPlaceholder}>
                                <IconSymbol name="plus" size={40} color={colors.labels.quaternary} />
                                <BaseText type="Caption1" color="labels.tertiary" className="mt-2">
                                    Select a shape
                                </BaseText>
                            </View>
                        )}
                    </View>
                </View>

                {/* Shape Selection */}
                <View style={styles.shapesSection}>
                    <FlatList data={BASE_SHAPES} renderItem={renderShapeItem} keyExtractor={(item) => item.id} numColumns={4} scrollEnabled={false} columnWrapperStyle={styles.shapeRow} />
                </View>

                {/* Template Name Input */}
                <View style={styles.inputSection}>
                    <BaseText type="Subhead" weight={600} color="labels.primary" className="mb-2">
                        Template Name
                    </BaseText>
                    <TextInput style={styles.input} value={templateName} onChangeText={setTemplateName} placeholder="e.g., Front Profile Close-up" placeholderTextColor={colors.labels.tertiary} />
                </View>

                {/* Custom Templates List */}
                {customTemplates.length > 0 && (
                    <View style={styles.customListSection}>
                        <BaseText type="Subhead" weight={600} color="labels.primary" className="mb-3">
                            Your Custom Templates
                        </BaseText>
                        {customTemplates.map((template, index) => (
                            <Animated.View key={template.id} entering={FadeInDown.delay(index * 50).springify()} style={styles.customTemplateItem}>
                                <View style={styles.customTemplateIcon}>
                                    <IconSymbol name="photo.stack" size={20} color={MINT_COLOR} />
                                </View>
                                <BaseText type="Body" color="labels.primary">
                                    {template.name}
                                </BaseText>
                                <TouchableOpacity style={styles.customTemplateAction}>
                                    <IconSymbol name="ellipsis" size={20} color={colors.labels.secondary} />
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity style={[styles.createButton, (!templateName.trim() || !selectedShape) && styles.createButtonDisabled]} onPress={handleCreateTemplate} activeOpacity={0.8} disabled={!templateName.trim() || !selectedShape}>
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
        padding: 20,
    },
    titleSection: {
        marginBottom: 24,
    },
    previewContainer: {
        alignItems: "center",
        marginBottom: 32,
    },
    previewBox: {
        width: width - 80,
        height: (width - 80) * 0.8,
        backgroundColor: colors.system.gray6,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: "dashed",
    },
    previewPlaceholder: {
        alignItems: "center",
    },
    shapesSection: {
        marginBottom: 24,
    },
    shapeRow: {
        justifyContent: "space-between",
        marginBottom: 16,
    },
    shapeCard: {
        width: (width - 72) / 4,
        alignItems: "center",
        position: "relative",
    },
    shapeCardSelected: {},
    shapeIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 16,
        backgroundColor: colors.system.gray6,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "transparent",
    },
    shapeIconSelected: {
        borderColor: MINT_COLOR,
        backgroundColor: `${MINT_COLOR}15`,
    },
    checkmark: {
        position: "absolute",
        top: -4,
        right: 4,
    },
    inputSection: {
        marginBottom: 24,
    },
    input: {
        backgroundColor: colors.system.gray6,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: colors.labels.primary,
    },
    customListSection: {
        marginTop: 8,
    },
    customTemplateItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.system.gray6,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    customTemplateIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: `${MINT_COLOR}15`,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    customTemplateAction: {
        marginLeft: "auto",
        padding: 4,
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
