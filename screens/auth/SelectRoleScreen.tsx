// import { BlurView } from "@react-native-community/blur";
import { Button, Host } from "@expo/ui/swift-ui";
import { BlurView } from "expo-blur";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { Dimensions, FlatList, NativeSyntheticEvent, NativeScrollEvent, StyleSheet, View } from "react-native";
import Animated, { Extrapolate, interpolate, interpolateColor, SharedValue, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { BaseText } from "../../components";
import { spacing } from "../../styles/spaces";
import { SPECIALTIES } from "../../utils/data/SPECIALTIES";

const { width, height } = Dimensions.get("window");
const ITEM_WIDTH = width * 0.33;
const CENTER_OFFSET = (width - ITEM_WIDTH) / 2;

// Create an Animated version of FlatList
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList) as typeof FlatList<(typeof SPECIALTIES)[number]>;

type SpecialtyItemProps = {
    item: (typeof SPECIALTIES)[number];
    index: number;
    scrollX: SharedValue<number>;
};

const SpecialtyItem: React.FC<SpecialtyItemProps> = ({ item, index, scrollX }) => {
    const inputRange = [(index - 1) * ITEM_WIDTH, index * ITEM_WIDTH, (index + 1) * ITEM_WIDTH];

    const iconStyle = useAnimatedStyle(() => {
        const scale = interpolate(scrollX.value, inputRange, [0.8, 1, 0.8], Extrapolate.CLAMP);
        const opacity = interpolate(scrollX.value, inputRange, [0.4, 1, 0.4], Extrapolate.CLAMP);
        const translateY = interpolate(scrollX.value, inputRange, [10, -5, 10], Extrapolate.CLAMP);
        const rotate = interpolate(scrollX.value, inputRange, [5, 0, -5], Extrapolate.CLAMP);

        return {
            transform: [{ scale }, { rotate: `${rotate}deg` }, { translateY }],
            opacity,
            zIndex: 10,
        };
    });

    const bgStyle = useAnimatedStyle(() => {
        const scale = interpolate(scrollX.value, inputRange, [0.7, 0.9, 0.7], Extrapolate.CLAMP);
        const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolate.CLAMP);
        const translateY = interpolate(scrollX.value, inputRange, [10, -10, 10], Extrapolate.CLAMP);
        return {
            transform: [{ scale }, { translateY }],
            opacity,
        };
    });

    const Icon = item.icon;
    return (
        <View style={styles.itemContainer}>
            <Animated.Image source={require("../../assets/WhiteLight.png")} style={[styles.backgroundImage, bgStyle]} resizeMode="contain" />
            <Animated.View style={[styles.iconContainer, iconStyle]}>
                <Icon width={130} height={130} strokeWidth={0} />
            </Animated.View>
        </View>
    );
};

const Dot: React.FC<SpecialtyItemProps> = ({ index, scrollX }) => {
    const inputRange = [(index - 1) * ITEM_WIDTH, index * ITEM_WIDTH, (index + 1) * ITEM_WIDTH];

    const style = useAnimatedStyle(() => {
        const opacity = interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], Extrapolate.CLAMP);
        const scale = interpolate(scrollX.value, inputRange, [1, 1.2, 1], Extrapolate.CLAMP);
        return {
            opacity,
            transform: [{ scale }],
        };
    });

    return <Animated.View style={[styles.dot, style]} />;
};

const DescriptionItem: React.FC<SpecialtyItemProps> = ({ item, index, scrollX }) => {
    const inputRange = [(index - 1) * ITEM_WIDTH, index * ITEM_WIDTH, (index + 1) * ITEM_WIDTH];

    const style = useAnimatedStyle(() => {
        const translateX = interpolate(scrollX.value, inputRange, [width * 0.3, 0, -width * 0.3], Extrapolate.CLAMP);
        const scale = interpolate(scrollX.value, inputRange, [0.8, 1, 0.8], Extrapolate.CLAMP);
        const opacity = interpolate(scrollX.value, [(index - 0.5) * ITEM_WIDTH, index * ITEM_WIDTH, (index + 0.5) * ITEM_WIDTH], [0, 1, 0], Extrapolate.CLAMP);
        return {
            opacity,
            transform: [{ translateX }, { scale }],
        };
    });

    return (
        <Animated.View style={[styles.descriptionItem, style]}>
            <BaseText type="Title1" weight="700" className="mb-2 text-center">
                {item.title}
            </BaseText>
            <BaseText type="Body" color="labels.secondary" align="center" className="w-[340px] text-center">
                {item.description}
            </BaseText>
        </Animated.View>
    );
};

