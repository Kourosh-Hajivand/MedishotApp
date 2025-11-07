import { BaseText } from "@/components";
import colors from "@/theme/colors.shared";
import React from "react";
import { StyleSheet, View } from "react-native";
import { ImageEditorToolProps } from "./types";

export const ToolPen: React.FC<ImageEditorToolProps> = ({ imageUri, onChange, onApply, onCancel }) => {
    const handlePenChange = (strokes: Array<{ id: string; path: Array<{ x: number; y: number }>; color: string; width: number }>) => {
        onChange({
            type: "pen",
            data: { strokes },
        });
    };

    return (
        <View style={styles.toolPanel}>
            <BaseText type="Subhead" color="labels.primary">
                Pen Tool UI
            </BaseText>
            {/* TODO: Add pen/drawing controls */}
        </View>
    );
};

const styles = StyleSheet.create({
    toolPanel: {
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
});


