import type { PropsWithChildren, ReactElement } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, { interpolate, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";

const { height: screenHeight } = Dimensions.get("window");

type Props = PropsWithChildren<{
    headerImage: ReactElement;
    headerBackgroundColor?: string; // Solid color for light theme
    contentBackgroundColor?: string; // Content background color
    headerHeight?: number | string; // Can be number (px) or percentage string
}>;

export default function ParallaxScrollView({ children, headerImage, headerBackgroundColor = "#FFFFFF", contentBackgroundColor = "#FFFFFF", headerHeight = 250 }: Props) {
    const scrollRef = useAnimatedRef<Animated.ScrollView>();
    const scrollOffset = useSharedValue(0);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollOffset.value = event.contentOffset.y;
        },
    });

    // Convert headerHeight to number
    const calculateHeaderHeight = () => {
        if (typeof headerHeight === "string" && headerHeight.includes("%")) {
            const percentage = parseFloat(headerHeight.replace("%", ""));
            return (screenHeight * percentage) / 100;
        }
        return typeof headerHeight === "number" ? headerHeight : 250;
    };

    const HEADER_HEIGHT = calculateHeaderHeight();

    const headerAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    translateY: interpolate(scrollOffset.value, [-HEADER_HEIGHT, 0, HEADER_HEIGHT], [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * 0.75]),
                },
                {
                    scale: interpolate(scrollOffset.value, [-HEADER_HEIGHT, 0, HEADER_HEIGHT], [2, 1, 1]),
                },
            ],
        };
    });

    return (
        <Animated.ScrollView ref={scrollRef} style={{ backgroundColor: "#ffffff", flex: 1 }} scrollEventThrottle={16} onScroll={scrollHandler}>
            <Animated.View style={[styles.header, { height: HEADER_HEIGHT, backgroundColor: headerBackgroundColor }, headerAnimatedStyle]}>{headerImage}</Animated.View>
            <View style={[styles.content, { backgroundColor: contentBackgroundColor, minHeight: screenHeight - HEADER_HEIGHT }]}>{children}</View>
        </Animated.ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        overflow: "hidden",
        width: "100%",
    },
    content: {
        flex: 1,
        gap: 16,
        overflow: "hidden",
    },
});
