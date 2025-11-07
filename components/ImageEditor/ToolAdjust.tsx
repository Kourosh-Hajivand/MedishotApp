import { BaseText } from "@/components";
import React from "react";
import { StyleSheet, View } from "react-native";
import { ImageEditorToolProps } from "./types";

export const ToolAdjust: React.FC<ImageEditorToolProps> = ({ imageUri, onChange, onApply, onCancel }) => {
    const handleAdjustChange = (adjustment: { brightness?: number; contrast?: number; saturation?: number; warmth?: number; highlights?: number; shadows?: number }) => {
        onChange({
            type: "adjust",
            data: adjustment,
        });
    };

    return (
        <View style={styles.toolPanel}>
            <BaseText type="Subhead" color="labels.primary">
                Adjust Tool UI
            </BaseText>
            {/* TODO: Add adjust controls (brightness, contrast, saturation, etc.) */}
        </View>
    );
};

const styles = StyleSheet.create({
    toolPanel: {
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
});
