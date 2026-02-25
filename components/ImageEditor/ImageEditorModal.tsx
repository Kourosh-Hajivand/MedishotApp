import { BaseButton, BaseText } from "@/components";
import { AdjustChange, DrawingCanvas, EditorState, ImageChange, MagicChange, PenChange, ToolAdjust, /* ToolCrop */ ToolMagic, ToolNote, ToolPen } from "@/components/ImageEditor";
import { Stroke } from "@/components/ImageEditor/DrawingCanvas";
import { FilteredImage } from "@/components/ImageEditor/FilteredImage";
import { IconSymbol } from "@/components/ui/icon-symbol.ios";
import { iconSize } from "@/constants/theme";
import colors from "@/theme/colors.shared";
import { useMagicGenerateMutation } from "@/utils/hook/useMagicGenerate";
import { useEditPatientMedia, useTempUpload, useUpdateMediaImage } from "@/utils/hook/useMedia";
import { EditPatientMediaRequest, UpdateMediaImageRequest } from "@/utils/service/models/RequestModels";
import { Button, Host, HStack, Image as SwiftUIImage, Text, VStack } from "@expo/ui/swift-ui";
import { frame, glassEffect, padding } from "@expo/ui/swift-ui/modifiers";
import { BlurView } from "expo-blur";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SymbolViewProps } from "expo-symbols";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Dimensions, Modal, Image as RNImage, SafeAreaView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, FadeIn, FadeOut, interpolate, LinearTransition, runOnJS, useAnimatedProps, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import ViewShot, { captureRef } from "react-native-view-shot";
import { Note } from "./ToolNote";

const AnimatedPath = Animated.createAnimatedComponent(Path);

const MAGIC_PROGRESS_DURATION_MS = 30000;
// Border centerline: derived from box/border so SVG path sits exactly on border
const MAGIC_BOX_SIZE = 220;
const MAGIC_BORDER_RADIUS = 60;
const MAGIC_BORDER_WIDTH = 3;
const MAGIC_HALF_BORDER = MAGIC_BORDER_WIDTH / 2;
const MAGIC_INNER_RADIUS = MAGIC_BORDER_RADIUS - MAGIC_HALF_BORDER;
const MAGIC_MIN = MAGIC_HALF_BORDER;
const MAGIC_MAX = MAGIC_BOX_SIZE - MAGIC_HALF_BORDER;
const MAGIC_RING_PATH = `M ${MAGIC_BOX_SIZE / 2} ${MAGIC_MIN} L ${MAGIC_MAX - MAGIC_INNER_RADIUS} ${MAGIC_MIN} A ${MAGIC_INNER_RADIUS} ${MAGIC_INNER_RADIUS} 0 0 1 ${MAGIC_MAX} ${MAGIC_MIN + MAGIC_INNER_RADIUS} L ${MAGIC_MAX} ${MAGIC_MAX - MAGIC_INNER_RADIUS} A ${MAGIC_INNER_RADIUS} ${MAGIC_INNER_RADIUS} 0 0 1 ${MAGIC_MAX - MAGIC_INNER_RADIUS} ${MAGIC_MAX} L ${MAGIC_MIN + MAGIC_INNER_RADIUS} ${MAGIC_MAX} A ${MAGIC_INNER_RADIUS} ${MAGIC_INNER_RADIUS} 0 0 1 ${MAGIC_MIN} ${MAGIC_MAX - MAGIC_INNER_RADIUS} L ${MAGIC_MIN} ${MAGIC_MIN + MAGIC_INNER_RADIUS} A ${MAGIC_INNER_RADIUS} ${MAGIC_INNER_RADIUS} 0 0 1 ${MAGIC_MIN + MAGIC_INNER_RADIUS} ${MAGIC_MIN} L ${MAGIC_BOX_SIZE / 2} ${MAGIC_MIN} Z`;
const MAGIC_RING_PATH_LENGTH = 4 * (MAGIC_MAX - MAGIC_MIN - 2 * MAGIC_INNER_RADIUS) + 2 * Math.PI * MAGIC_INNER_RADIUS;
const MAGIC_DEBUG_RETRY = false;
const MAGIC_SKIP_API_CALL = false;

