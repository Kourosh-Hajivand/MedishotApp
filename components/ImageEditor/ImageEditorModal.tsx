import { BaseText } from "@/components";
import { AdjustChange, DrawingCanvas, EditorState, ImageChange, MagicChange, PenChange, ToolAdjust, /* ToolCrop */ ToolMagic, ToolNote, ToolPen } from "@/components/ImageEditor";
import { Stroke } from "@/components/ImageEditor/DrawingCanvas";
import { FilteredImage } from "@/components/ImageEditor/FilteredImage";
import { IconSymbol } from "@/components/ui/icon-symbol.ios";
import colors from "@/theme/colors.shared";
import { useEditPatientMedia, useTempUpload, useUpdateMediaImage } from "@/utils/hook/useMedia";
import { EditPatientMediaRequest, UpdateMediaImageRequest } from "@/utils/service/models/RequestModels";
import { Button, Host, Text } from "@expo/ui/swift-ui";
import axios from "axios";
import { BlurView } from "expo-blur";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { SymbolViewProps } from "expo-symbols";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Dimensions, Modal, Image as RNImage, SafeAreaView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, FadeIn, FadeOut, LinearTransition, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import ViewShot, { captureRef } from "react-native-view-shot";
import { Note } from "./ToolNote";

const { width, height } = Dimensions.get("window");
const CANVAS_MAX_WIDTH = width;
const CANVAS_MAX_HEIGHT = height * 0.55;
const API_URL = "https://o37fm6z14czkrl-8080.proxy.runpod.net/invocations";

const SNAPSHOT_PRECISION = 4;
function roundForSnapshot(n: number): number {
    return Math.round(n * 10 ** SNAPSHOT_PRECISION) / 10 ** SNAPSHOT_PRECISION;
}

/** Normalize editor state so comparison is stable (rounded numbers, sorted keys). */
function normalizeEditorSnapshot(state: EditorState): string {
    const o: Record<string, unknown> = {};
    if (state.editorVersion != null) o.editorVersion = state.editorVersion;
    if (state.adjustments != null && typeof state.adjustments === "object") {
        const adj: Record<string, number> = {};
        Object.keys(state.adjustments)
            .sort()
            .forEach((k) => {
                const v = (state.adjustments as Record<string, number>)[k];
                if (typeof v === "number") adj[k] = roundForSnapshot(v);
            });
        o.adjustments = adj;
    }
    if (state.notes != null && state.notes.length > 0) {
        const notesList = state.notes.map((n) => ({ id: n.id, x: roundForSnapshot(n.x), y: roundForSnapshot(n.y), text: n.text }));
        notesList.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
        o.notes = notesList;
    }
    if (state.penStrokes != null && state.penStrokes.length > 0) {
        const strokes = state.penStrokes.map((s) => ({
            id: s.id,
            path: s.path.map((p) => ({ x: roundForSnapshot(p.x), y: roundForSnapshot(p.y) })),
            color: s.color,
            width: roundForSnapshot(s.width),
        }));
        strokes.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
        o.penStrokes = strokes;
    }
    if (state.magic != null) o.magic = state.magic;
    if (state.lastActiveTool != null) o.lastActiveTool = state.lastActiveTool;
    return JSON.stringify(o);
}

// Debug Overlay Component
type DebugOverlayProps = {
    visible: boolean;
    touchPosition: { x: number; y: number } | null;
    notePositions: Array<{ id: string; x: number; y: number; containerWidth: number; containerHeight: number }>;
    magnifierPosition: { x: number; y: number } | null;
    containerLayout: { x: number; y: number; width: number; height: number };
};

const DebugOverlay: React.FC<DebugOverlayProps> = ({ visible, touchPosition, notePositions, magnifierPosition, containerLayout }) => {
    if (!visible) return null;

    return (
        <View
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: "none",
                zIndex: 2000,
            }}
        >
            {/* Touch Position (Blue) */}
            {touchPosition && (
                <>
                    <View
                        style={{
                            position: "absolute",
                            left: touchPosition.x - 10,
                            top: touchPosition.y - 10,
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            backgroundColor: "#0066FF",
                            borderWidth: 2,
                            borderColor: "#FFFFFF",
                        }}
                    />
                    <View
                        style={{
                            position: "absolute",
                            left: touchPosition.x + 15,
                            top: touchPosition.y - 10,
                            backgroundColor: "rgba(0, 0, 0, 0.7)",
                            padding: 4,
                            borderRadius: 4,
                        }}
                    >
                        <BaseText type="Caption2" color="system.white" style={{ fontSize: 10 }}>
                            Touch: ({Math.round(touchPosition.x)}, {Math.round(touchPosition.y)})
                        </BaseText>
                    </View>
                </>
            )}

            {/* Note Positions (Green) */}
            {notePositions.map((note) => {
                const noteX = note.x * note.containerWidth + containerLayout.x;
                const noteY = note.y * note.containerHeight + containerLayout.y;
                return (
                    <React.Fragment key={note.id}>
                        <View
                            style={{
                                position: "absolute",
                                left: noteX - 10,
                                top: noteY - 10,
                                width: 20,
                                height: 20,
                                borderRadius: 10,
                                backgroundColor: "#00FF00",
                                borderWidth: 2,
                                borderColor: "#FFFFFF",
                            }}
                        />
                        <View
                            style={{
                                position: "absolute",
                                left: noteX + 15,
                                top: noteY - 10,
                                backgroundColor: "rgba(0, 0, 0, 0.7)",
                                padding: 4,
                                borderRadius: 4,
                            }}
                        >
                            <BaseText type="Caption2" color="system.white" style={{ fontSize: 10 }}>
                                Note: ({Math.round(noteX)}, {Math.round(noteY)})
                            </BaseText>
                        </View>
                        {/* Line from touch to note */}
                        {touchPosition && (
                            <View
                                style={{
                                    position: "absolute",
                                    left: Math.min(touchPosition.x, noteX),
                                    top: Math.min(touchPosition.y, noteY),
                                    width: Math.abs(touchPosition.x - noteX),
                                    height: Math.abs(touchPosition.y - noteY),
                                    borderWidth: 1,
                                    borderColor: "#00FF00",
                                    borderStyle: "dashed",
                                }}
                            />
                        )}
                    </React.Fragment>
                );
            })}

            {/* Magnifier Position (Red) */}
            {magnifierPosition && (
                <>
                    <View
                        style={{
                            position: "absolute",
                            left: magnifierPosition.x + containerLayout.x - 10,
                            top: magnifierPosition.y + containerLayout.y - 10,
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            backgroundColor: "#FF0000",
                            borderWidth: 2,
                            borderColor: "#FFFFFF",
                        }}
                    />
                    <View
                        style={{
                            position: "absolute",
                            left: magnifierPosition.x + containerLayout.x + 15,
                            top: magnifierPosition.y + containerLayout.y - 10,
                            backgroundColor: "rgba(0, 0, 0, 0.7)",
                            padding: 4,
                            borderRadius: 4,
                        }}
                    >
                        <BaseText type="Caption2" color="system.white" style={{ fontSize: 10 }}>
                            Magnifier: ({Math.round(magnifierPosition.x + containerLayout.x)}, {Math.round(magnifierPosition.y + containerLayout.y)})
                        </BaseText>
                    </View>
                </>
            )}

            {/* Container Layout Info */}
            <View
                style={{
                    position: "absolute",
                    top: 100,
                    left: 20,
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    padding: 8,
                    borderRadius: 8,
                }}
            >
                <BaseText type="Caption2" color="system.white" style={{ fontSize: 10 }}>
                    Container: x={Math.round(containerLayout.x)}, y={Math.round(containerLayout.y)}
                </BaseText>
                <BaseText type="Caption2" color="system.white" style={{ fontSize: 10 }}>
                    Size: {Math.round(containerLayout.width)} x {Math.round(containerLayout.height)}
                </BaseText>
            </View>
        </View>
    );
};

