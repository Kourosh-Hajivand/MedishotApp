import { BaseText } from "@/components";
import { ImageSkeleton } from "@/components/skeleton/ImageSkeleton";
import colors from "@/theme/colors";
import { Image } from "expo-image";
import React, { useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { MINT_COLOR } from "./constants";
import { TemplateItem } from "./types";

interface TemplateItemListProps {
    items: TemplateItem[];
    selectedItems: string[];
    onToggle: (itemId: string) => void;
    maxSelection?: number;
}

// Separate component for template item to properly use hooks
const TemplateItemCard: React.FC<{
    item: TemplateItem;
    isSelected: boolean;
    isDisabled: boolean;
    onToggle: () => void;
}> = ({ item, isSelected, isDisabled, onToggle }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [showSkeleton, setShowSkeleton] = useState(true);
    const [imageContainerDimensions, setImageContainerDimensions] = useState({ width: 87, height: 87 }); // 85% of 102
    const hasLoadedRef = React.useRef(false); // Track if image has been loaded at least once
    const imageOpacity = useSharedValue(0);
    const skeletonOpacity = useSharedValue(1);

    const imageAnimatedStyle = useAnimatedStyle(() => ({
        opacity: imageOpacity.value,
    }));

    const skeletonAnimatedStyle = useAnimatedStyle(() => ({
        opacity: skeletonOpacity.value,
    }));

    const hideSkeletonJS = () => {
        setShowSkeleton(false);
    };

    const handleLoad = () => {
        hasLoadedRef.current = true;
        setIsLoading(false);
        skeletonOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
            if (finished) {
                runOnJS(hideSkeletonJS)();
            }
        });
        imageOpacity.value = withTiming(1, { duration: 300 });
    };

    const handleLoadStart = () => {
        // Only show skeleton if image hasn't been loaded before
        if (!hasLoadedRef.current) {
            setIsLoading(true);
            setShowSkeleton(true);
            imageOpacity.value = 0;
            skeletonOpacity.value = 1;
        }
    };

    const handleError = () => {
        hasLoadedRef.current = true;
        setIsLoading(false);
        skeletonOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
            if (finished) {
                runOnJS(hideSkeletonJS)();
            }
        });
        imageOpacity.value = withTiming(1, { duration: 300 });
    };

    const handleImageContainerLayout = (event: any) => {
        const { width: w, height: h } = event.nativeEvent.layout;
        if (w > 0 && h > 0) {
            setImageContainerDimensions({ width: w, height: h });
        }
    };

    // Check if image is from asset (not URL) - assets load immediately
    const isAssetImage = typeof item.image !== "string";
    
    // For asset images, start with skeleton visible
    React.useEffect(() => {
        if (isAssetImage && !hasLoadedRef.current) {
            // Asset images might load immediately, so we show skeleton initially
            imageOpacity.value = 0;
            skeletonOpacity.value = 1;
        }
    }, [isAssetImage]);

    return (
        <TouchableOpacity style={[styles.card, isSelected && styles.cardSelected]} onPress={onToggle} activeOpacity={0.8} disabled={isDisabled}>
            <View style={[styles.itemContainer, isSelected && styles.itemContainerSelected, isDisabled && styles.itemContainerDisabled]}>
                <View style={styles.imageContainer} onLayout={handleImageContainerLayout}>
                    {showSkeleton && (
                        <Animated.View style={[StyleSheet.absoluteFill, skeletonAnimatedStyle, { justifyContent: "center", alignItems: "center" }]}>
                            <ImageSkeleton width={imageContainerDimensions.width} height={imageContainerDimensions.height} borderRadius={0} variant="rectangular" />
                        </Animated.View>
                    )}
                    <Animated.View style={[StyleSheet.absoluteFill, imageAnimatedStyle]}>
                        <Image
                            source={typeof item.image === "string" ? { uri: item.image } : item.image}
                            style={[styles.image, isDisabled && styles.imageDisabled]}
                            contentFit="contain"
                            onLoadStart={handleLoadStart}
                            onLoad={handleLoad}
                            onError={handleError}
                        />
                    </Animated.View>
                </View>
            </View>
            <BaseText type="Caption1" weight={500} color="labels.secondary" numberOfLines={1} style={styles.itemName}>
                {item.name}
            </BaseText>
        </TouchableOpacity>
    );
};

export const TemplateItemList: React.FC<TemplateItemListProps> = ({ items, selectedItems, onToggle, maxSelection = 9 }) => {
    return (
        <View style={styles.container}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {items.map((item) => {
                    const isSelected = selectedItems.includes(item.id);
                    const isDisabled = !isSelected && selectedItems.length >= maxSelection;
                    return <TemplateItemCard key={item.id} item={item} isSelected={isSelected} isDisabled={isDisabled} onToggle={() => onToggle(item.id)} />;
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    scrollContent: {
        paddingHorizontal: 0,
        gap: 18,
    },
    card: {
        width: 102,
        alignItems: "center",
    },
    itemName: {
        marginTop: 6,
        textAlign: "center",
        maxWidth: 102,
    },
    cardSelected: {},
    itemContainer: {
        width: 102,
        height: 102,
        borderRadius: 16,
        backgroundColor: "white",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.system.gray5,
        overflow: "hidden",
        position: "relative",
    },
    itemContainerSelected: {
        borderColor: MINT_COLOR,
        borderWidth: 2,
        backgroundColor: "white",
        shadowColor: `${MINT_COLOR}`,
        shadowOffset: { width: 10, height: 10 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 8,
    },
    itemContainerDisabled: {
        opacity: 0.8,
    },
    imageContainer: {
        width: "85%",
        height: "85%",
        justifyContent: "center",
        alignItems: "center",
    },
    image: {
        width: "100%",
        height: "100%",
    },
    imageDisabled: {
        opacity: 0.8,
    },
});
