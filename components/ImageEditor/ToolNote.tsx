import { BaseText } from "@/components";
import colors from "@/theme/colors.shared";
import React from "react";
import { StyleSheet, View } from "react-native";
import { ImageEditorToolProps } from "./types";

export const ToolNote: React.FC<ImageEditorToolProps> = ({ imageUri, onChange, onApply, onCancel }) => {
    const handleNoteChange = (notes: Array<{ id: string; x: number; y: number; text: string; color?: string }>) => {
        onChange({
            type: "note",
            data: { notes },
        });
    };

    return (
        <View style={styles.toolPanel}>
            <BaseText type="Subhead" color="labels.primary">
                Note Tool UI
            </BaseText>
            {/* TODO: Add note controls */}
        </View>
    );
};

const styles = StyleSheet.create({
    toolPanel: {
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
});


