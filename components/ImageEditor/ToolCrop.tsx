import { BaseText } from "@/components";
import colors from "@/theme/colors.shared";
import React from "react";
import { StyleSheet, View } from "react-native";
import { ImageEditorToolProps } from "./types";

export const ToolCrop: React.FC<ImageEditorToolProps> = ({ imageUri, onChange, onApply, onCancel }) => {
    const handleCropChange = (crop: { x: number; y: number; width: number; height: number; rotation?: number }) => {
        onChange({
            type: "crop",
            data: crop,
        });
    };

    return (
        <View style={styles.toolPanel}>
            <BaseText type="Subhead" color="labels.primary">
                Crop Tool UI
            </BaseText>
            {/* TODO: Add crop controls */}
        </View>
    );
};

const styles = StyleSheet.create({
    toolPanel: {
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
});


