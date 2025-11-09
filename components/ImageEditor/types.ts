import { ImageSourcePropType } from "react-native";
// Types for Image Editor Tools

export interface ImageChange {
    type: "adjust" | "crop" | "note" | "magic" | "pen";
    data: AdjustChange | CropChange | NoteChange | MagicChange | PenChange;
}

export interface AdjustChange {
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
}
