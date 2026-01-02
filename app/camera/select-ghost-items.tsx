import { BaseText } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GHOST_ITEMS } from "@/assets/gost/ghostAssets";

const { width } = Dimensions.get("window");
const MINT_COLOR = "#00c7be";

export default function SelectGhostItemsScreen() {
    const insets = useSafeAreaInsets();
    const { patientId, templateId } = useLocalSearchParams<{
        patientId: string;
        templateId: string;
    }>();

    const [selectedItems, setSelectedItems] = useState<string[]>([]);

    const handleItemToggle = (itemId: string) => {
        Haptics.selectionAsync();
        setSelectedItems((prev) => {
            if (prev.includes(itemId)) {
                return prev.filter((id) => id !== itemId);
            } else {
                return [...prev, itemId];
            }
        });
    };

    const handleContinue = () => {
        if (selectedItems.length === 0) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Close this modal and go back to camera with ghost items
        router.dismiss();

        // Navigate to camera with templateId (template will be fetched from API)
        setTimeout(() => {
            router.replace({
                pathname: "/camera" as any,
                params: {
                    patientId,
                    templateId,
                },
            });
        }, 100);
    };

    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    return (
        <View style={[styles.container, { paddingTop: 12 }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                    <IconSymbol name="xmark" size={20} color={colors.labels.secondary} />
                </TouchableOpacity>

                <BaseText type="Headline" weight={600} color="labels.primary">
                    Select Items
                </BaseText>

                <View style={{ width: 36 }} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
                {/* Preview Canvas */}
                <View style={styles.previewContainer}>
                    <View style={styles.previewBox}>
                        {selectedItems.length > 0 ? (
                            <View style={styles.previewContent}>
                                {selectedItems.map((itemId, index) => {
                                    const item = GHOST_ITEMS.find((i) => i.id === itemId);
                                    if (!item) return null;
                                    return (
                                        <Animated.View key={itemId} entering={FadeIn.delay(index * 100).springify()} style={styles.previewItem}>
                                            <View style={styles.previewImageContainer}>
                                                <Image source={item.image} style={styles.previewImage} contentFit="contain" />
                                            </View>
                                        </Animated.View>
                                    );
                                })}
                            </View>
                        ) : (
                            <View style={styles.previewPlaceholder}>
                                <View style={styles.previewPlaceholderIcon}>
                                    <IconSymbol name="plus" size={32} color={colors.labels.quaternary} />
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {/* Ghost Items Selection */}
                <View style={styles.itemsSection}>
                    <BaseText type="Subhead" weight={600} color="labels.primary" className="mb-3">
                        Select Ghost Items
                    </BaseText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.itemsScrollContent}>
                        {GHOST_ITEMS.map((item) => {
                            const isSelected = selectedItems.includes(item.id);
                            return (
                                <TouchableOpacity key={item.id} style={[styles.ghostItemCard, isSelected && styles.ghostItemCardSelected]} onPress={() => handleItemToggle(item.id)} activeOpacity={0.8}>
                                    <View style={[styles.ghostItemContainer, isSelected && styles.ghostItemContainerSelected]}>
                                        <View style={styles.ghostItemImageContainer}>
                                            <Image source={item.image} style={styles.ghostItemImage} contentFit="contain" />
                                        </View>
                                        {isSelected && (
                                            <Animated.View entering={FadeIn.springify()} style={styles.checkmarkOverlay}>
                                                <View style={styles.checkmarkCircle}>
                                                    <IconSymbol name="checkmark" size={16} color={colors.system.white} />
                                                </View>
                                            </Animated.View>
                                        )}
                                    </View>
                                    <BaseText type="Caption1" weight={isSelected ? 600 : 400} color={isSelected ? "system.blue" : "labels.primary"} className="mt-2 text-center">
                                        {item.name}
                                    </BaseText>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
                <TouchableOpacity style={[styles.continueButton, selectedItems.length === 0 && styles.continueButtonDisabled]} onPress={handleContinue} activeOpacity={0.8} disabled={selectedItems.length === 0}>
                    <BaseText type="Body" weight={600} color="system.white">
                        Continue ({selectedItems.length})
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
    previewContainer: {
        alignItems: "center",
        marginBottom: 24,
    },
    previewBox: {
        width: width - 40,
        height: (width - 40) * 0.92,
        backgroundColor: "#d8d8d8",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    previewPlaceholder: {
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
    },
    previewPlaceholderIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.system.white,
        justifyContent: "center",
        alignItems: "center",
    },
    previewContent: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        padding: 20,
        width: "100%",
        height: "100%",
    },
    previewItem: {
        alignItems: "center",
        justifyContent: "center",
    },
    previewImage: {
        width: 150,
        height: 150,
        opacity: 0.9,
    },
    itemsSection: {
        marginBottom: 24,
    },
    itemsScrollContent: {
        paddingHorizontal: 20,
        gap: 18,
    },
    ghostItemCard: {
        width: 102,
        alignItems: "center",
    },
    ghostItemCardSelected: {},
    ghostItemContainer: {
        width: 102,
        height: 102,
        borderRadius: 12,
        backgroundColor: colors.system.gray6,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "transparent",
        overflow: "hidden",
        position: "relative",
    },
    ghostItemContainerSelected: {
        borderColor: MINT_COLOR,
        backgroundColor: `${MINT_COLOR}20`,
    },
    ghostItemImageContainer: {
        width: "85%",
        height: "85%",
        justifyContent: "center",
        alignItems: "center",
    },
    ghostItemImage: {
        width: "100%",
        height: "100%",
    },
    previewImageContainer: {
        width: 150,
        height: 150,
    },
    checkmarkOverlay: {
        position: "absolute",
        top: 6,
        right: 6,
    },
    checkmarkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: MINT_COLOR,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
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