// Note Magnifier Component
type NoteMagnifierProps = {
    visible: boolean;
    x: number;
    y: number;
    imageUri: string;
    containerX: number;
    containerY: number;
    containerWidth: number;
    containerHeight: number;
};

const NoteMagnifier: React.FC<NoteMagnifierProps> = ({ visible, x, y, imageUri, containerX, containerY, containerWidth, containerHeight }) => {
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.8);

    React.useEffect(() => {
        if (visible) {
            opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
            scale.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
        } else {
            opacity.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) });
            scale.value = withTiming(0.8, { duration: 200, easing: Easing.out(Easing.ease) });
        }
    }, [visible]);

    const magnifierStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
    }));

    if (!visible) return null;

    const MAGNIFIER_SIZE = 100;
    const MAGNIFIER_RADIUS = MAGNIFIER_SIZE / 2;
    const MAGNIFIER_OFFSET = 120; // Distance above finger

    // Calculate position relative to screen
    const screenX = containerX + x;
    const screenY = containerY + y - MAGNIFIER_OFFSET - MAGNIFIER_RADIUS;

    // Calculate image position in magnifier (center the touched point exactly)
    // x and y are relative to container, so we need to center that point in magnifier
    // For 2.5x zoom, the point (x, y) should be at the center of magnifier
    // The zoomed image is at position (imageX - MAGNIFIER_RADIUS, imageY - MAGNIFIER_RADIUS)
    // The point (x, y) in the zoomed image is at (x * zoomFactor, y * zoomFactor)
    // For this point to be at magnifier center (MAGNIFIER_RADIUS, MAGNIFIER_RADIUS):
    // imageX - MAGNIFIER_RADIUS + x * zoomFactor = MAGNIFIER_RADIUS
    // imageX = 2 * MAGNIFIER_RADIUS - x * zoomFactor
    const zoomFactor = 2.5;
    const imageX = 2 * MAGNIFIER_RADIUS - x * zoomFactor;
    const imageY = 2 * MAGNIFIER_RADIUS - y * zoomFactor;

    return (
        <Animated.View
            style={[
                {
                    position: "absolute",
                    left: screenX - MAGNIFIER_RADIUS,
                    top: screenY,
                    width: MAGNIFIER_SIZE,
                    height: MAGNIFIER_SIZE,
                    borderRadius: MAGNIFIER_RADIUS,
                    backgroundColor: colors.system.white,
                    borderWidth: 3,
                    borderColor: "#FFCC00",
                    shadowColor: colors.system.black,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                    overflow: "hidden",
                    zIndex: 1000,
                },
                magnifierStyle,
            ]}
        >
            <View
                style={{
                    position: "absolute",
                    left: imageX - MAGNIFIER_RADIUS,
                    top: imageY - MAGNIFIER_RADIUS,
                    width: containerWidth * zoomFactor,
                    height: containerHeight * zoomFactor,
                }}
            >
                <Image source={{ uri: imageUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
            </View>
            {/* Center indicator - small circle with yellow border (should match the red dot) */}
            <View
                style={{
                    position: "absolute",
                    left: MAGNIFIER_RADIUS - 4,
                    top: MAGNIFIER_RADIUS - 4,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: "#FFCC00",
                    backgroundColor: "transparent",
                    zIndex: 1002,
                }}
            />
        </Animated.View>
    );
};

// Note Marker Component - Draggable & Tappable
const NoteMarker: React.FC<{
    note: Note;
    index: number;
    containerWidth: number;
    containerHeight: number;
    isActive: boolean;
    onMove: (id: string, x: number, y: number) => void;
    onSelect: (id: string) => void;
    onDragStart?: (id: string, x: number, y: number) => void;
    onDragUpdate?: (id: string, x: number, y: number) => void;
    onDragEnd?: (id: string) => void;
}> = ({ note, index, containerWidth, containerHeight, isActive, onMove, onSelect, onDragStart, onDragUpdate, onDragEnd }) => {
    const markerScale = useSharedValue(0);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const isDragging = useSharedValue(false);

    // Store the previous position to detect actual changes
    const prevX = useRef(note.x);
    const prevY = useRef(note.y);

    React.useEffect(() => {
        markerScale.value = withTiming(1, { duration: 200 });
    }, []);

    // Reset translation only when position actually changes from parent (after drag ends)
    React.useEffect(() => {
        // Only reset if position changed and we're not currently dragging
        if (prevX.current !== note.x || prevY.current !== note.y) {
            prevX.current = note.x;
            prevY.current = note.y;
            // Reset translation immediately since position is now updated
            translateX.value = 0;
            translateY.value = 0;
        }
    }, [note.x, note.y]);

    const tapGesture = Gesture.Tap().onEnd(() => {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
        runOnJS(onSelect)(note.id);
    });

    const panGesture = Gesture.Pan()
        .onStart(() => {
            isDragging.value = true;
            markerScale.value = withSpring(1.2, { damping: 15, stiffness: 200 });
            runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
            runOnJS(onSelect)(note.id); // Select on drag start
            if (onDragStart) {
                const startX = note.x * containerWidth;
                const startY = note.y * containerHeight;
                runOnJS(onDragStart)(note.id, startX, startY);
            }
        })
        .onUpdate((event) => {
            // Calculate new position and clamp to container bounds
            const currentX = note.x * containerWidth + event.translationX;
            const currentY = note.y * containerHeight + event.translationY;

            // Clamp to container bounds
            const clampedX = Math.max(0, Math.min(currentX, containerWidth));
            const clampedY = Math.max(0, Math.min(currentY, containerHeight));

            // Set translation values based on clamped position
            translateX.value = clampedX - note.x * containerWidth;
            translateY.value = clampedY - note.y * containerHeight;

            // Update magnifier position
            if (onDragUpdate) {
                runOnJS(onDragUpdate)(note.id, clampedX, clampedY);
            }
        })
        .onEnd(() => {
            isDragging.value = false;
            markerScale.value = withSpring(1, { damping: 15, stiffness: 200 });

            // Calculate new position as percentage (already clamped in onUpdate)
            const currentX = note.x * containerWidth + translateX.value;
            const currentY = note.y * containerHeight + translateY.value;

            // Clamp to container bounds (double check)
            const clampedX = Math.max(0, Math.min(currentX, containerWidth));
            const clampedY = Math.max(0, Math.min(currentY, containerHeight));

            const newX = clampedX / containerWidth;
            const newY = clampedY / containerHeight;

            // Don't reset translation here - let useEffect handle it after state updates
            runOnJS(onMove)(note.id, newX, newY);
            runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);

            if (onDragEnd) {
                runOnJS(onDragEnd)(note.id);
            }
        });

    // Combine tap and pan - pan takes priority if dragging
    const composedGesture = Gesture.Race(panGesture, tapGesture);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: markerScale.value }],
    }));

    if (containerWidth === 0 || containerHeight === 0) return null;

    const x = note.x * containerWidth;
    const y = note.y * containerHeight;

    return (
        <GestureDetector gesture={composedGesture}>
            <Animated.View
                style={[
                    {
                        position: "absolute",
                        left: x - 15,
                        top: y - 15,
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        backgroundColor: isActive ? colors.system.blue : "rgba(255, 255, 255, 0.2)",
                        borderWidth: isActive ? 2 : 1.5,
                        borderColor: colors.system.white,
                        shadowColor: isActive ? colors.system.blue : colors.system.black,
                        shadowOffset: { width: 0, height: isActive ? 4 : 2 },
                        shadowOpacity: isActive ? 0.5 : 0.3,
                        shadowRadius: isActive ? 8 : 4,
                        alignItems: "center",
                        justifyContent: "center",
                    },
                    animatedStyle,
                ]}
            >
                <BaseText type="Caption2" color="system.white" style={{ fontSize: 13, fontWeight: "700" }}>
                    {index + 1}
                </BaseText>
            </Animated.View>
        </GestureDetector>
    );
};

