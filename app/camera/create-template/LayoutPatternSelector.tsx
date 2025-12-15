import colors from "@/theme/colors";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { LayoutPreviewShape } from "./LayoutPreviewShape";
import { MINT_COLOR } from "./constants";
import { LayoutPattern, LayoutPatternOption } from "./types";

interface LayoutPatternSelectorProps {
    patterns: LayoutPatternOption[];
    selectedLayout: LayoutPattern;
    onSelect: (layoutId: LayoutPattern) => void;
}

export const LayoutPatternSelector: React.FC<LayoutPatternSelectorProps> = ({ patterns, selectedLayout, onSelect }) => {
    return (
        <View style={styles.container}>
            <View style={styles.patternsContainer}>
                {patterns.map((pattern) => {
                    const isSelected = selectedLayout === pattern.id;
                    return (
                        <TouchableOpacity key={pattern.id} style={[styles.card, isSelected && styles.cardSelected]} onPress={() => onSelect(pattern.id)} activeOpacity={0.8}>
                            <View style={[styles.preview, isSelected && styles.previewSelected]}>
                                <LayoutPreviewShape patternId={pattern.id} isSelected={isSelected} />
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        bottom: -25,
        left: 0,
        right: 0,
        alignItems: "center",
        paddingHorizontal: 20,
    },
    patternsContainer: {
        flexDirection: "row",
        gap: 16,
        justifyContent: "center",
    },
    card: {
        alignItems: "center",
    },
    cardSelected: {},
    preview: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: colors.border,
        position: "relative",
        overflow: "hidden",
    },
    previewSelected: {
        borderColor: MINT_COLOR,
    },
});
