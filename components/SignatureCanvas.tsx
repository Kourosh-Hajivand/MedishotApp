import * as FileSystem from "expo-file-system/legacy";
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Dimensions, PanResponder, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CANVAS_WIDTH = SCREEN_WIDTH - 80; // padding
const CANVAS_HEIGHT = 268;

interface SignatureCanvasProps {
    onSave?: (base64: string, uri: string) => void;
    onClear?: () => void;
}

export interface SignatureCanvasRef {
    save: () => Promise<{ base64: string; uri: string } | null>;
    clear: () => void;
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;
}

export const SignatureCanvas = forwardRef<SignatureCanvasRef, SignatureCanvasProps>(({ onSave, onClear }, ref) => {
    const [paths, setPaths] = useState<Array<{ d: string; strokeWidth: number }>>([]);
    const [currentPath, setCurrentPath] = useState<{ d: string; strokeWidth: number } | null>(null);
    const [history, setHistory] = useState<Array<Array<{ d: string; strokeWidth: number }>>>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const viewRef = useRef<View>(null);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                const newPath = {
                    d: `M${locationX},${locationY}`,
                    strokeWidth: 2,
                };
                setCurrentPath(newPath);
            },
            onPanResponderMove: (evt) => {
                setCurrentPath((prev) => {
                    if (!prev) return null;
                    const { locationX, locationY } = evt.nativeEvent;
                    return {
                        ...prev,
                        d: `${prev.d} L${locationX},${locationY}`,
                    };
                });
            },
            onPanResponderRelease: () => {
                setCurrentPath((current) => {
                    if (current) {
                        setPaths((prevPaths) => {
                            const newPaths = [...prevPaths, current];
                            // Update history
                            setHistory((prevHistory) => {
                                const newHistory = prevHistory.slice(0, historyIndex + 1);
                                newHistory.push(newPaths);
                                setHistoryIndex(newHistory.length - 1);
                                return newHistory;
                            });
                            return newPaths;
                        });
                    }
                    return null;
                });
            },
        }),
    ).current;

    const handleClear = () => {
        setPaths([]);
        setCurrentPath(null);
        setHistory([]);
        setHistoryIndex(-1);
        onClear?.();
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setPaths(history[newIndex]);
            setCurrentPath(null);
        } else if (historyIndex === 0) {
            setHistoryIndex(-1);
            setPaths([]);
            setCurrentPath(null);
        }
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setPaths(history[newIndex]);
            setCurrentPath(null);
        }
    };

    const canUndo = () => {
        return historyIndex >= 0;
    };

    const canRedo = () => {
        return historyIndex < history.length - 1;
    };

    const save = async (): Promise<{ base64: string; uri: string } | null> => {
        if (paths.length === 0 && !currentPath) {
            return null;
        }

        try {
            // Create SVG string
            const svgString = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    ${paths.map((path) => `<path d="${path.d}" stroke="#000" stroke-width="${path.strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`).join("\n    ")}
    ${currentPath ? `<path d="${currentPath.d}" stroke="#000" stroke-width="${currentPath.strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round" />` : ""}
</svg>`;

            // Save SVG to temporary file
            if (!FileSystem.documentDirectory) {
                if (__DEV__) console.error("FileSystem.documentDirectory is not available");
                return null;
            }

            const tempUri = FileSystem.documentDirectory + `signature_${Date.now()}.svg`;
            await FileSystem.writeAsStringAsync(tempUri, svgString, {
                encoding: FileSystem.EncodingType.UTF8,
            });

            // Convert to base64
            const base64 = await FileSystem.readAsStringAsync(tempUri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            return { base64, uri: tempUri };
        } catch (error) {
            if (__DEV__) console.error("Error saving signature:", error);
            return null;
        }
    };

    useImperativeHandle(ref, () => ({
        save,
        clear: handleClear,
        undo: handleUndo,
        redo: handleRedo,
        canUndo,
        canRedo,
    }));

    const handleSave = async () => {
        const result = await save();
        if (result) {
            onSave?.(result.base64, result.uri);
        }
    };

    return (
        <View style={styles.container}>
            <View ref={viewRef} collapsable={false} style={styles.canvas} {...panResponder.panHandlers}>
                <Svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT}>
                    {paths.map((path, index) => (
                        <Path key={index} d={path.d} stroke="#000" strokeWidth={path.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    ))}
                    {currentPath && <Path d={currentPath.d} stroke="#000" strokeWidth={currentPath.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
                </Svg>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "white",
        borderRadius: 12,
        margin: 20,
        padding: 4,
    },
    canvas: {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: "white",
    },
});
