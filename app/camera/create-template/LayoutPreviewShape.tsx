import colors from "@/theme/colors";
import React from "react";
import { StyleSheet, View } from "react-native";
import { MINT_COLOR } from "./constants";
import { LayoutPattern } from "./types";

interface LayoutPreviewShapeProps {
    patternId: LayoutPattern;
    isSelected: boolean;
}

export const LayoutPreviewShape: React.FC<LayoutPreviewShapeProps> = ({ patternId, isSelected }) => {
    const renderShapes = () => {
        switch (patternId) {
            // 2 عکس
            case "left-right":
                return (
                    <>
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, top: 6, width: 14, height: 30 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, top: 6, width: 14, height: 30 }]} />
                    </>
                );

            // 2 عکس
            case "top-bottom":
                return (
                    <>
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, top: 6, width: 30, height: 13 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, bottom: 6, width: 30, height: 13 }]} />
                    </>
                );

            // 3 عکس
            case "left-tall":
                return (
                    <>
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, top: 6, width: 14, height: 30 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, top: 6, width: 14, height: 13 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, bottom: 6, width: 14, height: 13 }]} />
                    </>
                );

            // 3 عکس
            case "top-wide":
                return (
                    <>
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, top: 6, width: 30, height: 13 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, bottom: 6, width: 14, height: 13 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, bottom: 6, width: 14, height: 13 }]} />
                    </>
                );

            // 3 عکس
            case "right-tall":
                return (
                    <>
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, top: 6, width: 14, height: 13 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, bottom: 6, width: 14, height: 13 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, top: 5, width: 14, height: 31 }]} />
                    </>
                );

            // 3 عکس
            case "top-two":
                return (
                    <>
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, top: 6, width: 14, height: 13 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, top: 6, width: 14, height: 13 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, bottom: 6, width: 30, height: 13 }]} />
                    </>
                );

            // 4 عکس
            case "grid-2x2":
                return (
                    <>
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, top: 6, width: 14, height: 13 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, top: 6, width: 14, height: 13 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, bottom: 6, width: 14, height: 13 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, bottom: 6, width: 14, height: 13 }]} />
                    </>
                );

            // 4 عکس
            case "grid-2x2-alt":
                return (
                    <>
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, top: 6, width: 14, height: 30 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, top: 6, width: 14, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, top: 16, width: 14, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, bottom: 6, width: 14, height: 9 }]} />
                    </>
                );

            // 4 عکس
            case "grid-2x2-vertical":
                return (
                    <>
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, top: 6, width: 30, height: 13 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, bottom: 6, width: 9, height: 13 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 16, bottom: 6, width: 9, height: 13 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, bottom: 6, width: 9, height: 13 }]} />
                    </>
                );

            // 5 عکس
            case "grid-2x3":
                return (
                    <>
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, top: 6, width: 14, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, top: 6, width: 14, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, top: 16, width: 14, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, top: 16, width: 14, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, bottom: 6, width: 14, height: 9 }]} />
                    </>
                );

            // 5 عکس
            case "grid-2x3-alt":
                return (
                    <>
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, top: 6, width: 30, height: 12 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, bottom: 6, width: 14, height: 6 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, bottom: 6, width: 14, height: 6 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, bottom: 15, width: 14, height: 6 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, bottom: 15, width: 14, height: 6 }]} />
                    </>
                );

            // 5 عکس
            case "grid-2x3-horizontal":
                return (
                    <>
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, top: 6, width: 8, height: 30 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, top: 6, width: 9, height: 13 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 16, top: 6, width: 9, height: 13 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, bottom: 6, width: 9, height: 13 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 16, bottom: 6, width: 9, height: 13 }]} />
                    </>
                );

            // 6 عکس
            case "grid-3x2":
                return (
                    <>
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, top: 6, width: 9, height: 13 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 16, top: 6, width: 9, height: 13 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, top: 6, width: 9, height: 13 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, bottom: 6, width: 9, height: 13 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 16, bottom: 6, width: 9, height: 13 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, bottom: 6, width: 9, height: 13 }]} />
                    </>
                );

            // 7 عکس
            case "grid-3x3":
                return (
                    <>
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, top: 6, width: 9, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 16, top: 6, width: 9, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, top: 6, width: 9, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, top: 16, width: 9, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 16, top: 16, width: 9, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, top: 16, width: 9, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, bottom: 6, width: 9, height: 9 }]} />
                    </>
                );

            // 7 عکس
            case "grid-3x3-alt":
                return (
                    <>
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, top: 6, width: 30, height: 10 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, bottom: 6, width: 9, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 16, bottom: 6, width: 9, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, bottom: 6, width: 9, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, bottom: 16, width: 9, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 16, bottom: 16, width: 9, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, bottom: 16, width: 9, height: 9 }]} />
                    </>
                );

            // 7 عکس
            case "grid-3x3-horizontal":
                return (
                    <>
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, top: 6, width: 10, height: 30 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, top: 6, width: 9, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 16, top: 6, width: 9, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, top: 16, width: 9, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 16, top: 16, width: 9, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, bottom: 6, width: 9, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 16, bottom: 6, width: 9, height: 9 }]} />
                    </>
                );

            // 8 عکس
            case "grid-4x2":
                return (
                    <>
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 5, top: 6, width: 7, height: 13 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 13, top: 6, width: 7, height: 13 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 22, top: 6, width: 7, height: 13 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 5, top: 6, width: 7, height: 13 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 5, bottom: 6, width: 7, height: 13 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 13, bottom: 6, width: 7, height: 13 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 22, bottom: 6, width: 7, height: 13 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 5, bottom: 6, width: 7, height: 13 }]} />
                    </>
                );

            // 8 عکس
            case "grid-2x4":
                return (
                    <>
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, top: 5, width: 14, height: 7 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, top: 5, width: 14, height: 7 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, top: 13, width: 14, height: 7 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, top: 13, width: 14, height: 7 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, top: 21, width: 14, height: 7 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, top: 21, width: 14, height: 7 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, bottom: 6, width: 14, height: 7 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, bottom: 6, width: 14, height: 7 }]} />
                    </>
                );

            // 9 عکس
            case "grid-3x3-full":
                return (
                    <>
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, top: 6, width: 9, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 16, top: 6, width: 9, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, top: 6, width: 9, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, top: 16, width: 9, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 16, top: 16, width: 9, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, top: 16, width: 9, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, bottom: 6, width: 9, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 16, bottom: 6, width: 9, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, bottom: 6, width: 9, height: 9 }]} />
                    </>
                );

            // 9 عکس
            case "grid-3x3-full-alt":
                return (
                    <>
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, top: 6, width: 30, height: 10 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, bottom: 6, width: 7, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 14, bottom: 6, width: 7, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 22, bottom: 6, width: 7, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, bottom: 6, width: 7, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, bottom: 16, width: 7, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 14, bottom: 16, width: 7, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 22, bottom: 16, width: 7, height: 9 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, bottom: 16, width: 7, height: 9 }]} />
                    </>
                );

            // 9 عکس
            case "grid-3x3-full-horizontal":
                return (
                    <>
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { left: 6, top: 6, width: 9, height: 30.5 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, top: 6, width: 9, height: 7 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 16, top: 6, width: 9, height: 7 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, top: 14, width: 9, height: 7 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 16, top: 14, width: 9, height: 7 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, top: 22, width: 9, height: 7 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 16, top: 22, width: 9, height: 7 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 6, bottom: 5.5, width: 9, height: 7 }]} />
                        <View style={[styles.shape, isSelected && styles.shapeSelected, { right: 16, bottom: 5.5, width: 9, height: 7 }]} />
                    </>
                );

            default:
                return null;
        }
    };

    return <>{renderShapes()}</>;
};

const styles = StyleSheet.create({
    shape: {
        position: "absolute",
        backgroundColor: colors.labels.tertiary,
        borderRadius: 4,
        opacity: 0.6,
    },
    shapeSelected: {
        backgroundColor: MINT_COLOR,
        opacity: 0.4,
    },
});
