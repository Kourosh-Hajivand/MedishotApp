import React from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { ThumbnailItem } from "./ThumbnailItem";

const THUMB_PADDING = 0; // set by parent via width
const THUMB_GAP = 2;

export interface ThumbnailStripProps {
    width: number;
    thumbnailStripWidth: number;
    thumbnailStripAnimatedStyle: Record<string, unknown>;
    imagesList: string[];
    displayIndex: number;
    currentIndexShared: { value: number };
    scrollProgress: { value: number };
    thumbnailLoadingStates: Map<string, boolean>;
    onThumbnailLoadStart: (imageUri: string) => void;
    onThumbnailLoad: (imageUri: string) => void;
    onThumbnailError: (imageUri: string) => void;
    onThumbnailPress: (index: number) => void;
    isZoomed: boolean;
    notesPanelVisible: boolean;
    thumbPadding: number;
}

export const ThumbnailStrip = React.memo<ThumbnailStripProps>(function ThumbnailStrip({
    width,
    thumbnailStripWidth,
    thumbnailStripAnimatedStyle,
    imagesList,
    displayIndex,
    currentIndexShared,
    scrollProgress,
    thumbnailLoadingStates,
    onThumbnailLoadStart,
    onThumbnailLoad,
    onThumbnailError,
    onThumbnailPress,
    isZoomed,
    notesPanelVisible,
    thumbPadding,
}) {
    return (
        <View style={[styles.thumbnailScroll, { overflow: "hidden", width }, isZoomed && !notesPanelVisible && styles.thumbnailHidden]} pointerEvents={isZoomed && !notesPanelVisible ? "none" : "auto"}>
            <Animated.View
                style={[
                    {
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: thumbPadding,
                        gap: THUMB_GAP,
                        width: thumbnailStripWidth,
                    },
                    thumbnailStripAnimatedStyle,
                ]}
            >
                {imagesList.map((imageUri, index) => {
                    const isThumbnailLoading = thumbnailLoadingStates.get(imageUri) ?? true;
                    return (
                        <ThumbnailItem
                            key={index}
                            imageUri={imageUri}
                            index={index}
                            isActive={index === displayIndex}
                            currentIndexShared={currentIndexShared as any}
                            scrollProgress={scrollProgress as any}
                            isLoading={isThumbnailLoading}
                            onLoadStart={() => onThumbnailLoadStart(imageUri)}
                            onLoad={() => onThumbnailLoad(imageUri)}
                            onError={() => onThumbnailError(imageUri)}
                            onPress={() => onThumbnailPress(index)}
                        />
                    );
                })}
            </Animated.View>
        </View>
    );
});

const styles = StyleSheet.create({
    thumbnailScroll: {
        marginBottom: 16,
    },
    thumbnailHidden: {
        opacity: 0,
    },
});
