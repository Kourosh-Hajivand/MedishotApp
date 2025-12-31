import colors from "@/theme/colors";
import { Image } from "expo-image";
import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { MINT_COLOR } from "./constants";
import { TemplateItem } from "./types";

interface TemplateItemListProps {
    items: TemplateItem[];
    selectedItems: string[];
    onToggle: (itemId: string) => void;
    maxSelection?: number;
}

export const TemplateItemList: React.FC<TemplateItemListProps> = ({ items, selectedItems, onToggle, maxSelection = 9 }) => {
    return (
        <View style={styles.container}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {items.map((item) => {
                    const isSelected = selectedItems.includes(item.id);
                    const isDisabled = !isSelected && selectedItems.length >= maxSelection;
                    return (
                        <TouchableOpacity key={item.id} style={[styles.card, isSelected && styles.cardSelected]} onPress={() => onToggle(item.id)} activeOpacity={0.8} disabled={isDisabled}>
                            <View style={[styles.itemContainer, isSelected && styles.itemContainerSelected, isDisabled && styles.itemContainerDisabled]}>
                                <View style={styles.imageContainer}>
                                    <Image source={typeof item.image === "string" ? { uri: item.image } : item.image} style={[styles.image, isDisabled && styles.imageDisabled]} contentFit="contain" />
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    scrollContent: {
        paddingHorizontal: 0,
        gap: 18,
    },
    card: {
        width: 102,
        height: 102,
    },
    cardSelected: {},
    itemContainer: {
        width: "100%",
        height: "100%",
        borderRadius: 16,
        backgroundColor: "white",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.system.gray5,
        overflow: "hidden",
        position: "relative",
    },
    itemContainerSelected: {
        borderColor: MINT_COLOR,
        borderWidth: 2,
        backgroundColor: "white",
        shadowColor: `${MINT_COLOR}`,
        shadowOffset: { width: 10, height: 10 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 8,
    },
    itemContainerDisabled: {
        opacity: 0.8,
    },
    imageContainer: {
        width: "85%",
        height: "85%",
        justifyContent: "center",
        alignItems: "center",
    },
    image: {
        width: "100%",
        height: "100%",
    },
    imageDisabled: {
        opacity: 0.8,
    },
});
