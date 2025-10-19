import React from "react";
import { ActivityIndicator, Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { IButtonProps } from "../../models/models";
import { colors } from "../../theme/colors";
import { BaseText, TextColor } from "../text/BaseText";

import { spacing } from "../../styles/spaces";

export default function BaseButton({ label, onPress, disabled, isLoading, style, size = "Medium", ButtonStyle = "Filled", noText, rounded, srcLeft, srcRight, leftIcon, rightIcon, className, ...rest }: IButtonProps) {
    const isDark = "dark";

    const sizeStyles = {
        Small: { height: 28, fontSize: 14, paddingHorizontal: 10 },
        Medium: { height: 34, fontSize: 16, paddingHorizontal: 14 },
        Large: { height: 50, fontSize: 18, paddingHorizontal: 20 },
        XLarge: { height: 58, fontSize: 20, paddingHorizontal: 26 },
    };

    const getStyleType = () => {
        if (isDark) {
            return {
                Filled: {
                    backgroundColor: colors["system-dark"].blue,
                    color: colors["system-dark"].white,
                },
                Tinted: {
                    backgroundColor: "rgba(10, 132, 255, 0.15)",
                    color: colors["system-dark"].blue,
                },
                Gray: {
                    backgroundColor: "rgba(120, 120, 128, 0.24)",
                    color: colors["system-dark"].blue,
                },
                Plain: {
                    backgroundColor: "transparent",
                    color: colors["system-dark"].blue,
                },
            };
        } else {
            return {
                Filled: {
                    backgroundColor: colors.system.blue,
                    color: colors.system.white,
                },
                Tinted: {
                    backgroundColor: "rgba(0, 122, 255, 0.15)",
                    color: colors.system.blue,
                },
                Gray: { backgroundColor: colors.system.gray6, color: colors.system.blue },
                Plain: { backgroundColor: "transparent", color: colors.system.blue },
            };
        }
    };

    const styleType = getStyleType();
    const currentSize = sizeStyles[size];
    const currentStyle = styleType[ButtonStyle];

    const getBackgroundColor = () => {
        if (disabled && ButtonStyle !== "Plain") {
            return isDark ? "rgba(120, 120, 128, 0.12)" : "rgba(120, 120, 128, 0.12)";
        }
        return currentStyle.backgroundColor;
    };

    const getTextColor = (): TextColor => {
        if (disabled) {
            return "labels.tertiary";
        }

        // Return appropriate text color based on button style and theme
        if (ButtonStyle === "Filled") {
            return "system.white";
        } else {
            return "system.blue";
        }
    };

    const getActivityIndicatorColor = () => {
        return currentStyle.color;
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || isLoading}
            className={className}
            style={[
                styles.button,
                {
                    borderRadius: rounded ? 999 : 16,
                    opacity: disabled ? 1 : 1,
                    backgroundColor: getBackgroundColor(),
                    height: currentSize.height,
                    paddingHorizontal: currentSize.paddingHorizontal,
                },
                style,
            ]}
            {...rest}
        >
            {srcLeft && <Image source={srcLeft} style={styles.icon} />}
            {leftIcon && <View>{leftIcon}</View>}
            {isLoading && <ActivityIndicator size="small" color={getActivityIndicatorColor()} />}
            {!noText && !!label && (
                <BaseText type={size === "Small" ? "Subhead" : size === "Medium" ? "Subhead" : size === "Large" ? "Body" : "Title3"} color={getTextColor()} weight={size !== "XLarge" ? "400" : "600"} style={{ fontSize: currentSize.fontSize }}>
                    {label}
                </BaseText>
            )}
            {rightIcon && <View>{rightIcon}</View>}
            {srcRight && <Image source={srcRight} style={styles.icon} />}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing["1"],
    },
    icon: {
        width: 20,
        height: 20,
    },
});
