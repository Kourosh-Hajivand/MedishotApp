/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";
export const iconSize = 26;
export const containerSize = 48;

const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";
export const headerHeight = 115;
export const Colors = {
    light: {
        text: "#11181C",
        background: "#fff",
        tint: tintColorLight,
        icon: "#687076",
        tabIconDefault: "#687076",
        tabIconSelected: tintColorLight,
    },
    dark: {
        text: "#ECEDEE",
        background: "#151718",
        tint: tintColorDark,
        icon: "#9BA1A6",
        tabIconDefault: "#9BA1A6",
        tabIconSelected: tintColorDark,
    },
};

export const Fonts = Platform.select({
    ios: {
        /** iOS `UIFontDescriptorSystemDesignDefault` */
        sans: "system-ui",
        /** iOS `UIFontDescriptorSystemDesignSerif` */
        serif: "ui-serif",
        /** iOS `UIFontDescriptorSystemDesignRounded` */
        rounded: "ui-rounded",
        /** iOS `UIFontDescriptorSystemDesignMonospaced` */
        mono: "ui-monospace",
    },
    default: {
        sans: "normal",
        serif: "serif",
        rounded: "normal",
        mono: "monospace",
    },
    web: {
        sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        serif: "Georgia, 'Times New Roman', serif",
        rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
        mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    },
});

/**
 * Tablet and responsive design constants
 */
export const Layout = {
    /** Breakpoint width to consider device as tablet (in pixels) */
    TABLET_BREAKPOINT: 768,
    /** Maximum width for content on tablet (in pixels) */
    TABLET_MAX_WIDTH: 600,
    /** Background color for side areas on tablet */
    TABLET_SIDE_BACKGROUND: "#f5f5f7",
} as const;