const { width, height } = Dimensions.get("window");
const CANVAS_MAX_WIDTH = width;
const CANVAS_MAX_HEIGHT = height * 0.55;
let magicRequestInFlight = false;

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
    /** Show Magic tab (only for templates "Full Teeth-Open" / "Front Face Smile"); when false, Adjustment has no Magic tab */
    showMagicTab?: boolean;
}

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ visible, uri, originalUri, initialTool, mediaId, mediaImageId, hasTemplate, patientId, initialEditorState, onClose, onSaveSuccess, showOnlyNote = false, showMagicTab = true }) => {
    const defaultTool = showMagicTab ? "Magic" : "Adjust";
    const [activeTool, setActiveTool] = useState(initialTool || defaultTool);
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
    const [isMagicPreviewOriginal, setIsMagicPreviewOriginal] = useState(false);
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
    const [magicCompleted, setMagicCompleted] = useState<{ success: boolean } | null>(null);
    const [magicRetryCount, setMagicRetryCount] = useState(0);
    const hasRequestedRef = useRef(false);
    const exportViewRef = useRef<ViewShot | null>(null);
    const insets = useSafeAreaInsets();
    // Pen strokes are stored in normalized coords (0–1) so they stay correct when layout changes (tab switch / resize)
    const savedEditorSnapshotRef = useRef<string | null>(null);
    const magicCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const magicCancelledRef = useRef(false);
    const magicAbortControllerRef = useRef<AbortController | null>(null);

    const magicGenerateMutation = useMagicGenerateMutation();

    // Magic loading progress: 0 → 80% over MAGIC_PROGRESS_DURATION_MS, then → 100% when API returns (green; red on error)
    const magicProgressShared = useSharedValue(0);
    const magicCompleteShared = useSharedValue(0);
    const magicErrorShared = useSharedValue(0);

    // Pen tool: state in normalized coords (0–1); convert to pixels only for DrawingCanvas so tab switch/resize doesn't break position
    const [penStrokes, setPenStrokes] = useState<Stroke[]>([]);
    const [penStrokesHistory, setPenStrokesHistory] = useState<Stroke[][]>([[]]);
    const [penHistoryIndex, setPenHistoryIndex] = useState(0);
    const [selectedPenColor, setSelectedPenColor] = useState("#FF3B30");
    const [selectedStrokeWidth, setSelectedStrokeWidth] = useState(4);

    const penStrokesPixels = useMemo(() => {
        const w = imageContainerLayout.width;
        const h = imageContainerLayout.height;
        if (!penStrokes.length || w <= 0 || h <= 0) return [];
        return penStrokes.map((s) => ({
            id: s.id,
            path: s.path.map((p) => ({ x: p.x * w, y: p.y * h })),
            color: s.color,
            width: s.width,
        }));
    }, [penStrokes, imageContainerLayout.width, imageContainerLayout.height]);

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

    const toggleMagicPreview = useCallback(() => {
        if (activeTool !== "Magic") return;

        // If we don't have any magic result yet, just toggle between original and current
        const hasResults = resultImages && Object.keys(resultImages).length > 0;

        if (!hasResults || !magicSelection) {
            const original = originalImageUri ?? uri ?? null;
            if (!original) return;

            if (!isMagicPreviewOriginal) {
                setDisplayedImageUri(original);
                setIsMagicPreviewOriginal(true);
            } else {
                setDisplayedImageUri(uri ?? null);
                setIsMagicPreviewOriginal(false);
            }
            return;
        }

        if (!isMagicPreviewOriginal) {
            const original = originalImageUri ?? uri ?? null;
            if (!original) return;
            setDisplayedImageUri(original);
            setIsMagicPreviewOriginal(true);
        } else {
            updateDisplayedImageFromResult(magicSelection);
        }
    }, [activeTool, magicSelection, isMagicPreviewOriginal, originalImageUri, uri, resultImages]);

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
            .enabled(activeTool === "Note" || activeTool === "Magic")
            .onEnd((event) => {
                if (activeTool === "Note") {
                    runOnJS(addNoteCallback)(event.x, event.y);
                } else if (activeTool === "Magic") {
                    runOnJS(toggleMagicPreview)();
                }
            });

        const doubleTap = Gesture.Tap()
            .enabled(__DEV__ && activeTool === "Note")
            .numberOfTaps(2)
            .onEnd(() => {
                runOnJS(() => {
                    setDebugMode((prev) => !prev);
                })();
            });

        return Gesture.Exclusive(tap, pinch, doubleTap);
    }, [activeTool, addNoteCallback, scale, toggleMagicPreview]);

    const animatedImageStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    // When zoom is active (scale !== 1), hide note markers and magnifier so they are not visible
    const overlayWhenZoomedHiddenStyle = useAnimatedStyle(() => {
        const s = scale.value;
        const isZoomed = s < 0.995 || s > 1.005;
        return { opacity: isZoomed ? 0 : 1 };
    }, []);

    const allTools: { name: string; icon: SymbolViewProps["name"]; disabled: boolean }[] = [
        { name: "Adjust", icon: "dial.min.fill" as SymbolViewProps["name"], disabled: false },
        // { name: "Crop", icon: "crop.rotate", disabled: false }, // TODO: not complete yet
        { name: "Note", icon: "pin.circle" as SymbolViewProps["name"], disabled: false },
        { name: "Magic", icon: "sparkles" as SymbolViewProps["name"], disabled: false },
        { name: "Pen", icon: "pencil.tip.crop.circle" as SymbolViewProps["name"], disabled: false },
    ];
    const tools = showOnlyNote ? allTools.filter((tool) => tool.name === "Note") : showMagicTab ? allTools : allTools.filter((tool) => tool.name !== "Magic");

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

            // exposure and brightness both affect brightness; combined for final filter
            const exposure = adjustments.exposure !== undefined ? adjustments.exposure / 100 : 0;
            const brightness = adjustments.brightness !== undefined ? adjustments.brightness / 100 : 0;
            const _effectiveBrightness = exposure + brightness;

            return imageUri;
        } catch (error) {
            if (__DEV__) console.error("Error applying adjustments:", error);
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

    // Handle pen strokes from DrawingCanvas (pixels) → store normalized so layout/tab change doesn't break position
    const handlePenStrokesChange = useCallback(
        (strokesPx: Stroke[]) => {
            const w = imageContainerLayout.width;
            const h = imageContainerLayout.height;
            if (w <= 0 || h <= 0) return;
            const normalized: Stroke[] = strokesPx.map((s) => ({
                id: s.id,
                path: s.path.map((p) => ({ x: p.x / w, y: p.y / h })),
                color: s.color,
                width: s.width,
            }));
            setPenStrokes(normalized);
            const newHistory = penStrokesHistory.slice(0, penHistoryIndex + 1);
            newHistory.push(normalized);
            setPenStrokesHistory(newHistory);
            setPenHistoryIndex(newHistory.length - 1);
            setImageChanges((prev) => {
                const filtered = prev.filter((c) => c.type !== "pen");
                return [...filtered, { type: "pen", data: { strokes: normalized } }];
            });
        },
        [imageContainerLayout.width, imageContainerLayout.height, penStrokesHistory, penHistoryIndex],
    );

    const convertImageToBase64 = async (imageUri: string): Promise<string | null> => {
        try {
            if (imageUri.startsWith("http://") || imageUri.startsWith("https://")) {
                if (!FileSystem.documentDirectory) {
                    if (__DEV__) console.error("Document directory not available");
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
            if (__DEV__) console.error("Error converting image to base64:", error);
            return null;
        }
    };

    useEffect(() => {
        if (!visible) return;
        if (__DEV__) {
            console.log("[MagicDebug] modal opened/updated", {
                uri,
                initialTool,
                lastActiveTool: initialEditorState?.lastActiveTool,
                showMagicTab,
            });
        }
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
            savedEditorSnapshotRef.current = null;
        }
        // When caller explicitly requests Adjust (e.g. from ImageViewer Adjust button), always open on Adjust and ignore previous tab
        if (initialTool === "Adjust") {
            setActiveTool("Adjust");
        } else if (initialEditorState?.lastActiveTool) {
            const t = initialEditorState.lastActiveTool;
            setActiveTool(t === "Magic" && !showMagicTab ? "Adjust" : t);
        } else if (initialTool) {
            setActiveTool(initialTool === "Magic" && !showMagicTab ? "Adjust" : initialTool);
        } else if (!showMagicTab) {
            setActiveTool("Adjust");
        }
    }, [uri, initialTool, visible, initialEditorState, showMagicTab]);

    useEffect(() => {
        if (!visible) return;
        if (__DEV__) {
            console.log("[MagicDebug] activeTool changed", { activeTool, showMagicTab });
        }
    }, [activeTool, visible, showMagicTab]);

    useEffect(() => {
        if (!visible || !initialEditorState) {
            if (!visible) savedEditorSnapshotRef.current = null;
            return;
        }
        savedEditorSnapshotRef.current = normalizeEditorSnapshot(initialEditorState);
        if (initialEditorState.adjustments != null) setAdjustmentValues(initialEditorState.adjustments);
        if (initialEditorState.notes?.length) setNotes(initialEditorState.notes as Note[]);
        if (initialEditorState.penStrokes?.length) {
            const strokes = initialEditorState.penStrokes as Stroke[];
            setPenStrokes(strokes);
            setPenStrokesHistory([[], strokes]);
            setPenHistoryIndex(1);
        }
        if (initialEditorState.magic) {
            setMagicSelection({
                ...initialEditorState.magic,
                colorTitle: "",
                styleTitle: "",
            });
        }
    }, [visible, initialEditorState]);

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
                        if (__DEV__) console.error("Error loading image dimensions:", error);
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

        // New API: keys orig_Mode_A1, pred_Mode_A1
        const newFormatKey = `${resultType}_${modeKey}`;
        const newMatch = resultImages[newFormatKey];
        if (newMatch) return newMatch;

        // Legacy format
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
                setDisplayedImageUri(formatted);
                setIsMagicPreviewOriginal(false);
                return;
            }
        }
        setDisplayedImageUri(uri ?? null);
        setIsMagicPreviewOriginal(false);
    };

    // When Magic loading modal opens (or Retry): run progress 0 → 80% over MAGIC_PROGRESS_DURATION_MS
    useEffect(() => {
        if (!isLoading) return;
        magicProgressShared.value = 0;
        magicCompleteShared.value = 0;
        magicErrorShared.value = 0;
        magicProgressShared.value = withTiming(0.8, { duration: MAGIC_PROGRESS_DURATION_MS, easing: Easing.linear });
    }, [isLoading, magicRetryCount]);

    useEffect(() => {
        return () => {
            if (magicCloseTimeoutRef.current) {
                clearTimeout(magicCloseTimeoutRef.current);
                magicCloseTimeoutRef.current = null;
            }
        };
    }, []);

    const MAGIC_FINISH_DURATION_MS = 1100;
    const MAGIC_COMPLETED_HOLD_MS = 600;

    const finishMagicLoading = useCallback((success: boolean) => {
        if (!success) magicErrorShared.value = withTiming(1, { duration: MAGIC_FINISH_DURATION_MS, easing: Easing.out(Easing.cubic) });
        magicProgressShared.value = withTiming(1, { duration: MAGIC_FINISH_DURATION_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
            if (finished) runOnJS(scheduleCloseMagicModal)(success);
        });
        magicCompleteShared.value = withTiming(1, { duration: MAGIC_FINISH_DURATION_MS, easing: Easing.out(Easing.cubic) });
    }, []);

    const scheduleCloseMagicModal = useCallback((success: boolean) => {
        if (MAGIC_DEBUG_RETRY) {
            setTimeout(() => setMagicCompleted({ success }), MAGIC_COMPLETED_HOLD_MS);
            return;
        }
        if (!success) {
            setTimeout(() => setMagicCompleted({ success: false }), MAGIC_COMPLETED_HOLD_MS);
            return;
        }
        if (magicCloseTimeoutRef.current) clearTimeout(magicCloseTimeoutRef.current);
        magicCloseTimeoutRef.current = setTimeout(() => {
            magicCloseTimeoutRef.current = null;
            setIsLoading(false);
            magicProgressShared.value = 0;
            magicCompleteShared.value = 0;
            magicErrorShared.value = 0;
            setMagicCompleted(null);
        }, 450);
    }, []);

    const handleMagicCancel = useCallback(() => {
        setIsLoading(false);
        setIsProcessing(false);
        setMagicCompleted(null);
        // Close loading modal first, then editor to avoid app going black (two modals overlapping)
        setTimeout(() => {
            magicCancelledRef.current = true;
            magicRequestInFlight = false;
            hasRequestedRef.current = false;
            magicAbortControllerRef.current?.abort();
            magicAbortControllerRef.current = null;
            magicProgressShared.value = 0;
            magicCompleteShared.value = 0;
            magicErrorShared.value = 0;
            onClose();
        }, 0);
    }, [onClose]);

    const handleMagicRetry = useCallback(() => {
        setMagicCompleted(null);
        hasRequestedRef.current = false;
        magicProgressShared.value = 0;
        magicCompleteShared.value = 0;
        magicErrorShared.value = 0;
        setMagicRetryCount((c) => c + 1);
    }, []);

    useEffect(() => {
        if (!visible) {
            magicRequestInFlight = false;
            return;
        }
        const processImage = async () => {
            if (!uri || !visible) return;
            if (__DEV__) {
                console.log("[MagicDebug] processImage enter", {
                    uriPresent: !!uri,
                    activeTool,
                    visible,
                    magicRequestInFlight,
                    hasRequested: hasRequestedRef.current,
                });
            }
            if (activeTool !== "Magic") {
                // Only clear loading state if no request is in flight and none has been requested yet
                if (!magicRequestInFlight && !hasRequestedRef.current) {
                    setIsLoading(false);
                    setIsProcessing(false);
                }
                return;
            }
            if (magicRequestInFlight || hasRequestedRef.current) {
                if (__DEV__) {
                    console.log("[MagicDebug] skip processImage (inFlight or requested)", {
                        magicRequestInFlight,
                        hasRequested: hasRequestedRef.current,
                    });
                }
                return;
            }
            magicRequestInFlight = true;
            hasRequestedRef.current = true;
            magicCancelledRef.current = false;
            const controller = new AbortController();
            magicAbortControllerRef.current = controller;
            setIsProcessing(true);
            setIsLoading(true);
            let success = false;
            try {
                const imageBase64 = await convertImageToBase64(uri);
                if (magicCancelledRef.current) return;
                if (imageBase64) {
                    if (__DEV__) {
                        console.log("[MagicDebug] calling magicGenerateMutation");
                    }
                    const result = await magicGenerateMutation.mutateAsync({
                        imageBase64,
                        signal: controller.signal,
                    });
                    if (magicCancelledRef.current) return;
                    setResultImages(result);
                    success = true;
                }
            } catch {
                // Error shown in UI (red state + Retry); or cancelled via AbortController
            } finally {
                magicAbortControllerRef.current = null;
                magicRequestInFlight = false;
                if (magicCancelledRef.current) return;
                setIsProcessing(false);
                if (__DEV__) {
                    console.log("[MagicDebug] processImage finished", { success });
                }
                finishMagicLoading(success);
            }
        };

        processImage();
    }, [uri, activeTool, visible, finishMagicLoading, magicRetryCount, magicGenerateMutation.mutateAsync]);

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
            // penStrokes are already normalized (0–1); round for stable API payload
            const normalizedPenStrokes =
                penStrokes.length > 0
                    ? penStrokes.map((s) => ({
                          id: s.id,
                          path: s.path.map((p) => ({ x: roundForSnapshot(p.x), y: roundForSnapshot(p.y) })),
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
                if (__DEV__) {
                    console.log("[ImageEditor] updateMediaImage payload:", {
                        mediaImageId: payload.mediaImageId,
                        edited_image: typeof requestData.edited_image === "string" ? requestData.edited_image : "[File/Blob]",
                        notes: requestData.notes != null ? (requestData.notes.length > 80 ? requestData.notes.slice(0, 80) + "…" : requestData.notes) : undefined,
                        data_keys: requestData.data ? Object.keys(requestData.data) : [],
                        editor: requestData.data?.editor,
                    });
                }
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
                if (__DEV__) {
                    console.log("[ImageEditor] editPatientMedia payload:", {
                        mediaId: payload.mediaId,
                        media: typeof requestData.media === "string" ? requestData.media : "[File]",
                        notes: requestData.notes != null ? (Array.isArray(requestData.notes) ? requestData.notes.length : String(requestData.notes).length) : undefined,
                        data_length: typeof requestData.data === "string" ? requestData.data.length : 0,
                    });
                }
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
        const normalizedPenStrokes =
            penStrokes.length > 0
                ? penStrokes.map((s) => ({
                      id: s.id,
                      path: s.path.map((p) => ({ x: roundForSnapshot(p.x), y: roundForSnapshot(p.y) })),
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
    }, [adjustmentValues, notes, penStrokes, magicSelection, activeTool]);

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

    const handleConfirmRevert = useCallback(() => {
        Alert.alert("Revert changes?", "This will discard all edits and restore the original image. Do you want to continue?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Revert",
                style: "destructive",
                onPress: () => {
                    // Revert all edits and save immediately
                    void handleRevert();
                },
            },
        ]);
    }, [handleRevert]);

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
            onApply: () => __DEV__ && console.log("Apply changes"),
            onCancel: () => __DEV__ && console.log("Cancel changes"),
        };

        switch (activeTool) {
            case "Adjust":
                return <ToolAdjust {...commonProps} initialAdjustmentValues={adjustmentValues} />;
            // case "Crop":
            //     return <ToolCrop {...commonProps} />; // TODO: not complete yet
            case "Note":
                return <ToolNote {...commonProps} notes={notes} activeNoteId={activeNoteId} onActiveNoteChange={setActiveNoteId} />;
            case "Magic":
                return <ToolMagic {...commonProps} isPreviewOriginal={isMagicPreviewOriginal} initialMagic={initialEditorState?.magic} />;
            case "Pen":
                return <ToolPen {...commonProps} selectedColor={selectedPenColor} selectedStrokeWidth={selectedStrokeWidth} onColorChange={setSelectedPenColor} onStrokeWidthChange={setSelectedStrokeWidth} />;
            default:
                return null;
        }
    };

    const magicRingAnimatedProps = useAnimatedProps(() => {
        "worklet";
        const complete = magicCompleteShared.value;
        const isError = magicErrorShared.value > 0.5;
        const strokeColor = complete > 0.5 ? (isError ? "#FF3B30" : "#34C759") : "#6B4EAA";
        return {
            strokeDashoffset: MAGIC_RING_PATH_LENGTH * (1 - magicProgressShared.value),
            stroke: strokeColor,
        };
    });

    const magicBorderStyle = useAnimatedStyle(() => {
        const complete = magicCompleteShared.value;
        const isError = magicErrorShared.value > 0.5;
        const color = "#D1D1D6";
        return { borderColor: color };
    }, []);

    const magicGlowStyle = useAnimatedStyle(() => {
        const p = magicProgressShared.value;
        const opacity = interpolate(p, [0, 0.15, 0.5, 0.9], [0, 0.5, 0.8, 1]);
        return { opacity };
    }, []);

    const magicToothStyle = useAnimatedStyle(() => {
        const complete = magicCompleteShared.value;
        const translateY = complete <= 0 ? 0 : interpolate(complete, [0, 0.5, 1], [0, -14, -28]);
        const opacity = complete <= 0 ? 1 : interpolate(complete, [0, 0.4, 0.7], [1, 0.4, 0]);
        return { transform: [{ translateY }], opacity };
    }, []);

    const magicIconCheckStyle = useAnimatedStyle(() => {
        const complete = magicCompleteShared.value;
        const isError = magicErrorShared.value > 0.5;
        const opacity = complete > 0.3 && !isError ? interpolate(complete, [0.3, 0.65], [0, 1]) : 0;
        const translateY = complete > 0.3 && !isError ? interpolate(complete, [0.3, 0.75], [24, 0]) : 24;
        const scale = interpolate(complete, [0.3, 0.7], [0.85, 1]);
        return { opacity, transform: [{ translateY }, { scale }] };
    }, []);

    const magicIconErrorStyle = useAnimatedStyle(() => {
        const complete = magicCompleteShared.value;
        const isError = magicErrorShared.value > 0.5;
        const opacity = complete > 0.3 && isError ? interpolate(complete, [0.3, 0.65], [0, 1]) : 0;
        const translateY = complete > 0.3 && isError ? interpolate(complete, [0.3, 0.75], [24, 0]) : 24;
        const scale = interpolate(complete, [0.3, 0.7], [0.85, 1]);
        return { opacity, transform: [{ translateY }, { scale }] };
    }, []);

    const magicGradientSuccessStyle = useAnimatedStyle(() => {
        const complete = magicCompleteShared.value;
        const isError = magicErrorShared.value > 0.5;
        const opacity = complete > 0.3 && !isError ? interpolate(complete, [0.2, 0.6], [0, 1]) : 0;
        return { opacity };
    }, []);

    const magicGradientErrorStyle = useAnimatedStyle(() => {
        const complete = magicCompleteShared.value;
        const isError = magicErrorShared.value > 0.5;
        const opacity = complete > 0.3 && isError ? interpolate(complete, [0.2, 0.6], [0, 1]) : 0;
        return { opacity };
    }, []);

    return (
        <Modal visible={visible} transparent={false} animationType="slide" presentationStyle="fullScreen">
            <SafeAreaView style={styles.container}>
                <Modal visible={isLoading} transparent animationType="none">
                    <View className="w-full items-center justify-center flex-1 p-3">
                        <BlurView intensity={40} tint="dark" style={styles.blurOverlay} />
                        <View className="w-full max-w-[340px] bg-white py-[60px] px-8 rounded-3xl items-center justify-center">
                            <View className="items-center justify-center gap-5">
                                <View className="w-[220px] h-[220px]">
                                    <Animated.View style={[styles.magicBoxOuter, magicBorderStyle]}>
                                        <View style={[StyleSheet.absoluteFill, { top: -3, left: -3 }]} pointerEvents="none">
                                            <Svg width={220} height={220} viewBox="0 0 220 220">
                                                <AnimatedPath d={MAGIC_RING_PATH} fill="none" strokeWidth={3} strokeLinecap="butt" strokeLinejoin="round" strokeDasharray={MAGIC_RING_PATH_LENGTH} animatedProps={magicRingAnimatedProps} />
                                            </Svg>
                                        </View>
                                        <View style={styles.magicBoxInner}>
                                            <Animated.View style={[StyleSheet.absoluteFill, styles.magicGlowWrap, magicGlowStyle]} pointerEvents="none">
                                                <LinearGradient colors={["transparent", "rgba(107,78,170,0.35)", "rgba(107,78,170,0.7)", "rgba(107,78,170,0.5)"]} style={styles.magicGlow} />
                                            </Animated.View>
                                            <Animated.View style={[StyleSheet.absoluteFill, magicGradientSuccessStyle]} pointerEvents="none">
                                                <Svg width="100%" height="100%" viewBox="0 0 200 200" style={StyleSheet.absoluteFill} preserveAspectRatio="xMidYMid slice">
                                                    <Defs>
                                                        <RadialGradient id="magicBeamGreen" cx="0.5" cy="1" r="1.2" gradientUnits="objectBoundingBox">
                                                            <Stop offset="0" stopColor="#34C759" stopOpacity="0.95" />
                                                            <Stop offset="0.35" stopColor="#34C759" stopOpacity="0.4" />
                                                            <Stop offset="0.6" stopColor="#34C759" stopOpacity="0.1" />
                                                            <Stop offset="1" stopColor="#4D4D4D" stopOpacity="0" />
                                                        </RadialGradient>
                                                    </Defs>
                                                    <Rect x={0} y={0} width={200} height={200} fill="#4D4D4D" />
                                                    <Rect x={0} y={0} width={200} height={200} fill="url(#magicBeamGreen)" />
                                                </Svg>
                                            </Animated.View>
                                            <Animated.View style={[StyleSheet.absoluteFill, magicGradientErrorStyle]} pointerEvents="none">
                                                <Svg width="100%" height="100%" viewBox="0 0 200 200" style={StyleSheet.absoluteFill} preserveAspectRatio="xMidYMid slice">
                                                    <Defs>
                                                        <RadialGradient id="magicBeamRed" cx="0.5" cy="1" r="1.2" gradientUnits="objectBoundingBox">
                                                            <Stop offset="0" stopColor="#FF3B30" stopOpacity="0.95" />
                                                            <Stop offset="0.35" stopColor="#FF3B30" stopOpacity="0.4" />
                                                            <Stop offset="0.6" stopColor="#FF3B30" stopOpacity="0.1" />
                                                            <Stop offset="1" stopColor="#4D4D4D" stopOpacity="0" />
                                                        </RadialGradient>
                                                    </Defs>
                                                    <Rect x={0} y={0} width={200} height={200} fill="#4D4D4D" />
                                                    <Rect x={0} y={0} width={200} height={200} fill="url(#magicBeamRed)" />
                                                </Svg>
                                            </Animated.View>
                                            <Animated.View style={[styles.magicToothWrap, magicToothStyle]} pointerEvents="none">
                                                <Image source={require("@/assets/images/tothColor/A1Big.png")} style={styles.magicToothImage} resizeMode="contain" />
                                            </Animated.View>
                                            <View style={styles.magicIconCenterWrap} pointerEvents="none">
                                                <Animated.View style={[styles.magicIconCircle, styles.magicIconCheck, magicIconCheckStyle]}>
                                                    <IconSymbol name="checkmark" size={36} color="#fff" weight="bold" />
                                                </Animated.View>
                                                <Animated.View style={[styles.magicIconCircle, styles.magicIconError, magicIconErrorStyle]}>
                                                    <IconSymbol name="xmark" size={36} color="#fff" weight="bold" />
                                                </Animated.View>
                                            </View>
                                        </View>
                                    </Animated.View>
                                </View>
                                <View className="gap-0 items-center justify-center w-full">
                                    <BaseText type="Title1" color="labels.primary">
                                        {magicCompleted?.success === false ? "Something went wrong" : "Magic Happening..."}
                                    </BaseText>
                                    <BaseText type="Body" color="labels.secondary">
                                        {magicCompleted?.success === false ? "Tap Retry to try again or Cancel to go back." : "This may take a few minutes."}
                                    </BaseText>
                                    {magicCompleted?.success === false ? (
                                        <View className="flex-col gap-2 top-5 w-[200px]">
                                            <BaseButton label="Retry" onPress={handleMagicRetry} ButtonStyle="Filled" size="Medium" rounded={true} />
                                            <BaseButton label="Cancel" onPress={handleMagicCancel} ButtonStyle="Tinted" size="Medium" rounded={true} />
                                        </View>
                                    ) : (
                                        <View className="flex-col gap-2 top-5 w-[200px]">
                                            <BaseButton label="Cancel" onPress={handleMagicCancel} ButtonStyle="Tinted" size="Medium" rounded={true} />
                                        </View>
                                    )}
                                </View>
                            </View>
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
                        <Button variant="glassProminent" color={!hasUnsavedChanges ? "#E53935" : "#FFCC00"} onPress={hasUnsavedChanges ? handleDone : handleConfirmRevert} disabled={isSaving}>
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
                                    <DrawingCanvas width={imageContainerLayout.width} height={imageContainerLayout.height} strokes={penStrokesPixels} selectedColor={selectedPenColor} selectedStrokeWidth={selectedStrokeWidth} onStrokesChange={handlePenStrokesChange} enabled={activeTool === "Pen"} />
                                </ViewShot>

                                {/* Note Markers outside ViewShot – hidden when zoomed */}
                                {activeTool === "Note" && (
                                    <Animated.View style={[StyleSheet.absoluteFill, overlayWhenZoomedHiddenStyle]} pointerEvents="box-none">
                                        {notes.map((note, index) => (
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
                                    </Animated.View>
                                )}
                            </View>
                        </Animated.View>
                    </GestureDetector>

                    {/* Magnifier – hidden when zoomed */}
                    {activeTool === "Note" && magnifierState.visible && (
                        <Animated.View style={[StyleSheet.absoluteFill, overlayWhenZoomedHiddenStyle]} pointerEvents="none">
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
                        </Animated.View>
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

                <View className="flex-row items-center justify-center bg-red-400  w-full " style={{ position: "relative" }}>
                    {(() => {
                        const activeIndex = tools.findIndex((t) => t.name === activeTool);
                        if (activeIndex < 0) return null;
                        const barWidth = 230;
                        const paddingH = 16;
                        const spacing = 20;
                        const itemWidth = (barWidth - paddingH * 2 - (tools.length - 1) * spacing) / tools.length;
                        const centerX = (width - barWidth) / 2 + paddingH + (itemWidth + spacing) * activeIndex + itemWidth / 2;
                        const chevronSize = 12;
                        return (
                            <View
                                style={{
                                    position: "absolute",
                                    top: -chevronSize - 8,
                                    left: centerX - chevronSize / 2,
                                    width: chevronSize,
                                    height: chevronSize,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    zIndex: 200,
                                }}
                                pointerEvents="none"
                            >
                                <IconSymbol name={"chevron.up.fill" as SymbolViewProps["name"]} size={chevronSize} color="#FFCC00" />
                            </View>
                        );
                    })()}
                    <Host matchContents>
                        <HStack alignment="center" spacing={20} modifiers={[padding({ horizontal: 16, vertical: 8 }), frame({ width: 230 }), glassEffect({ glass: { variant: "regular" } })]}>
                            {tools.map((t) => {
                                const isActive = activeTool === t.name;
                                // Adjust (dial): use fill only when active; otherwise outline
                                const iconName: SymbolViewProps["name"] = t.icon === "dial.min.fill" ? (isActive ? "dial.min.fill" : ("dial.min" as SymbolViewProps["name"])) : t.icon;
                                return (
                                    <Button key={t.name} onPress={() => handleToolPress(t.name)} variant="plain">
                                        <VStack alignment="center" spacing={2}>
                                            <SwiftUIImage systemName={iconName} size={iconSize} color={isActive ? colors.labels.primary : t.disabled ? colors.labels.tertiary : colors.labels.secondary} />
                                            <Text lineLimit={1} size={12} color={isActive ? "labels.primary" : t.disabled ? "labels.tertiary" : "labels.secondary"}>
                                                {t.name}
                                            </Text>
                                        </VStack>
                                    </Button>
                                );
                            })}
                        </HStack>
                    </Host>
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
    magicBoxOuter: {
        width: 220,
        height: 220,
        borderRadius: 60,
        borderWidth: 3,

        overflow: "visible",
    },
    magicBoxInner: {
        flex: 1,
        margin: 10,
        borderRadius: 50,
        backgroundColor: "#4D4D4D",
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
    },
    magicGlowWrap: {
        borderRadius: 35,
        overflow: "hidden",
    },
    magicGlow: {
        flex: 1,
        width: "100%",
        height: "100%",
    },
    magicToothWrap: {
        position: "absolute",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
    },
    magicToothImage: {
        width: 80,
        height: 160,
        marginTop: 15,
    },
    magicIconCenterWrap: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 20,
    },
    magicIconCircle: {
        position: "absolute",
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: "center",
        justifyContent: "center",
    },
    magicIconCheck: {
        backgroundColor: "#34C759",
    },
    magicIconError: {
        backgroundColor: "#FF3B30",
    },
    magicIconText: {
        color: "#fff",
        fontSize: 40,
        fontWeight: "600",
    },
    magicErrorActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginTop: 20,
    },
    magicDebugActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    magicRetryButton: {
        paddingVertical: 10,
        paddingHorizontal: 24,
        backgroundColor: "#6B4EAA",
        borderRadius: 12,
    },
    magicRetryText: {
        color: "#fff",
        fontWeight: "600",
    },
    magicSimulateSuccessButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: "#34C759",
        borderRadius: 12,
    },
    magicSimulateErrorButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: "#FF3B30",
        borderRadius: 12,
    },
    magicSimulateErrorText: {
        color: "#fff",
        fontWeight: "600",
    },
    magicCloseButton: {
        paddingVertical: 10,
        paddingHorizontal: 24,
        backgroundColor: "rgba(0,0,0,0.08)",
        borderRadius: 12,
    },
    magicCloseText: {
        color: "#000",
        fontWeight: "600",
    },
    magicCancelButton: {
        marginTop: 20,
        paddingVertical: 10,
        paddingHorizontal: 24,
        backgroundColor: "rgba(0,0,0,0.08)",
        borderRadius: 12,
    },
    magicCancelText: {
        color: "#000",
        fontWeight: "600",
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
