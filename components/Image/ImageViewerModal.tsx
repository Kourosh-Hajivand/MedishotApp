import colors from "@/theme/colors";
import { getRelativeTime } from "@/utils/helper/dateUtils";
import { Patient } from "@/utils/service/models/ResponseModels";
import { Button, Host, HStack } from "@expo/ui/swift-ui";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import { Dimensions, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { FlatList, Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeOut, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BaseText } from "../text/BaseText";

const { width, height } = Dimensions.get("window");

interface ImageViewerModalProps {
    visible: boolean;
    images: string[];
    initialIndex: number;
    onClose: () => void;
    patientData?: Patient;
}

interface ThumbnailItemProps {
    imageUri: string;
    index: number;
    isActive: boolean;
    onPress: () => void;
    scrollProgress: ReturnType<typeof useSharedValue<number>>;
    currentIndexShared: ReturnType<typeof useSharedValue<number>>; // Shared value for worklet access
}

const ThumbnailItem: React.FC<ThumbnailItemProps> = ({ imageUri, index, isActive, onPress, scrollProgress, currentIndexShared }) => {
    const animatedThumbnailStyle = useAnimatedStyle(() => {
        // Calculate active progress based on current index and scroll progress
        const currentIdx = currentIndexShared.value;
        const distance = index - currentIdx;
        const progress = scrollProgress.value;

        let activeProgress = 0; // 0 = inactive, 1 = fully active

        if (distance === 0) {
            // Current thumbnail - becomes less active as we drag away
            activeProgress = 1 - Math.abs(progress);
        } else if (distance === 1 && progress > 0) {
            // Next thumbnail (index = currentIdx + 1) - becomes active when dragging right
            activeProgress = progress;
        } else if (distance === -1 && progress < 0) {
            // Previous thumbnail (index = currentIdx - 1) - becomes active when dragging left
            activeProgress = Math.abs(progress);
        }

        // Clamp activeProgress between 0 and 1
        activeProgress = Math.max(0, Math.min(1, activeProgress));

        // Interpolate width: 30 (inactive) -> 50 (active)
        const width = 30 + activeProgress * 20;
        // Interpolate margin: 0 (inactive) -> 4 (active)
        const margin = activeProgress * 4;

        return {
            width: width,
            marginHorizontal: margin,
        };
    });

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
            <Animated.View style={[styles.thumbnail, animatedThumbnailStyle]}>
                <Image source={{ uri: imageUri }} style={styles.thumbnailImage} contentFit="cover" />
            </Animated.View>
        </TouchableOpacity>
    );
};

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ visible, images, initialIndex, onClose, patientData }) => {
    const insets = useSafeAreaInsets();
    const flatListRef = useRef<FlatList>(null);
    const thumbnailScrollRef = useRef<ScrollView>(null);
    const isProgrammaticScroll = useRef(false);
    const isThumbnailProgrammaticScroll = useRef(false);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [imageSizes, setImageSizes] = useState<Record<number, { width: number; height: number }>>({});
    const [isZoomed, setIsZoomed] = useState(false);

    // Shared values for zoom and pan (only for current image)
    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedScale = useSharedValue(1);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);
    const scrollProgress = useSharedValue(0); // Progress of swipe: -1 to 1 (left to right)
    const currentIndexShared = useSharedValue(initialIndex); // Shared value for current index

    const scrollThumbnailToPosition = React.useCallback(
        (currentPage: number, animated: boolean = false) => {
            if (thumbnailScrollRef.current) {
                isThumbnailProgrammaticScroll.current = true;
                const activeThumbnailWidth = 50;
                const inactiveThumbnailWidth = 30;
                const thumbnailGap = 4;
                const activeThumbnailMargin = 4;
                const padding = width / 2 - 25;

                // Calculate which thumbnail is currently active (rounded)
                const roundedIndex = Math.round(currentPage);
                const fromIndex = Math.floor(currentPage);
                const toIndex = Math.min(Math.ceil(currentPage), images.length - 1);
                const progress = currentPage - fromIndex;

                // Calculate center position for each thumbnail index
                const getThumbnailCenter = (idx: number, isActive: boolean) => {
                    let position = padding;
                    for (let i = 0; i < idx; i++) {
                        const prevIsActive = i === roundedIndex;
                        const prevMargin = prevIsActive ? activeThumbnailMargin : 0;
                        const prevWidth = prevIsActive ? activeThumbnailWidth : inactiveThumbnailWidth;
                        position += prevMargin + prevWidth + prevMargin + thumbnailGap;
                    }
                    const thumbMargin = isActive ? activeThumbnailMargin : 0;
                    const thumbWidth = isActive ? activeThumbnailWidth : inactiveThumbnailWidth;
                    position += thumbMargin + thumbWidth / 2;
                    return position;
                };

                // Interpolate between two adjacent thumbnails

                const fromPosition = getThumbnailCenter(fromIndex, fromIndex === roundedIndex);
                const toPosition = fromIndex === toIndex ? fromPosition : getThumbnailCenter(toIndex, toIndex === roundedIndex);

                // Interpolate smoothly between positions
                const thumbnailCenterPosition = fromPosition + (toPosition - fromPosition) * progress;

                // Calculate scroll position to center the thumbnail
                const scrollPosition = thumbnailCenterPosition - width / 2;

                // Calculate total width for max scroll
                let totalWidth = padding;
                for (let i = 0; i < images.length; i++) {
                    if (i === Math.round(currentPage)) {
                        totalWidth += activeThumbnailMargin + activeThumbnailWidth + activeThumbnailMargin + thumbnailGap;
                    } else {
                        totalWidth += inactiveThumbnailWidth + thumbnailGap;
                    }
                }
                totalWidth -= thumbnailGap;
                totalWidth += padding;
                const maxScroll = Math.max(0, totalWidth - width);

                thumbnailScrollRef.current.scrollTo({
                    x: Math.max(0, Math.min(scrollPosition, maxScroll)),
                    animated,
                });

                if (animated) {
                    setTimeout(() => {
                        isThumbnailProgrammaticScroll.current = false;
                    }, 300);
                } else {
                    setTimeout(() => {
                        isThumbnailProgrammaticScroll.current = false;
                    }, 50);
                }
            }
        },
        [images.length],
    );

    const scrollThumbnailToIndex = React.useCallback(
        (index: number, animated: boolean = true) => {
            scrollThumbnailToPosition(index, animated);
        },
        [scrollThumbnailToPosition],
    );

    // Keep currentIndexShared in sync with currentIndex
    React.useEffect(() => {
        currentIndexShared.value = currentIndex;
    }, [currentIndex]);

    // Reset zoom when changing images and scroll thumbnail
    React.useEffect(() => {
        scale.value = withTiming(1, { duration: 200 });
        translateX.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(0, { duration: 200 });
        setIsZoomed(false);

        // Scroll thumbnail to center current image - iOS-like smooth behavior
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                scrollThumbnailToIndex(currentIndex, true);
            });
        });
    }, [currentIndex, scrollThumbnailToIndex]);

    const handleScroll = (event: any) => {
        // Don't update index if scroll is programmatic (from thumbnail click)
        if (isProgrammaticScroll.current) {
            scrollProgress.value = 0;
            return;
        }
        const offsetX = event.nativeEvent.contentOffset.x;
        const currentPage = offsetX / width;
        const index = Math.round(currentPage);

        // Calculate scroll progress: -1 (swiping left) to 1 (swiping right)
        const progress = currentPage - index;
        scrollProgress.value = progress;

        // Update currentIndexShared to current rounded index
        // ThumbnailItem will calculate which thumbnail should be active based on progress
        currentIndexShared.value = index;

        // Smoothly scroll thumbnail gallery to match exact current position (including fractional part)
        // This creates perfectly smooth animation during drag
        if (currentPage >= 0 && currentPage < images.length) {
            scrollThumbnailToPosition(currentPage, false);
        }
    };

    const handleThumbnailScroll = (event: any) => {
        // Don't update index if scroll is programmatic (from useEffect)
        if (isThumbnailProgrammaticScroll.current) {
            return;
        }
        const scrollX = event.nativeEvent.contentOffset.x;
        const activeThumbnailWidth = 50;
        const inactiveThumbnailWidth = 30;
        const thumbnailGap = 4;
        const activeThumbnailMargin = 4;
        const centerX = scrollX + width / 2;
        const padding = width / 2 - 25;

        // Find which thumbnail is at center
        let currentWidth = padding;
        for (let i = 0; i < images.length; i++) {
            const isActive = i === currentIndex;
            const thumbWidth = isActive ? activeThumbnailWidth : inactiveThumbnailWidth;
            const thumbMargin = isActive ? activeThumbnailMargin : 0;
            const thumbStart = currentWidth + thumbMargin;
            const thumbEnd = currentWidth + thumbMargin + thumbWidth;

            if (centerX >= thumbStart && centerX <= thumbEnd) {
                if (i !== currentIndex) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    isProgrammaticScroll.current = true;
                    setCurrentIndex(i);
                    // No animation when dragging - instant change
                    flatListRef.current?.scrollToIndex({ index: i, animated: false });
                    // Reset flag immediately since no animation
                    setTimeout(() => {
                        isProgrammaticScroll.current = false;
                    }, 50);
                }
                break;
            }
            // Move to next thumbnail position
            if (isActive) {
                currentWidth += activeThumbnailMargin + thumbWidth + activeThumbnailMargin + thumbnailGap;
            } else {
                currentWidth += thumbWidth + thumbnailGap;
            }
        }
    };

    const handleMomentumScrollEnd = (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / width);
        scrollProgress.value = withTiming(0, { duration: 200 }); // Smoothly reset progress

        if (index !== currentIndex && index >= 0 && index < images.length) {
            setCurrentIndex(index);
            currentIndexShared.value = index;
            // Smoothly scroll thumbnail gallery to final position
            scrollThumbnailToIndex(index, true);
        } else if (index === currentIndex) {
            // Even if index didn't change, ensure thumbnail is centered
            scrollThumbnailToIndex(index, true);
        }
    };

    const handleEditPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const currentImageUri = images[currentIndex];
        onClose();
        setTimeout(() => {
            router.push({
                pathname: "/(fullmodals)/image-editor",
                params: { uri: currentImageUri },
            });
        }, 300);
    };

    const toggleControls = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setControlsVisible((prev) => !prev);
    };

    const handleImageLoad = (index: number, event: any) => {
        let imgWidth = 0;
        let imgHeight = 0;

        if (event?.source?.width && event?.source?.height) {
            imgWidth = event.source.width;
            imgHeight = event.source.height;
        } else if (event?.nativeEvent?.source?.width && event?.nativeEvent?.source?.height) {
            imgWidth = event.nativeEvent.source.width;
            imgHeight = event.nativeEvent.source.height;
        }

        if (imgWidth && imgHeight) {
            const imageAspectRatio = imgWidth / imgHeight;
            const screenAspectRatio = width / height;

            let displayWidth = width;
            let displayHeight = height;

            if (imageAspectRatio > screenAspectRatio) {
                displayHeight = width / imageAspectRatio;
            } else {
                displayWidth = height * imageAspectRatio;
            }

            setImageSizes((prev) => ({
                ...prev,
                [index]: { width: displayWidth, height: displayHeight },
            }));
        } else {
            setImageSizes((prev) => ({
                ...prev,
                [index]: { width: width, height: height },
            }));
        }
    };

    const createGestures = (index: number) => {
        // Only enable gestures for current image
        if (index !== currentIndex) {
            return Gesture.Tap();
        }

        const imageSize = imageSizes[index] || { width: width, height: height };

        const pinchGesture = Gesture.Pinch()
            .onStart(() => {
                savedScale.value = scale.value;
            })
            .onUpdate((e) => {
                scale.value = Math.max(1, Math.min(4, savedScale.value * e.scale));
            })
            .onEnd(() => {
                if (scale.value < 1) {
                    scale.value = withTiming(1, { duration: 200 });
                    runOnJS(setIsZoomed)(false);
                } else if (scale.value > 4) {
                    scale.value = withTiming(4, { duration: 200 });
                    runOnJS(setIsZoomed)(true);
                } else {
                    runOnJS(setIsZoomed)(scale.value > 1);
                }
            });

        const panGesture = Gesture.Pan()
            .activeOffsetY([-10, 10])
            .failOffsetX([-50, 50]) // Fail horizontal pan when not zoomed - allow FlatList to handle swipe
            .manualActivation(true)
            .onTouchesDown((e, state) => {
                // Only activate pan gesture when zoomed
                if (scale.value > 1) {
                    state.activate();
                } else {
                    state.fail();
                }
            })
            .onStart(() => {
                if (scale.value > 1) {
                    savedTranslateX.value = translateX.value;
                    savedTranslateY.value = translateY.value;
                }
            })
            .onUpdate((e) => {
                if (scale.value > 1) {
                    // When zoomed, allow panning within image bounds
                    translateX.value = savedTranslateX.value + e.translationX;
                    translateY.value = savedTranslateY.value + e.translationY;
                }
                // When not zoomed, don't interfere - let FlatList handle horizontal swipe
            })
            .onEnd((e) => {
                if (scale.value > 1 && imageSize.width > 0 && imageSize.height > 0) {
                    // Handle pan when zoomed
                    const scaledWidth = imageSize.width * scale.value;
                    const scaledHeight = imageSize.height * scale.value;
                    const maxTranslateX = Math.max(0, (scaledWidth - width) / 2);
                    const maxTranslateY = Math.max(0, (scaledHeight - height) / 2);

                    if (maxTranslateX > 0 && Math.abs(translateX.value) > maxTranslateX) {
                        translateX.value = withTiming(Math.sign(translateX.value) * maxTranslateX, { duration: 200 });
                    } else if (Math.abs(translateX.value) > width / 2) {
                        translateX.value = withTiming(0, { duration: 200 });
                    }

                    if (maxTranslateY > 0 && Math.abs(translateY.value) > maxTranslateY) {
                        translateY.value = withTiming(Math.sign(translateY.value) * maxTranslateY, { duration: 200 });
                    } else if (Math.abs(translateY.value) > height / 2) {
                        translateY.value = withTiming(0, { duration: 200 });
                    }
                } else {
                    // When not zoomed, reset translation
                    translateX.value = withTiming(0, { duration: 200 });
                    translateY.value = withTiming(0, { duration: 200 });
                }
            });

        const doubleTapGesture = Gesture.Tap()
            .numberOfTaps(2)
            .onEnd((e) => {
                if (scale.value > 1) {
                    scale.value = withTiming(1, { duration: 250 });
                    translateX.value = withTiming(0, { duration: 250 });
                    translateY.value = withTiming(0, { duration: 250 });
                    runOnJS(setIsZoomed)(false);
                } else {
                    // Zoom to 2x at tap location
                    const tapX = e.x - width / 2;
                    const tapY = e.y - height / 2;
                    scale.value = withTiming(2, { duration: 250 });
                    // Adjust translate to zoom towards tap point
                    translateX.value = withTiming(-tapX * 0.5, { duration: 250 });
                    translateY.value = withTiming(-tapY * 0.5, { duration: 250 });
                    runOnJS(setIsZoomed)(true);
                }
            });

        const singleTapGesture = Gesture.Tap()
            .numberOfTaps(1)
            .maxDuration(250)
            .onEnd(() => {
                // Always toggle controls, even when zoomed
                runOnJS(toggleControls)();
            });

        return Gesture.Simultaneous(Gesture.Simultaneous(pinchGesture, panGesture), Gesture.Exclusive(doubleTapGesture, singleTapGesture));
    };

    const imageAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }, { translateX: translateX.value }, { translateY: translateY.value }],
        };
    });

    const renderImageItem = ({ item, index }: { item: string; index: number }) => {
        const imageSize = imageSizes[index] || { width: width, height: height };
        const gestures = createGestures(index);
        const isCurrentImage = index === currentIndex;

        return (
            <View style={styles.imageWrapper}>
                <GestureDetector gesture={gestures}>
                    <Animated.View style={[styles.imageContainer, isCurrentImage && imageAnimatedStyle]}>
                        <Image
                            source={{ uri: item }}
                            style={[
                                styles.image,
                                imageSize.width > 0 && {
                                    width: imageSize.width,
                                    height: imageSize.height,
                                },
                            ]}
                            contentFit="contain"
                            onLoad={(e) => handleImageLoad(index, e)}
                        />
                    </Animated.View>
                </GestureDetector>
            </View>
        );
    };

    const headerOpacity = useSharedValue(1);
    const bottomBarOpacity = useSharedValue(1);

    React.useEffect(() => {
        if (controlsVisible) {
            headerOpacity.value = withTiming(1, { duration: 200 });
            bottomBarOpacity.value = withTiming(1, { duration: 200 });
        } else {
            headerOpacity.value = withTiming(0, { duration: 200 });
            bottomBarOpacity.value = withTiming(0, { duration: 200 });
        }
    }, [controlsVisible]);

    const headerAnimatedStyle = useAnimatedStyle(() => ({
        opacity: headerOpacity.value,
    }));

    const bottomBarAnimatedStyle = useAnimatedStyle(() => ({
        opacity: bottomBarOpacity.value,
    }));

    return (
        <Modal visible={visible} transparent={false} animationType="slide" presentationStyle="fullScreen">
            <GestureHandlerRootView style={styles.container}>
                <View style={styles.container}>
                    {/* Header */}
                    <Animated.View entering={FadeIn} exiting={FadeOut} style={[{ top: insets.top }, styles.header, headerAnimatedStyle, !controlsVisible && styles.hidden]}>
                        <View style={styles.headerContent}>
                            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.backButton}>
                                <Host style={{ width: 36, height: 36 }}>
                                    <Button systemImage="chevron.left" variant="glass" onPress={onClose} />
                                </Host>
                            </TouchableOpacity>

                            {/* Location Pill */}
                            <TouchableOpacity style={styles.locationPill} activeOpacity={0.8}>
                                <BaseText type="Caption1" weight={500} color="labels.primary">
                                    Tehran
                                </BaseText>
                                <BaseText type="Caption2" weight={400} color="labels.secondary" style={{ marginLeft: 4 }}>
                                    {patientData?.updated_at ? getRelativeTime(patientData.updated_at) : "Now"}
                                </BaseText>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => {}} activeOpacity={0.7} style={styles.menuButton}>
                                <Host style={{ width: 36, height: 36 }}>
                                    <Button systemImage="ellipsis" variant="glass" onPress={() => {}} />
                                </Host>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    {/* Image Carousel */}
                    <FlatList
                        ref={flatListRef}
                        horizontal
                        pagingEnabled
                        initialScrollIndex={initialIndex}
                        data={images}
                        keyExtractor={(_, i) => i.toString()}
                        onScroll={handleScroll}
                        onMomentumScrollEnd={handleMomentumScrollEnd}
                        scrollEventThrottle={16}
                        showsHorizontalScrollIndicator={false}
                        decelerationRate="fast"
                        snapToInterval={width}
                        snapToAlignment="center"
                        renderItem={renderImageItem}
                        getItemLayout={(_, index) => ({
                            length: width,
                            offset: width * index,
                            index,
                        })}
                        scrollEnabled={!isZoomed}
                    />

                    {/* Bottom Bar with Thumbnails and Actions */}
                    <Animated.View entering={FadeIn.delay(300)} exiting={FadeOut} style={[styles.bottomBar, { paddingBottom: insets.bottom }, bottomBarAnimatedStyle, !controlsVisible && styles.hidden]}>
                        {/* Thumbnail Gallery - Hide when zoomed */}
                        {!isZoomed && (
                            <ScrollView ref={thumbnailScrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailContainer} style={styles.thumbnailScroll} decelerationRate="fast" onScroll={handleThumbnailScroll} scrollEventThrottle={16}>
                                {images.map((imageUri, index) => (
                                    <ThumbnailItem
                                        key={index}
                                        imageUri={imageUri}
                                        index={index}
                                        isActive={index === currentIndex}
                                        currentIndexShared={currentIndexShared}
                                        scrollProgress={scrollProgress}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            scrollProgress.value = 0;
                                            isProgrammaticScroll.current = true;
                                            setCurrentIndex(index);
                                            flatListRef.current?.scrollToIndex({ index, animated: true });
                                            // Reset flag after animation completes (longer timeout to prevent handleScroll interference)
                                            setTimeout(() => {
                                                isProgrammaticScroll.current = false;
                                            }, 500);
                                        }}
                                    />
                                ))}
                            </ScrollView>
                        )}

                        {/* Action Buttons */}
                        <View style={styles.actionButtonsContainer}>
                            <Host style={{ width: "100%" }} matchContents={{ vertical: true }}>
                                <HStack alignment="center" spacing={20}>
                                    <Button systemImage="square.and.arrow.up" variant="glass" controlSize="regular" onPress={() => {}} />
                                    <Button systemImage="slider.horizontal.3" variant="glass" controlSize="regular" onPress={handleEditPress} />
                                    <Button systemImage="trash" variant="glass" controlSize="regular" onPress={handleEditPress} />
                                </HStack>
                            </Host>
                        </View>
                    </Animated.View>
                </View>
            </GestureHandlerRootView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.system.black,
    },
    header: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
        zIndex: 10,
    },
    headerContent: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 44,
    },
    backButton: {
        width: 36,
        height: 36,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1,
    },
    centerContent: {
        flex: 1,
        top: 40,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        maxWidth: 200,
        alignSelf: "center",
    },
    textContainer: {
        gap: 0,
    },
    hidden: {
        pointerEvents: "none",
    },
    closeButton: {
        position: "absolute",
        top: 50,
        right: 20,
        zIndex: 10,
    },
    editButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    imageWrapper: {
        width,
        height,
        justifyContent: "center",
        alignItems: "center",
    },
    imageContainer: {
        justifyContent: "center",
        alignItems: "center",
    },
    image: {
        maxWidth: width,
        maxHeight: height,
    },
    bottomBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    thumbnailScroll: {
        marginBottom: 6,
    },
    thumbnailContainer: {
        flexDirection: "row", // Center first/last thumbnails (active width / 2)
        alignItems: "center",
        paddingHorizontal: width / 2 - 25,
        gap: 4,
    },
    thumbnail: {
        height: 50,
        borderRadius: 6,
        overflow: "hidden",
        borderWidth: 0,
    },
    thumbnailImage: {
        width: "100%",
        height: "100%",
    },
    actionButtonsContainer: {
        alignItems: "center",
        justifyContent: "center",
    },
    locationPill: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    menuButton: {
        width: 36,
        height: 36,
        justifyContent: "center",
        alignItems: "center",
    },
    actionButton: {
        alignItems: "center",
        gap: 4,
        minWidth: 60,
    },
    pageIndicator: {
        backgroundColor: "rgba(255,255,255,0.15)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
});
