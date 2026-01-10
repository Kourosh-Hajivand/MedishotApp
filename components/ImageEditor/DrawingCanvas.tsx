import colors from "@/theme/colors.shared";
import * as Haptics from "expo-haptics";
import React, { useCallback, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    runOnJS,
    useAnimatedProps,
    useSharedValue,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface Stroke {
    id: string;
    path: Array<{ x: number; y: number }>;
    color: string;
    width: number;
}

interface DrawingCanvasProps {
    width: number;
    height: number;
    strokes: Stroke[];
    selectedColor: string;
    selectedStrokeWidth: number;
    onStrokesChange: (strokes: Stroke[]) => void;
    enabled?: boolean;
}

// Convert points array to SVG path string
const pointsToPath = (points: Array<{ x: number; y: number }>): string => {
    if (points.length === 0) return "";
    if (points.length === 1) {
        return `M ${points[0].x} ${points[0].y} L ${points[0].x} ${points[0].y}`;
    }

    let path = `M ${points[0].x} ${points[0].y}`;

    if (points.length === 2) {
        path += ` L ${points[1].x} ${points[1].y}`;
        return path;
    }

    // Use quadratic bezier curves for smoother lines
    for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        path += ` Q ${points[i].x} ${points[i].y} ${xc} ${yc}`;
    }

    // Connect to last point
    const lastPoint = points[points.length - 1];
    path += ` L ${lastPoint.x} ${lastPoint.y}`;

    return path;
};

// Current stroke component (while drawing)
const CurrentStroke: React.FC<{
    pathData: string;
    color: string;
    strokeWidth: number;
}> = ({ pathData, color, strokeWidth }) => {
    if (!pathData) return null;

    return (
        <Path
            d={pathData}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
        />
    );
};

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
    width,
    height,
    strokes,
    selectedColor,
    selectedStrokeWidth,
    onStrokesChange,
    enabled = true,
}) => {
    const [currentPath, setCurrentPath] = useState<Array<{ x: number; y: number }>>([]);
    const isDrawing = useRef(false);
    const strokeIdRef = useRef(0);

    const handleDrawStart = useCallback(() => {
        if (!enabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        isDrawing.current = true;
    }, [enabled]);

    const handleDrawUpdate = useCallback(
        (x: number, y: number) => {
            if (!enabled || !isDrawing.current) return;
            setCurrentPath((prev) => [...prev, { x, y }]);
        },
        [enabled]
    );

    const handleDrawEnd = useCallback(() => {
        if (!enabled || !isDrawing.current) return;
        isDrawing.current = false;

        if (currentPath.length > 1) {
            const newStroke: Stroke = {
                id: `stroke_${Date.now()}_${strokeIdRef.current++}`,
                path: [...currentPath],
                color: selectedColor,
                width: selectedStrokeWidth,
            };

            onStrokesChange([...strokes, newStroke]);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        setCurrentPath([]);
    }, [enabled, currentPath, selectedColor, selectedStrokeWidth, strokes, onStrokesChange]);

    const panGesture = Gesture.Pan()
        .enabled(enabled)
        .minDistance(0)
        .onStart((event) => {
            runOnJS(handleDrawStart)();
            runOnJS(handleDrawUpdate)(event.x, event.y);
        })
        .onUpdate((event) => {
            runOnJS(handleDrawUpdate)(event.x, event.y);
        })
        .onEnd(() => {
            runOnJS(handleDrawEnd)();
        })
        .onFinalize(() => {
            runOnJS(handleDrawEnd)();
        });

    if (width === 0 || height === 0) return null;

    return (
        <GestureDetector gesture={panGesture}>
            <View style={[styles.container, { width, height }]} pointerEvents={enabled ? "auto" : "none"}>
                <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
                    {/* Render completed strokes */}
                    {strokes.map((stroke) => (
                        <Path
                            key={stroke.id}
                            d={pointsToPath(stroke.path)}
                            stroke={stroke.color}
                            strokeWidth={stroke.width}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                        />
                    ))}

                    {/* Render current stroke */}
                    {currentPath.length > 0 && (
                        <CurrentStroke
                            pathData={pointsToPath(currentPath)}
                            color={selectedColor}
                            strokeWidth={selectedStrokeWidth}
                        />
                    )}
                </Svg>
            </View>
        </GestureDetector>
    );
};

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: 0,
        left: 0,
    },
});

export default DrawingCanvas;
