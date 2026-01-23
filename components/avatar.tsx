import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import colors from "../theme/colors.shared.js";

interface AvatarProps {
  name: string;
  imageUrl?: string;
  size?: number;
  haveRing?: boolean;
  rounded?: number;
  color?: string | null;
}

export default function Avatar({ name, imageUrl, size = 48, haveRing = false, rounded = 99, color }: AvatarProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const shimmerTranslateX = useSharedValue(-200);

  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  // Shimmer animation for skeleton (similar to Skeleton component)
  useEffect(() => {
    if (isLoading && imageUrl && !hasError) {
      shimmerTranslateX.value = withRepeat(
        withTiming(200, {
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        false
      );
    } else {
      shimmerTranslateX.value = -200;
    }
  }, [isLoading, imageUrl, hasError]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerTranslateX.value }],
  }));

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: rounded, overflow: "hidden" }, color ? { borderColor: color, borderWidth: 2 } : {}]} className={haveRing || color ? `p-[2px] ${!color ? "border-2 border-system-blue" : ""}` : ""}>
      <LinearGradient colors={["#C7C7CC", "#8E8E93"]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ borderRadius: rounded, width: "100%", height: "100%", justifyContent: "center", alignItems: "center" }}>
        {imageUrl && !hasError ? (
          <>
            {isLoading && (
              <View 
                style={[
                  styles.skeletonContainer, 
                  { 
                    width: size, 
                    height: size, 
                    borderRadius: rounded,
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    overflow: "hidden",
                  },
                ]} 
              >
                <Animated.View
                  style={[
                    {
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      width: "200%",
                    },
                    shimmerStyle,
                  ]}
                >
                  <LinearGradient
                    colors={[
                      "transparent",
                      "rgba(255, 255, 255, 0.3)",
                      "rgba(255, 255, 255, 0.6)",
                      "rgba(255, 255, 255, 0.3)",
                      "transparent",
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    locations={[0, 0.4, 0.5, 0.6, 1]}
                    style={{
                      width: "100%",
                      height: "100%",
                    }}
                  />
                </Animated.View>
              </View>
            )}
            <Image 
              source={{ uri: imageUrl }} 
              style={[styles.image, { width: size, height: size, borderRadius: rounded }, isLoading && styles.imageHidden]} 
              resizeMode="cover"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </>
        ) : (
          <Text className="text-white font-semibold" style={[styles.text, { fontSize: size * (haveRing ? 0.3 : 0.4) }]}>
            {initials}
          </Text>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 48,
    height: 48,
  },
  image: {
    width: 48,
    height: 48,
  },
  imageHidden: {
    opacity: 0,
  },
  skeletonContainer: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  gradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: colors.system.white,
    fontWeight: "600",
  },
});