export const SelectRoleScreen: React.FC = () => {
    const router = useRouter();
    const params = useLocalSearchParams<{ requirePractice?: string }>();
    const requirePractice = params.requirePractice === "1";
    const [currentIndex, setCurrentIndex] = useState(0);
    const navigation = useNavigation();
    /**
     * Reanimated shared values & handlers
     */
    const scrollX = useSharedValue(0);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollX.value = event.contentOffset.x;
        },
    });

    const onMomentumEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / ITEM_WIDTH);
        setCurrentIndex(index);
    }, []);

    /**
     * Background color interpolation
     */
    const backgroundColors = useMemo(() => SPECIALTIES.map((s) => s.backgroundColor), []);
    const backgroundStyle = useAnimatedStyle(() => {
        const backgroundColor = interpolateColor(
            scrollX.value,
            SPECIALTIES.map((_, i) => i * ITEM_WIDTH),
            backgroundColors,
        );
        return { backgroundColor };
    });

    /**
     * Navigate forward
     */
    const handleContinue = useCallback(() => {
        const pushParams: { practiceType: string; requirePractice?: string } = { practiceType: JSON.stringify(SPECIALTIES[currentIndex]) };
        if (requirePractice) pushParams.requirePractice = "1";
        router.push({ pathname: "/(auth)/create-practice", params: pushParams });
    }, [currentIndex, requirePractice, router]);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <Host style={{ width: 65, height: 35 }}>
                    <Button onPress={handleContinue}>Next</Button>
                </Host>
            ),
            ...(requirePractice && {
                headerLeft: () => null,
                gestureEnabled: false,
                fullScreenGestureEnabled: false,
            }),
        });
    }, [navigation, handleContinue, requirePractice]);

    return (
        <SafeAreaView style={[styles.container]} className="flex-1 items-center justify-between pb-[30%]">
            {/* Animated background */}

            <View style={StyleSheet.absoluteFill}>
                <Animated.View style={[styles.radialOverlay, backgroundStyle, { opacity: 0.3 }]} />
                <BlurView style={StyleSheet.absoluteFill} intensity={100} tint="light" experimentalBlurMethod="dimezisBlurView" />
            </View>

            {/* Title */}
            <View style={styles.titleContainer} className="absolute top-[12%]">
                <BaseText type="Title2" color="system.black" weight="400">
                    Choose Specialty:
                </BaseText>
            </View>

            {/* Icons */}
            <AnimatedFlatList
                data={SPECIALTIES}
                keyExtractor={(item) => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={ITEM_WIDTH}
                decelerationRate={0.8}
                contentContainerStyle={{
                    paddingHorizontal: CENTER_OFFSET,
                    paddingTop: 180,
                }}
                renderItem={({ item, index }: { item: (typeof SPECIALTIES)[number]; index: number }) => <SpecialtyItem item={item} index={index} scrollX={scrollX} />}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                initialNumToRender={3}
                getItemLayout={(_, index) => ({
                    length: ITEM_WIDTH,
                    offset: ITEM_WIDTH * index,
                    index,
                })}
                bounces={false}
                overScrollMode="never"
                onMomentumScrollEnd={onMomentumEnd}
            />

            {/* Dots & description */}
            <View>
                <View style={styles.dotsContainer} className="mt-4 flex-row justify-center">
                    {SPECIALTIES.map((_, idx) => (
                        <Dot key={`dot-${idx}`} item={_} index={idx} scrollX={scrollX} />
                    ))}
                </View>
                <View style={styles.descriptionContainer} className="mt-6 items-center justify-center overflow-hidden">
                    {SPECIALTIES.map((item, idx) => (
                        <DescriptionItem key={`desc-${item.id}`} item={item} index={idx} scrollX={scrollX} />
                    ))}
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: "30%",
    },
    blurCircle: {
        position: "absolute",
        top: height * 0.12,
        left: width / 2 - 180,
        width: 360,
        height: 240,
        borderRadius: 120,
        overflow: "hidden",
        zIndex: -1,
        transform: [{ scale: 1.1 }],
    },
    titleContainer: {
        position: "absolute",
        top: "12%",
    },
    itemContainer: {
        width: ITEM_WIDTH,
        alignItems: "center",
        justifyContent: "center",
    },
    backgroundImage: {
        position: "absolute",
        width: 300,
        height: 300,
    },
    iconContainer: {},
    dotsContainer: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: spacing["4"],
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
        backgroundColor: "black",
    },
    descriptionContainer: {
        width,
        height: 120,
        overflow: "hidden",
        marginTop: spacing["6"],
        alignItems: "center",
        justifyContent: "center",
    },
    descriptionItem: {
        position: "absolute",
        width,
        alignItems: "center",
        paddingHorizontal: 20,
    },
    buttonContainer: {
        width: "100%",
        paddingHorizontal: spacing["10"],
        marginTop: spacing["10"],
    },
    radialOverlay: {
        position: "absolute",
        top: height / 2 - 380,
        left: width / 2 - 350,
        width: 700,
        height: 700,
        borderRadius: 350,
        opacity: 0.7,
        transform: [{ scale: 1 }],
    },
});

SelectRoleScreen.displayName = "SelectRoleScreen";
