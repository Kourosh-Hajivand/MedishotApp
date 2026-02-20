import React from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import type { FlatListProps } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

const IMAGE_GAP = 8;

export interface ImageCarouselProps {
    flatListRef: React.RefObject<Animated.FlatList<string>>;
    width: number;
    imagePageWidth: number;
    data: string[];
    initialIndex: number;
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
    onMomentumScrollEnd: (event: any) => void;
    renderItem: (info: { item: string; index: number }) => React.ReactElement;
    scrollEnabled: boolean;
}

export const ImageCarousel = React.memo<ImageCarouselProps>(function ImageCarousel({
    flatListRef,
    width,
    imagePageWidth,
    data,
    initialIndex,
    onScroll,
    onMomentumScrollEnd,
    renderItem,
    scrollEnabled,
}) {
    return (
        <Animated.FlatList
            ref={flatListRef}
            horizontal
            pagingEnabled={false}
            snapToInterval={imagePageWidth}
            snapToAlignment="start"
            decelerationRate="fast"
            initialScrollIndex={initialIndex}
            data={data}
            keyExtractor={(_, i) => i.toString()}
            onScroll={onScroll}
            onMomentumScrollEnd={onMomentumScrollEnd}
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ width: IMAGE_GAP }} />}
            getItemLayout={(_, index) => ({
                length: width,
                offset: index * imagePageWidth,
                index,
            })}
            scrollEnabled={scrollEnabled}
            bounces={false}
            removeClippedSubviews={false}
            maxToRenderPerBatch={3}
            windowSize={5}
            initialNumToRender={3}
        />
    );
});
