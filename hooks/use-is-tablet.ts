import { useEffect, useState } from "react";
import { Dimensions, Platform } from "react-native";

/**
 * Hook to detect if device is a tablet
 * @param breakpoint - Width breakpoint to consider device as tablet (default: 768)
 */
export function useIsTablet(breakpoint: number = 768): boolean {
    const [isTablet, setIsTablet] = useState(false);

    useEffect(() => {
        const updateIsTablet = () => {
            const { width, height } = Dimensions.get("window");
            const screenWidth = width > height ? width : height;
            setIsTablet(screenWidth >= breakpoint);
        };

        updateIsTablet();
        const subscription = Dimensions.addEventListener("change", updateIsTablet);

        return () => {
            subscription?.remove();
        };
    }, [breakpoint]);

    return isTablet;
}

/**
 * Get screen dimensions
 */
export function useScreenDimensions() {
    const [dimensions, setDimensions] = useState(Dimensions.get("window"));

    useEffect(() => {
        const subscription = Dimensions.addEventListener("change", ({ window }) => {
            setDimensions(window);
        });

        return () => {
            subscription?.remove();
        };
    }, []);

    return dimensions;
}

