import { ImageSourcePropType } from "react-native";
// Types for Image Editor Tools

export interface ImageChange {
    type: "adjust" | "crop" | "note" | "magic" | "pen";
    data: AdjustChange | CropChange | NoteChange | MagicChange | PenChange;
}

export interface AdjustChange {
    exposure?: number;
    brightness?: number;
    contrast?: number;
    saturation?: number;
    warmth?: number;
    highlights?: number;
    shadows?: number;
}

export interface CropChange {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
}

export interface NoteChange {
    notes: Array<{
        id: string;
        x: number;
        y: number;
        text: string;
        color?: string;
    }>;
}

export interface MagicColorOption {
    title: string;
    image: ImageSourcePropType;
    modeKey: string;
}

export interface MagicStyleOption {
    title: string;
    imageUri: ImageSourcePropType;
    resultType: "orig" | "pred";
}

export interface MagicChange {
    color: MagicColorOption;
    style: MagicStyleOption;
}

export interface PenChange {
    strokes: Array<{
        id: string;
        path: Array<{ x: number; y: number }>;
        color: string;
        width: number;
    }>;
}

export interface ImageEditorToolProps {
    imageUri: string;
    onChange: (change: ImageChange) => void;
    onApply?: () => void;
    onCancel?: () => void;
    /** Optional flag for tools that support original/result preview (e.g. Magic). */
    isPreviewOriginal?: boolean;
    /** Saved Magic selection (modeKey + resultType) to preselect style and color when reopening. */
    initialMagic?: { modeKey: string; resultType: "orig" | "pred" };
    notes?: Array<{
        id: string;
        x: number;
        y: number;
        text: string;
    }>;
    /** Saved adjustment values so sliders reflect current state (e.g. when reopening edited image). */
    initialAdjustmentValues?: AdjustChange | null;
}

/**
 * Persisted editor state for save/restore (API data.editor).
 * When editorVersion === 1: note x,y and pen path points are normalized (0–1) so they can be
 * restored on any screen size and reverted by clearing this state.
 */
export interface EditorState {
    /** Schema version. 1 = normalized coordinates for notes and pen paths. */
    editorVersion?: 1;
    adjustments?: AdjustChange | null;
    /** Note positions in normalized coords (0–1) when editorVersion === 1. */
    notes?: Array<{ id: string; x: number; y: number; text: string }>;
    /** Pen paths in normalized coords (0–1) when editorVersion === 1. */
    penStrokes?: Array<{ id: string; path: Array<{ x: number; y: number }>; color: string; width: number }>;
    magic?: { modeKey: string; resultType: "orig" | "pred" };
    /** Last active tool tab for default selection when reopening. */
    lastActiveTool?: string;
}

/**
 * Parse media.data from API (string or object) and return editor state for ImageEditorModal.
 * Backend may return data as JSON string e.g. "{\"editor\":{\"editorVersion\":1,...}}".
 */
export function parseEditorStateFromMediaData(data: unknown): EditorState | null {
    if (data == null) return null;
    try {
        const parsed = typeof data === "string" ? JSON.parse(data) : data;
        const editor = parsed?.editor;
        if (editor && typeof editor === "object") return editor as EditorState;
    } catch {
        // ignore
    }
    return null;
}
