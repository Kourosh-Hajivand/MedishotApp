import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Keyboard, LayoutChangeEvent, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
// import {ClearIcon, DictationIcon, SearchGlyphIcon} from '../../../assets/icons';
import colors from "../../../theme/colors";
import { cn } from "../../../utils/helper/HelperFunction";
import { BaseText } from "../../text/BaseText";

interface SearchBoxProps {
    placeholder?: string;
    value: string;
    onChangeText: (text: string) => void;
    onMicPress?: () => void;
    onClearPress?: () => void;
    className?: string;
    onFocus?: () => void;
    onBlur?: () => void;
}

export default function SearchBox({ placeholder = "Search", value, onChangeText, onMicPress, onClearPress, className, onFocus, onBlur }: SearchBoxProps) {
    const micScale = useRef(new Animated.Value(1)).current;
    const clearScale = useRef(new Animated.Value(0)).current;
    const micOpacity = useRef(new Animated.Value(1)).current;
    const clearOpacity = useRef(new Animated.Value(0)).current;

    const cancelAnim = useRef(new Animated.Value(0)).current;
    const inputWidth = useRef(new Animated.Value(0)).current;
    const [containerWidth, setContainerWidth] = useState(0);
    const [focused, setFocused] = useState(false);

    useEffect(() => {
        const isEmpty = !value;

        Animated.parallel([
            Animated.timing(micScale, {
                toValue: isEmpty ? 1 : 0,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(micOpacity, {
                toValue: isEmpty ? 1 : 0,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(clearScale, {
                toValue: isEmpty ? 0 : 1,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(clearOpacity, {
                toValue: isEmpty ? 0 : 1,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start();
    }, [value]);

    const handleFocus = () => {
        setFocused(true);
        Animated.parallel([
            Animated.timing(cancelAnim, {
                toValue: 1,
                duration: 250,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(inputWidth, {
                toValue: containerWidth - 60, // leave space for Cancel
                duration: 250,
                easing: Easing.out(Easing.ease),
                useNativeDriver: false,
            }),
        ]).start();
    };

    const handleBlur = () => {
        setFocused(false);
    };

    const handleCancel = () => {
        onClearPress?.();
        setFocused(false);
        Keyboard.dismiss();
        Animated.parallel([
            Animated.timing(cancelAnim, {
                toValue: 0,
                duration: 250,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(inputWidth, {
                toValue: containerWidth,
                duration: 250,
                easing: Easing.out(Easing.ease),
                useNativeDriver: false,
            }),
        ]).start();
    };

    const onLayout = (e: LayoutChangeEvent) => {
        const width = e.nativeEvent.layout.width;
        setContainerWidth(width);
        inputWidth.setValue(focused ? width - 70 : width);
    };

    return (
        <View style={styles.container} className={cn("flex-row items-center", className)} onLayout={onLayout}>
            <Animated.View
                style={[
                    styles.searchContainer,
                    {
                        width: inputWidth,
                    },
                ]}
            >
                {/* <SearchGlyphIcon width={20} height={20} strokeWidth={0} /> */}
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="#8E8E93"
                    onFocus={() => {
                        handleFocus();
                        onFocus?.();
                    }}
                    onBlur={() => {
                        handleBlur();
                        onBlur?.();
                    }}
                    style={styles.textInput}
                    className="flex-1 ml-2 text-[16px] text-black pr-6"
                />

                {/* Mic */}
                <Animated.View
                    style={[
                        styles.iconContainer,
                        {
                            transform: [{ scale: micScale }],
                            opacity: micOpacity,
                        },
                    ]}
                >
                    <TouchableOpacity onPress={onMicPress}>{/* <DictationIcon width={20} height={20} strokeWidth={0} /> */}</TouchableOpacity>
                </Animated.View>

                {/* Clear */}
                <Animated.View
                    style={[
                        styles.iconContainer,
                        {
                            transform: [{ scale: clearScale }],
                            opacity: clearOpacity,
                        },
                    ]}
                >
                    <TouchableOpacity onPress={onClearPress}>{/* <ClearIcon width={20} height={20} strokeWidth={0} /> */}</TouchableOpacity>
                </Animated.View>
            </Animated.View>

            {/* Cancel Button */}
            <Animated.View
                style={[
                    styles.cancelContainer,
                    {
                        opacity: cancelAnim,
                        transform: [
                            {
                                translateX: cancelAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [40, 0],
                                }),
                            },
                        ],
                    },
                ]}
            >
                {focused && (
                    <TouchableOpacity onPress={handleCancel}>
                        <Animated.View>
                            <BaseText type="Body" weight={400} color="system.blue">
                                Cancel
                            </BaseText>
                        </Animated.View>
                    </TouchableOpacity>
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
    },
    searchContainer: {
        borderRadius: 10,
        backgroundColor: "#F1F1F3",
        paddingHorizontal: 8,
        paddingVertical: 7,
        flexDirection: "row",
        alignItems: "center",
    },
    textInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: colors.text,
        paddingRight: 24,
    },
    iconContainer: {
        position: "absolute",
        right: 10,
    },
    cancelContainer: {
        marginLeft: 8,
    },
});
