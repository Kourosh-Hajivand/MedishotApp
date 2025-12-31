import { useHeaderHeight } from "@react-navigation/elements";
import React, { useEffect, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, ScrollViewProps, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface KeyboardAwareScrollViewProps extends ScrollViewProps {
    children: React.ReactNode;
    keyboardPaddingBottom?: number; // Custom padding bottom when keyboard is visible (iOS)
    keyboardPaddingBottomAndroid?: number; // Custom padding bottom when keyboard is visible (Android)
    minPaddingBottom?: number; // Minimum padding bottom when keyboard is hidden
    backgroundColor?: string;
}

export const KeyboardAwareScrollView: React.FC<KeyboardAwareScrollViewProps> = ({ children, keyboardPaddingBottom, keyboardPaddingBottomAndroid, minPaddingBottom = 20, backgroundColor, contentContainerStyle, style, ...scrollViewProps }) => {
    const insets = useSafeAreaInsets();
    const headerHeight = useHeaderHeight();
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

    // Default keyboard padding values
    const defaultKeyboardPadding = Platform.OS === "ios" ? 300 : 200;
    const iosPadding = keyboardPaddingBottom ?? defaultKeyboardPadding;
    const androidPadding = keyboardPaddingBottomAndroid ?? defaultKeyboardPadding;

    // Track keyboard visibility
    useEffect(() => {
        const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
            setIsKeyboardVisible(true);
        });
        const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
            setIsKeyboardVisible(false);
        });

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, []);

    // Calculate padding bottom based on keyboard visibility
    const paddingBottom = isKeyboardVisible ? (Platform.OS === "ios" ? iosPadding : androidPadding) : insets.bottom + minPaddingBottom;

    // Merge contentContainerStyle with our padding
    const mergedContentContainerStyle: ViewStyle = {
        paddingBottom,
        ...(typeof contentContainerStyle === "object" && !Array.isArray(contentContainerStyle) ? contentContainerStyle : {}),
        ...(Array.isArray(contentContainerStyle) ? Object.assign({}, ...contentContainerStyle.filter((s): s is ViewStyle => typeof s === "object" && s !== null)) : {}),
    };

    const defaultKeyboardShouldPersistTaps = scrollViewProps.keyboardShouldPersistTaps ?? "handled";
    const defaultOnScrollBeginDrag = scrollViewProps.onScrollBeginDrag ?? (() => Keyboard.dismiss());

    // Build KeyboardAvoidingView style
    const keyboardAvoidingViewStyle: ViewStyle = {
        flex: 1,
        ...(backgroundColor ? { backgroundColor } : {}),
    };

    return (
        <KeyboardAvoidingView style={keyboardAvoidingViewStyle} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 0}>
            <ScrollView
                {...scrollViewProps}
                style={style}
                contentContainerStyle={mergedContentContainerStyle}
                keyboardShouldPersistTaps={defaultKeyboardShouldPersistTaps}
                onScrollBeginDrag={defaultOnScrollBeginDrag}
                keyboardDismissMode={scrollViewProps.keyboardDismissMode ?? "interactive"}
                showsVerticalScrollIndicator={scrollViewProps.showsVerticalScrollIndicator ?? false}
            >
                {children}
            </ScrollView>
        </KeyboardAvoidingView>
    );
};
