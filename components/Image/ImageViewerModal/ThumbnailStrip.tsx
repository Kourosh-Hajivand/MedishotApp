import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { ThumbnailItem } from "./ThumbnailItem";

const THUMB_GAP = 2;

export interface ThumbnailStripProps {
    width: number;
    thumbnailStripWidth: number;
    thumbnailStripAnimatedStyle: Record<string, unknown>;
    imagesList: string[];
    currentIndexShared: { value: number };
    scrollProgress: { value: number };
    onThumbnailPress: (index: number) => void;
    isZoomed: boolean;
    notesPanelVisible: boolean;
    thumbPadding: number;
}

const ThumbnailStripComponent: React.FC<ThumbnailStripProps> = ({
    width,
    thumbnailStripWidth,
    thumbnailStripAnimatedStyle,
    imagesList,
    currentIndexShared,
    scrollProgress,
    onThumbnailPress,
    isZoomed,
    notesPanelVisible,
    thumbPadding,
}) => {
    const rowStyle = useMemo(
        () => ({
            flexDirection: "row" as const,
            alignItems: "center" as const,
            paddingHorizontal: thumbPadding,
            gap: THUMB_GAP,
            width: thumbnailStripWidth,
        }),
        [thumbPadding, thumbnailStripWidth],
    );

    const containerStyle = useMemo(
        () => [styles.thumbnailScroll, { overflow: "hidden" as const, width }, isZoomed && !notesPanelVisible && styles.thumbnailHidden],
        [width, isZoomed, notesPanelVisible],
    );

    return (
        <View style={containerStyle} pointerEvents={isZoomed && !notesPanelVisible ? "none" : "auto"}>
            <Animated.View style={[rowStyle, thumbnailStripAnimatedStyle]}>
                {imagesList.map((imageUri, index) => (
                    <ThumbnailItem
                        key={imageUri}
                        imageUri={imageUri}
                        index={index}
                        currentIndexShared={currentIndexShared as any}
                        scrollProgress={scrollProgress as any}
                        onPress={onThumbnailPress}
                    />
                ))}
            </Animated.View>
        </View>
    );
};

export const ThumbnailStrip = React.memo(ThumbnailStripComponent);

const styles = StyleSheet.create({
    thumbnailScroll: {
        marginBottom: 16,
    },
    thumbnailHidden: {
        opacity: 0,
    },
});