interface ImageEditorModalProps {
    visible: boolean;
    uri?: string;
    /** When opening edited media, pass original image URL so Revert can restore it */
    originalUri?: string;
    initialTool?: string;
    mediaId?: number | string;
    /** MediaImageId for template images (when hasTemplate is true) */
    mediaImageId?: number | string;
    /** Whether this image has a template (determines which API to use) */
    hasTemplate?: boolean;
    patientId?: number | string;
    initialEditorState?: EditorState | null;
    onClose: () => void;
    onSaveSuccess?: () => void;
    /** Show only Note tab (hide other tabs) */
    showOnlyNote?: boolean;
}

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ visible, uri, originalUri, initialTool, mediaId, mediaImageId, hasTemplate, patientId, initialEditorState, onClose, onSaveSuccess, showOnlyNote = false }) => {
    const [activeTool, setActiveTool] = useState(initialTool || "Magic");
    const [isProcessing, setIsProcessing] = useState(false);
    const [imageChanges, setImageChanges] = useState<ImageChange[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [resultImages, setResultImages] = useState<Record<string, string>>({});
    const [magicSelection, setMagicSelection] = useState<{
        modeKey: string;
        resultType: "orig" | "pred";
        colorTitle: string;
        styleTitle: string;
    } | null>(null);
    const [displayedImageUri, setDisplayedImageUri] = useState<string | null>(null);
    const [originalImageUri, setOriginalImageUri] = useState<string | null>(null);
    const [adjustmentValues, setAdjustmentValues] = useState<AdjustChange | null>(null);
    const [notes, setNotes] = useState<Note[]>([]);
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [imageContainerLayout, setImageContainerLayout] = useState({ width: 0, height: 0, x: 0, y: 0 });
    const [imageWrapperLayout, setImageWrapperLayout] = useState({ width: 0, height: 0 });
    const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
    const [magnifierState, setMagnifierState] = useState<{ visible: boolean; x: number; y: number; noteId: string | null }>({
        visible: false,
        x: 0,
        y: 0,
        noteId: null,
    });
    const [debugMode, setDebugMode] = useState(false);
    const [debugTouchPosition, setDebugTouchPosition] = useState<{ x: number; y: number } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const hasRequestedRef = useRef(false);
    const exportViewRef = useRef<ViewShot | null>(null);
    const pendingNormalizedPenStrokesRef = useRef<EditorState["penStrokes"]>(null);
    const savedEditorSnapshotRef = useRef<string | null>(null);

    // Pen tool states
    const [penStrokes, setPenStrokes] = useState<Stroke[]>([]);
    const [penStrokesHistory, setPenStrokesHistory] = useState<Stroke[][]>([[]]);
    const [penHistoryIndex, setPenHistoryIndex] = useState(0);
    const [selectedPenColor, setSelectedPenColor] = useState("#FF3B30");
    const [selectedStrokeWidth, setSelectedStrokeWidth] = useState(4);

    // Undo/Redo handlers for pen
    const canUndo = penHistoryIndex > 0;
    const canRedo = penHistoryIndex < penStrokesHistory.length - 1;

    const handlePenUndo = () => {
        if (!canUndo) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newIndex = penHistoryIndex - 1;
        setPenHistoryIndex(newIndex);
        setPenStrokes(penStrokesHistory[newIndex]);
    };

    const handlePenRedo = () => {
        if (!canRedo) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newIndex = penHistoryIndex + 1;
        setPenHistoryIndex(newIndex);
        setPenStrokes(penStrokesHistory[newIndex]);
    };

    const { mutateAsync: tempUploadAsync } = useTempUpload();
    const { mutateAsync: editPatientMediaAsync } = useEditPatientMedia();
    const { mutateAsync: updateMediaImageAsync } = useUpdateMediaImage();

    const scale = useSharedValue(1);

    // Move note callback - update note position
    const handleMoveNote = (id: string, newX: number, newY: number) => {
        setNotes((prevNotes) => prevNotes.map((note) => (note.id === id ? { ...note, x: newX, y: newY } : note)));
    };

    // Magnifier callbacks
    const handleDragStart = (id: string, x: number, y: number) => {
        setMagnifierState({ visible: true, x, y, noteId: id });
    };

    const handleDragUpdate = (id: string, x: number, y: number) => {
        setMagnifierState((prev) => (prev.noteId === id ? { ...prev, x, y } : prev));
    };

    const handleDragEnd = (id: string) => {
        setMagnifierState((prev) => (prev.noteId === id ? { ...prev, visible: false, noteId: null } : prev));
    };

    // Add note callback - uses functional update to get latest notes
    const addNoteCallback = (locationX: number, locationY: number) => {
        const { width, height, x, y } = imageContainerLayout;
        if (width === 0 || height === 0) return;

        // Check if touch is within container bounds
        // locationX and locationY are relative to imageWrapper
        // imageContainer is at position (x, y) relative to imageWrapper
        if (locationX < x || locationX > x + width || locationY < y || locationY > y + height) {
            // Touch is outside container, don't add note
            return;
        }

        // Store touch position for debug
        if (debugMode) {
            setDebugTouchPosition({ x: locationX, y: locationY });
        }

        // Adjust touch position relative to container (subtract container offset)
        const adjustedX = locationX - x;
        const adjustedY = locationY - y;

        // Normalize to 0-1 range
        const normalizedX = adjustedX / width;
        const normalizedY = adjustedY / height;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const newNote: Note = {
            id: Date.now().toString(),
            x: normalizedX,
            y: normalizedY,
            text: "",
        };

        // Use functional update to get latest notes
        setNotes((prevNotes) => [...prevNotes, newNote]);

        // Focus on the new note
        setActiveNoteId(newNote.id);

        setImageChanges((prev) => {
            const filtered = prev.filter((c) => c.type !== "note");
            return [...filtered, { type: "note", data: { notes: [...notes, newNote] } }];
        });
    };

    // Memoize gestures
    const composedGesture = useMemo(() => {
        const pinch = Gesture.Pinch()
            .enabled(activeTool !== "Note" && activeTool !== "Pen")
            .onUpdate((e) => {
                scale.value = e.scale;
            })
            .onEnd(() => {
                scale.value = withTiming(1, { duration: 200 });
            });

        const tap = Gesture.Tap()
            .enabled(activeTool === "Note")
            .onEnd((event) => {
                runOnJS(addNoteCallback)(event.x, event.y);
            });

        const doubleTap = Gesture.Tap()
            .numberOfTaps(2)
            .onEnd(() => {
                runOnJS(() => {
                    setDebugMode((prev) => !prev);
                })();
            });

        return Gesture.Exclusive(tap, pinch, doubleTap);
    }, [activeTool, imageContainerLayout, scale]);

    const animatedImageStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const allTools: { name: string; icon: SymbolViewProps["name"]; disabled: boolean }[] = [
        { name: "Adjust", icon: "dial.min.fill" as SymbolViewProps["name"], disabled: false },
        // { name: "Crop", icon: "crop.rotate", disabled: false }, // TODO: not complete yet
        { name: "Note", icon: "pin.circle.fill" as SymbolViewProps["name"], disabled: false },
        { name: "Magic", icon: "sparkles" as SymbolViewProps["name"], disabled: false },
        { name: "Pen", icon: "pencil.tip.crop.circle" as SymbolViewProps["name"], disabled: false },
    ];
    const tools = showOnlyNote ? allTools.filter((tool) => tool.name === "Note") : allTools;

    const handleToolPress = (tool: string) => {
        if (showOnlyNote && tool !== "Note") {
            return; // Don't allow changing tool when showOnlyNote is true
        }
        Haptics.selectionAsync();
        setActiveTool(tool);
    };

    // When showOnlyNote is true, force activeTool to "Note"
    useEffect(() => {
        if (showOnlyNote && activeTool !== "Note") {
            setActiveTool("Note");
        }
    }, [showOnlyNote, activeTool]);

    const applyAdjustments = async (imageUri: string, adjustments: AdjustChange): Promise<string | null> => {
        try {
            if (!adjustments || Object.keys(adjustments).length === 0 || !imageUri) {
                return imageUri;
            }

            // Check if any adjustment has a non-zero value
            const hasAdjustments = Object.values(adjustments).some((val) => val !== undefined && val !== 0);
            if (!hasAdjustments) {
                return originalImageUri || imageUri;
            }

            const brightness = adjustments.brightness !== undefined ? adjustments.brightness / 100 : 0;

            return imageUri;
        } catch (error) {
            console.error("Error applying adjustments:", error);
            return imageUri;
        }
    };

    const handleImageChange = async (change: ImageChange) => {
        setImageChanges((prev) => {
            const filtered = prev.filter((c) => c.type !== change.type);
            return [...filtered, change];
        });

        // Handle note changes (update notes state)
        if (change.type === "note") {
            const noteData = change.data as { notes: Note[] };
            setNotes(noteData.notes);
        } else if (change.type === "adjust") {
            const adjustments = change.data as AdjustChange;
            setAdjustmentValues(adjustments);
        } else if (change.type === "magic") {
            const { color, style } = change.data as MagicChange;
            if (color?.modeKey && style?.resultType) {
                const selection = {
                    modeKey: color.modeKey,
                    resultType: style.resultType,
                    colorTitle: color.title,
                    styleTitle: style.title,
                };
                setMagicSelection(selection);
                updateDisplayedImageFromResult(selection);
            }
        } else if (change.type === "pen") {
            const penData = change.data as PenChange;
            if (penData.strokes) {
                setPenStrokes(penData.strokes);
            }
        }
    };

    // Handle pen strokes change from DrawingCanvas
    const handlePenStrokesChange = (strokes: Stroke[]) => {
        setPenStrokes(strokes);

        // Update history - remove any redo states after current index
        const newHistory = penStrokesHistory.slice(0, penHistoryIndex + 1);
        newHistory.push(strokes);
        setPenStrokesHistory(newHistory);
        setPenHistoryIndex(newHistory.length - 1);

        setImageChanges((prev) => {
            const filtered = prev.filter((c) => c.type !== "pen");
            return [...filtered, { type: "pen", data: { strokes } }];
        });
    };

    const convertImageToBase64 = async (imageUri: string): Promise<string | null> => {
        try {
            if (imageUri.startsWith("http://") || imageUri.startsWith("https://")) {
                if (!FileSystem.documentDirectory) {
                    console.error("Document directory not available");
                    return null;
                }
                const fileUri = FileSystem.documentDirectory + "temp_image.jpg";
                const downloadResult = await FileSystem.downloadAsync(imageUri, fileUri);
                if (downloadResult.status === 200) {
                    const base64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
                        encoding: FileSystem.EncodingType.Base64,
                    });
                    return base64;
                }
                return null;
            } else {
                const base64 = await FileSystem.readAsStringAsync(imageUri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                return base64;
            }
        } catch (error) {
            console.error("Error converting image to base64:", error);
            return null;
        }
    };

    // ✅ ارسال به API
    const sendImageToAPI = async (imageBase64: string) => {
        const requestBody = {
            image_base64: imageBase64,
            color_settings: {
                saturation_scale: 0.4,
                yellow_hue_range: [15, 45],
                red_hue_range: [0, 15],
                sat_range: [0, 255],
                l_range: [0, 255],
            },
            texture_modes: {
                Mode_A1: {
                    fade_power: 4.0,
                    center_offset: [0.0, 0.1],
                    stretch: [0.5, 0.8],
                    center_opacity: 0.5,
                    blend_opacity: 0.8,
                    mask_color: [92, 137, 170],
                },
                Mode_C1: {
                    fade_power: 6.0,
                    center_offset: [0.0, 0.2],
                    stretch: [0.5, 0.8],
                    center_opacity: 0.6,
                    blend_opacity: 0.8,
                    mask_color: [112, 158, 181],
                },
                Mode_D3: {
                    fade_power: 6.0,
                    center_offset: [0.0, 0.2],
                    stretch: [0.5, 0.6],
                    center_opacity: 0.5,
                    blend_opacity: 0.8,
                    mask_color: [101, 152, 184],
                },
                Mode_A2: {
                    fade_power: 4.0,
                    center_offset: [0.0, 0.3],
                    stretch: [0.5, 0.8],
                    center_opacity: 0.99,
                    blend_opacity: 0.7,
                    mask_color: [91, 137, 170],
                },
            },
        };

        const { data } = await axios.post(API_URL, requestBody, {
            headers: { "Content-Type": "application/json" },
            timeout: 1800000,
        });

        console.log("✅ Response keys:", data);
        return data;
    };

    useEffect(() => {
        if (visible) {
            hasRequestedRef.current = false;
            setDisplayedImageUri(uri ?? null);
            setOriginalImageUri(uri ?? null);
            setImageAspectRatio(null);
            if (!initialEditorState) {
                setAdjustmentValues(null);
                setNotes([]);
                setPenStrokes([]);
                setPenStrokesHistory([[]]);
                setPenHistoryIndex(0);
                setMagicSelection(null);
                pendingNormalizedPenStrokesRef.current = null;
                savedEditorSnapshotRef.current = null;
            }
            if (initialEditorState?.lastActiveTool) setActiveTool(initialEditorState.lastActiveTool);
            else if (initialTool) setActiveTool(initialTool);
        }
    }, [uri, initialTool, visible, initialEditorState]);

    useEffect(() => {
        if (!visible || !initialEditorState) {
            if (!visible) savedEditorSnapshotRef.current = null;
            return;
        }
        savedEditorSnapshotRef.current = normalizeEditorSnapshot(initialEditorState);
        if (initialEditorState.adjustments != null) setAdjustmentValues(initialEditorState.adjustments);
        if (initialEditorState.notes?.length) setNotes(initialEditorState.notes as Note[]);
        if (initialEditorState.penStrokes?.length) {
            if (initialEditorState.editorVersion === 1) {
                pendingNormalizedPenStrokesRef.current = initialEditorState.penStrokes;
            } else {
                setPenStrokes(initialEditorState.penStrokes as Stroke[]);
                setPenStrokesHistory([[], initialEditorState.penStrokes as Stroke[]]);
                setPenHistoryIndex(1);
            }
        }
        if (initialEditorState.magic) {
            setMagicSelection({
                ...initialEditorState.magic,
                colorTitle: "",
                styleTitle: "",
            });
        }
    }, [visible, initialEditorState]);

    useEffect(() => {
        const pending = pendingNormalizedPenStrokesRef.current;
        const w = imageContainerLayout.width;
        const h = imageContainerLayout.height;
        if (!visible || !pending?.length || w <= 0 || h <= 0) return;
        const inPixels: Stroke[] = pending.map((s) => ({
            id: s.id,
            path: s.path.map((p) => ({
                x: roundForSnapshot(p.x) * w,
                y: roundForSnapshot(p.y) * h,
            })),
            color: s.color,
            width: s.width,
        }));
        pendingNormalizedPenStrokesRef.current = null;
        setPenStrokes(inPixels);
        setPenStrokesHistory([[], inPixels]);
        setPenHistoryIndex(1);
    }, [visible, imageContainerLayout.width, imageContainerLayout.height]);

    // Get image dimensions and calculate aspect ratio (fallback if onLoad doesn't fire)
    useEffect(() => {
        if (!uri || !visible) {
            setImageAspectRatio(null);
            return;
        }

        // Only use Image.getSize as fallback if aspectRatio is still null after a delay
        const timeoutId = setTimeout(() => {
            if (imageAspectRatio === null) {
                RNImage.getSize(
                    uri,
                    (width, height) => {
                        const ratio = width / height;
                        setImageAspectRatio(ratio);
                    },
                    (error) => {
                        console.error("Error loading image dimensions:", error);
                        // Fallback to 3:2 if error
                        setImageAspectRatio(3 / 2);
                    },
                );
            }
        }, 100); // Small delay to let onLoad fire first

        return () => clearTimeout(timeoutId);
    }, [uri, visible, imageAspectRatio]);

    useEffect(() => {
        if (!magicSelection) return;
        updateDisplayedImageFromResult(magicSelection);
    }, [magicSelection, resultImages]);

    const formatBase64ToDataUri = (value: string) => {
        if (!value) return null;
        return value.startsWith("data:") ? value : `data:image/png;base64,${value}`;
    };

    const getResultImageForSelection = (selection: { modeKey: string; resultType: "orig" | "pred" }) => {
        const { modeKey, resultType } = selection;
        if (!modeKey) return null;
        const normalizedModeKey = modeKey.toLowerCase();
        const entries = Object.entries(resultImages);

        const expectedKey = `${resultType === "orig" ? "orig" : "pred"}_img_teeth_${modeKey}`.toLowerCase();
        const directMatch = entries.find(([key]) => key.toLowerCase() === expectedKey);
        if (directMatch?.[1]) return directMatch[1];

        const fallback = entries.find(([key]) => key.toLowerCase().includes(normalizedModeKey));
        return fallback?.[1] ?? null;
    };

    const updateDisplayedImageFromResult = (selection: { modeKey: string; resultType: "orig" | "pred"; colorTitle: string; styleTitle: string }) => {
        const resultImage = getResultImageForSelection(selection);
        if (resultImage) {
            const formatted = formatBase64ToDataUri(resultImage);
            if (formatted) {
                console.log("🖼️ نمایش:", selection.colorTitle);
                setDisplayedImageUri(formatted);
                return;
            }
        }
        console.log("🖼️ نمایش:", "اصلی");
        setDisplayedImageUri(uri ?? null);
    };

    useEffect(() => {
        const processImage = async () => {
            if (!uri || !visible) return;
            // Only process image for Magic tool - don't process if not on Magic tab
            if (activeTool !== "Magic") {
                // Reset loading state if not on Magic tab
                setIsLoading(false);
                setIsProcessing(false);
                return;
            }
            if (hasRequestedRef.current) return;
            hasRequestedRef.current = true;
            setIsProcessing(true);
            setIsLoading(true);
            try {
                const imageBase64 = await convertImageToBase64(uri);
                if (imageBase64) {
                    const result = await sendImageToAPI(imageBase64);
                    setResultImages(result);
                }
            } catch (error) {
                console.error("❌ Error processing image:", error);
            } finally {
                setIsProcessing(false);
                setIsLoading(false);
            }
        };

        processImage();
    }, [uri, activeTool, visible]);

    const handleDone = useCallback(async () => {
        // Check if we have the required IDs based on template status
        if (hasTemplate && !mediaImageId) {
            Alert.alert("Cannot save", "This template image is not linked to a media image. Closing without saving.");
            onClose();
            return;
        }
        if (!hasTemplate && !mediaId) {
            Alert.alert("Cannot save", "This image is not linked to patient media. Closing without saving.");
            onClose();
            return;
        }
        const w = imageContainerLayout.width;
        const h = imageContainerLayout.height;
        if (!exportViewRef.current || w <= 0 || h <= 0) {
            Alert.alert("Error", "Image layout not ready. Please try again.");
            return;
        }
        setIsSaving(true);
        try {
            // Wait for view to be fully painted (hidden view used to capture blank; capturing visible view needs one frame + paint)
            await new Promise<void>((r) => requestAnimationFrame(() => r()));
            await new Promise<void>((r) => setTimeout(r, 200));

            const uriOut = await captureRef(exportViewRef.current, {
                format: "jpg",
                quality: 0.95,
                result: "tmpfile",
            });
            const file = { uri: uriOut, type: "image/jpeg", name: `edit-${Date.now()}.jpg` };
            const uploadRes = await tempUploadAsync(file);
            const filename = uploadRes?.filename;
            if (!filename) throw new Error("Temp upload did not return filename");

            const apiNotes = notes.filter((n) => n.text.trim()).map((n) => ({ text: n.text.trim(), x: n.x * w, y: n.y * h }));
            // Normalize pen paths (0–1), rounded for stable restore and comparison
            const normalizedPenStrokes =
                penStrokes.length && w > 0 && h > 0
                    ? penStrokes.map((s) => ({
                          id: s.id,
                          path: s.path.map((p) => ({
                              x: roundForSnapshot(p.x / w),
                              y: roundForSnapshot(p.y / h),
                          })),
                          color: s.color,
                          width: s.width,
                      }))
                    : undefined;
            const editor: EditorState = {
                editorVersion: 1,
                adjustments: adjustmentValues ?? undefined,
                notes: notes.length ? notes : undefined,
                penStrokes: normalizedPenStrokes,
                magic: magicSelection ? { modeKey: magicSelection.modeKey, resultType: magicSelection.resultType } : undefined,
                lastActiveTool: activeTool,
            };

            if (hasTemplate && mediaImageId) {
                // Use updateMediaImage for template images
                const requestData: UpdateMediaImageRequest = {
                    edited_image: filename,
                    notes: apiNotes.length ? JSON.stringify(apiNotes) : undefined,
                    data: { editor },
                };
                const payload = { mediaImageId, data: requestData };
                console.log("📤 [ImageEditor] ارسال به بک‌اند (Template):", JSON.stringify(payload, null, 2));
                await updateMediaImageAsync(payload);
            } else {
                // Use editMedia for non-template images
                if (!mediaId) {
                    throw new Error("Missing required mediaId for non-template image");
                }
                const requestData: EditPatientMediaRequest = {
                    media: filename,
                    notes: apiNotes.length ? apiNotes : undefined,
                    data: JSON.stringify({ editor }),
                };
                const payload = { mediaId, data: requestData };
                console.log("📤 [ImageEditor] ارسال به بک‌اند (Non-Template):", JSON.stringify(payload, null, 2));
                await editPatientMediaAsync(payload);
            }
            onSaveSuccess?.();
            onClose();
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Failed to save edits.";
            Alert.alert("Error", msg);
        } finally {
            setIsSaving(false);
        }
    }, [mediaId, mediaImageId, hasTemplate, activeTool, imageContainerLayout.width, imageContainerLayout.height, notes, adjustmentValues, penStrokes, magicSelection, tempUploadAsync, editPatientMediaAsync, updateMediaImageAsync, onClose, onSaveSuccess]);

    const currentEditorSnapshot = useMemo(() => {
        const w = imageContainerLayout.width;
        const h = imageContainerLayout.height;
        const normalizedPenStrokes =
            penStrokes.length && w > 0 && h > 0
                ? penStrokes.map((s) => ({
                      id: s.id,
                      path: s.path.map((p) => ({
                          x: roundForSnapshot(p.x / w),
                          y: roundForSnapshot(p.y / h),
                      })),
                      color: s.color,
                      width: s.width,
                  }))
                : undefined;
        const state: EditorState = {
            editorVersion: 1,
            adjustments: adjustmentValues ?? undefined,
            notes: notes.length ? notes : undefined,
            penStrokes: normalizedPenStrokes,
            magic: magicSelection ? { modeKey: magicSelection.modeKey, resultType: magicSelection.resultType } : undefined,
            lastActiveTool: activeTool,
        };
        return normalizeEditorSnapshot(state);
    }, [imageContainerLayout.width, imageContainerLayout.height, adjustmentValues, notes, penStrokes, magicSelection, activeTool]);

    const hasUnsavedChanges = savedEditorSnapshotRef.current === null || currentEditorSnapshot !== savedEditorSnapshotRef.current;

    const handleRevert = useCallback(async () => {
        if (hasTemplate && !mediaImageId) {
            onClose();
            return;
        }
        if (!hasTemplate && !mediaId) {
            onClose();
            return;
        }
        const uriToShow = originalUri ?? uri ?? null;
        setAdjustmentValues(null);
        setNotes([]);
        setPenStrokes([]);
        setPenStrokesHistory([[]]);
        setPenHistoryIndex(0);
        setMagicSelection(null);
        setDisplayedImageUri(uriToShow);
        setOriginalImageUri(uriToShow);
        savedEditorSnapshotRef.current = null;

        if (!uriToShow || !uriToShow.startsWith("http")) {
            onSaveSuccess?.();
            onClose();
            return;
        }
        setIsSaving(true);
        try {
            const fileUri = FileSystem.documentDirectory + `revert-original-${Date.now()}.jpg`;
            const downloadResult = await FileSystem.downloadAsync(uriToShow, fileUri);
            if (downloadResult.status !== 200) throw new Error("Failed to download original image");
            const file = { uri: fileUri, type: "image/jpeg", name: `revert-${Date.now()}.jpg` };
            const uploadRes = await tempUploadAsync(file);
            const filename = uploadRes?.filename;
            if (!filename) throw new Error("Temp upload did not return filename");

            if (hasTemplate && mediaImageId) {
                // Use updateMediaImage for template images
                const requestData: UpdateMediaImageRequest = {
                    edited_image: filename,
                    data: { editor: { editorVersion: 1 } },
                };
                await updateMediaImageAsync({ mediaImageId, data: requestData });
            } else {
                // Use editMedia for non-template images
                if (!mediaId) {
                    throw new Error("Missing required mediaId for non-template image revert");
                }
                const requestData: EditPatientMediaRequest = {
                    media: filename,
                    data: JSON.stringify({ editor: { editorVersion: 1 } }),
                };
                await editPatientMediaAsync({ mediaId, data: requestData });
            }
            onSaveSuccess?.();
            onClose();
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Revert failed.";
            Alert.alert("Error", msg);
        } finally {
            setIsSaving(false);
        }
    }, [mediaId, mediaImageId, hasTemplate, originalUri, uri, tempUploadAsync, editPatientMediaAsync, updateMediaImageAsync, onClose, onSaveSuccess]);

    // Calculate dynamic image container style based on aspect ratio
    // Use actual imageWrapper height to fill available space, with smart fallback
    const dynamicImageContainerStyle = useMemo(() => {
        const aspectRatio = imageAspectRatio ?? 3 / 2; // Fallback to 3:2 if not loaded yet

        // Use actual wrapper dimensions if available, otherwise use screen dimensions
        const availableHeight = imageWrapperLayout.height > 0 ? imageWrapperLayout.height : CANVAS_MAX_HEIGHT;
        const availableWidth = imageWrapperLayout.width > 0 ? imageWrapperLayout.width : CANVAS_MAX_WIDTH;

        // Calculate size to maximize while preserving aspect ratio
        // First, try to fill the height
        let containerHeight = availableHeight;
        let containerWidth = containerHeight * aspectRatio;

        // If width exceeds available width, use width constraint instead
        if (containerWidth > availableWidth) {
            containerWidth = availableWidth;
            containerHeight = containerWidth / aspectRatio;
        }

        return {
            width: containerWidth,
            aspectRatio: aspectRatio,
            alignSelf: "center" as const,
        };
    }, [imageAspectRatio, imageWrapperLayout]);

    const renderActiveToolPanel = () => {
        const imageUri = uri || "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=900";
        const commonProps = {
            imageUri,
            onChange: handleImageChange,
            onApply: () => console.log("Apply changes"),
            onCancel: () => console.log("Cancel changes"),
        };

        switch (activeTool) {
            case "Adjust":
                return <ToolAdjust {...commonProps} initialAdjustmentValues={adjustmentValues} />;
            // case "Crop":
            //     return <ToolCrop {...commonProps} />; // TODO: not complete yet
            case "Note":
                return <ToolNote {...commonProps} notes={notes} activeNoteId={activeNoteId} onActiveNoteChange={setActiveNoteId} />;
            case "Magic":
                return <ToolMagic {...commonProps} />;
            case "Pen":
                return <ToolPen {...commonProps} selectedColor={selectedPenColor} selectedStrokeWidth={selectedStrokeWidth} onColorChange={setSelectedPenColor} onStrokeWidthChange={setSelectedStrokeWidth} />;
            default:
                return null;
        }
    };

    return (
        <Modal visible={visible} transparent={false} animationType="slide" presentationStyle="fullScreen">
            <SafeAreaView style={styles.container}>
                <Modal visible={isLoading} transparent animationType="fade">
                    <View className="w-full items-center justify-center flex-1 p-3">
                        <BlurView intensity={40} tint="dark" style={styles.blurOverlay} />
                        <View className="w-full h-fit bg-white py-[60px] rounded-3xl items-center justify-center">
                            <TouchableOpacity className="items-center justify-center gap-[50px]">
                                <View style={{ borderColor: "#D1D1D6", padding: 10, borderRadius: 40 }} className="w-[220px] h-[220px] border rounded-2xl">
                                    <View className="w-full h-full bg-[#4D4D4D] rounded-[35px] items-center justify-center">
                                        <Image source={require("@/assets/images/tothColor/A1Big.png")} style={{ width: 80, height: 160, resizeMode: "contain", top: 15 }} resizeMode="contain" />
                                    </View>
                                </View>
                                <View className="gap-0 items-center justify-center">
                                    <BaseText type="Title1" color="labels.primary">
                                        Magic Happening...
                                    </BaseText>
                                    <BaseText type="Body" color="labels.secondary">
                                        This may take a few minutes.
                                    </BaseText>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                <View style={styles.header}>
                    <Host style={{ width: 78, height: 40 }}>
                        <Button variant="bordered" color="#787880" onPress={onClose} disabled={isSaving}>
                            <Text color="black">Cancel</Text>
                        </Button>
                    </Host>

                    {/* Undo/Redo buttons for Pen tool */}
                    {activeTool === "Pen" && (
                        <View style={styles.undoRedoContainer}>
                            <TouchableOpacity style={[styles.undoRedoButton, !canUndo && styles.undoRedoButtonDisabled]} onPress={handlePenUndo} disabled={!canUndo}>
                                <IconSymbol name="arrow.uturn.backward.circle" size={26} color={canUndo ? colors.system.black : colors.system.gray3} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.undoRedoButton, !canRedo && styles.undoRedoButtonDisabled]} onPress={handlePenRedo} disabled={!canRedo}>
                                <IconSymbol name="arrow.uturn.forward.circle" size={26} color={canRedo ? colors.system.black : colors.system.gray3} />
                            </TouchableOpacity>
                        </View>
                    )}

                    <Host
                        style={{
                            width: isSaving || !hasUnsavedChanges ? 92 : 65,
                            height: isSaving || !hasUnsavedChanges ? 44 : 40,
                        }}
                    >
                        <Button variant="glassProminent" color={!hasUnsavedChanges ? "#E53935" : "#FFCC00"} onPress={hasUnsavedChanges ? handleDone : handleRevert} disabled={isSaving}>
                            <Text color={!hasUnsavedChanges ? "white" : "black"}>{isSaving ? "Saving…" : hasUnsavedChanges ? "Done" : "Revert"}</Text>
                        </Button>
                    </Host>
                </View>

                <Animated.View style={styles.canvasContainer} layout={LinearTransition.duration(250)}>
                    <GestureDetector gesture={composedGesture}>
                        <Animated.View
                            style={[styles.imageWrapper, animatedImageStyle]}
                            onLayout={(event) => {
                                const { width, height } = event.nativeEvent.layout;
                                setImageWrapperLayout({ width, height });
                            }}
                        >
                            <View
                                style={[styles.imageContainer, dynamicImageContainerStyle]}
                                onLayout={(event) => {
                                    const { width, height, x, y } = event.nativeEvent.layout;

                                    setImageContainerLayout({ width, height, x, y });
                                }}
                            >
                                {/* ViewShot wraps only image + pen so capture = exactly what user sees (no note markers in export) */}
                                <ViewShot ref={exportViewRef} style={[styles.image, { overflow: "hidden" }]} options={{ format: "jpg", quality: 0.95 }}>
                                    <FilteredImage
                                        source={{ uri: displayedImageUri ?? uri ?? "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=900" }}
                                        style={StyleSheet.absoluteFill}
                                        adjustments={adjustmentValues}
                                        onLoad={(event) => {
                                            const ratio = event.width / event.height;
                                            setImageAspectRatio(ratio);
                                        }}
                                    />
                                    <DrawingCanvas width={imageContainerLayout.width} height={imageContainerLayout.height} strokes={penStrokes} selectedColor={selectedPenColor} selectedStrokeWidth={selectedStrokeWidth} onStrokesChange={handlePenStrokesChange} enabled={activeTool === "Pen"} />
                                </ViewShot>

                                {/* Note Markers outside ViewShot so they are not in the exported image */}
                                {activeTool === "Note" &&
                                    notes.map((note, index) => (
                                        <NoteMarker
                                            key={note.id}
                                            note={note}
                                            index={index}
                                            containerWidth={imageContainerLayout.width}
                                            containerHeight={imageContainerLayout.height}
                                            isActive={activeNoteId === note.id}
                                            onMove={handleMoveNote}
                                            onSelect={setActiveNoteId}
                                            onDragStart={handleDragStart}
                                            onDragUpdate={handleDragUpdate}
                                            onDragEnd={handleDragEnd}
                                        />
                                    ))}
                            </View>
                        </Animated.View>
                    </GestureDetector>

                    {/* Magnifier - rendered at canvasContainer level to appear above everything */}
                    {activeTool === "Note" && magnifierState.visible && (
                        <NoteMagnifier
                            visible={magnifierState.visible}
                            x={magnifierState.x}
                            y={magnifierState.y}
                            imageUri={displayedImageUri ?? uri ?? "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=900"}
                            containerX={imageContainerLayout.x}
                            containerY={imageContainerLayout.y}
                            containerWidth={imageContainerLayout.width}
                            containerHeight={imageContainerLayout.height}
                        />
                    )}

                    {/* Debug Overlay */}
                    {debugMode && (
                        <DebugOverlay
                            visible={debugMode}
                            touchPosition={debugTouchPosition}
                            notePositions={notes.map((note) => ({
                                id: note.id,
                                x: note.x,
                                y: note.y,
                                containerWidth: imageContainerLayout.width,
                                containerHeight: imageContainerLayout.height,
                            }))}
                            magnifierPosition={magnifierState.visible ? { x: magnifierState.x, y: magnifierState.y } : null}
                            containerLayout={imageContainerLayout}
                        />
                    )}
                </Animated.View>

                <Animated.View key={activeTool} className="w-full" entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} layout={LinearTransition.duration(250)}>
                    {renderActiveToolPanel()}
                </Animated.View>

                <View className="flex-row items-center justify-center gap-5">
                    {tools.map((t) => (
                        <TouchableOpacity disabled={t.disabled} key={t.name} onPress={() => handleToolPress(t.name)} className="items-center justify-center gap-1">
                            <IconSymbol name={t.icon} size={24} color={activeTool === t.name ? colors.labels.primary : t.disabled ? colors.labels.tertiary : colors.labels.secondary} />

                            <BaseText type="Caption1" color={activeTool === t.name ? "labels.primary" : t.disabled ? "labels.tertiary" : "labels.secondary"}>
                                {t.name}
                            </BaseText>
                        </TouchableOpacity>
                    ))}
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.system.white,
    },
    header: {
        height: 60,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
    },
    canvasContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    imageWrapper: {
        width: width,
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
    },
    imageContainer: {
        position: "relative",
    },
    image: {
        width: "100%",
        height: "100%",
    },
    filterOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        justifyContent: "center",
        alignItems: "center",
    },

    modalText: {
        marginTop: 12,
        textAlign: "center",
    },
    blurOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    undoRedoContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    undoRedoButton: {
        alignItems: "center",
        justifyContent: "center",
    },
    undoRedoButtonDisabled: {
        opacity: 0.5,
    },
});
