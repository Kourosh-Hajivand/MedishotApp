import colors from "@/theme/colors";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import React from "react";
import { Dimensions, StyleSheet, Text as RNText, TouchableOpacity } from "react-native";
import Animated from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

const MARKER_SIZE = 30;
const MARKER_R = MARKER_SIZE / 2;

export interface NoteMarker {
    id: string;
    x: number;
    y: number;
    [key: string]: any;
}

export interface NotesOverlayProps {
    notesPanelVisible: boolean;
    notesForCurrentImage: NoteMarker[];
    imageSizes: Record<number, { width: number; height: number }>;
    displayIndex: number;
    imageAnimatedStyle: Record<string, unknown>;
    selectedNoteId: string | null;
    onSelectNote: (id: string) => void;
}

export const NotesOverlay = React.memo<NotesOverlayProps>(function NotesOverlay({
    notesPanelVisible,
    notesForCurrentImage,
    imageSizes,
    displayIndex,
    imageAnimatedStyle,
    selectedNoteId,
    onSelectNote,
}) {
    if (!notesPanelVisible || notesForCurrentImage.length === 0) {
        return null;
    }

    const imageSize = imageSizes[displayIndex] || { width, height };
    const imageLeft = (width - imageSize.width) / 2;
    const imageTop = (height - imageSize.height) / 2;

    return (
        <Animated.View style={[styles.notesOverlay, imageAnimatedStyle]} pointerEvents="box-none">
            {notesForCurrentImage.map((note, index) => {
                const px = imageLeft + note.x * imageSize.width - MARKER_R;
                const py = imageTop + note.y * imageSize.height - MARKER_R;
                const isActive = selectedNoteId === note.id;
                return (
                    <TouchableOpacity
                        key={note.id}
                        style={[styles.noteMarker]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onSelectNote(note.id);
                        }}
                        activeOpacity={0.8}
                    >
                        <BlurView
                            intensity={80}
                            tint={isActive ? "light" : "dark"}
                            style={{
                                overflow: "hidden",
                                left: px,
                                top: py,
                                width: MARKER_SIZE,
                                height: MARKER_SIZE,
                                borderRadius: MARKER_R,
                                backgroundColor: isActive ? colors.system.blue : "transparent",
                                borderWidth: isActive ? 2 : 1.5,
                                borderColor: "white",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <RNText style={styles.noteMarkerText}>{String(index + 1)}</RNText>
                        </BlurView>
                    </TouchableOpacity>
                );
            })}
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    notesOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 15,
    },
    noteMarker: {
        position: "absolute",
        borderColor: colors.system.white,
        alignItems: "center",
        justifyContent: "center",
    },
    noteMarkerText: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.system.white,
    },
});
