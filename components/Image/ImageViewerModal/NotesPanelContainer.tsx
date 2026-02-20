import React from "react";
import { StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { ImageViewerNotesPanel, type NoteItem } from "../ImageViewerNotesPanel";

export type { NoteItem };

export interface NotesPanelContainerProps {
    notesPanelVisible: boolean;
    notesPanelAnimatedStyle: Record<string, unknown>;
    imageUri: string;
    notes: NoteItem[];
    selectedNoteId: string | null;
    onSelectNote: (id: string | null) => void;
    onClose: () => void;
    onEditPress: () => void;
}

export const NotesPanelContainer = React.memo<NotesPanelContainerProps>(function NotesPanelContainer({
    notesPanelVisible,
    notesPanelAnimatedStyle,
    imageUri,
    notes,
    selectedNoteId,
    onSelectNote,
    onClose,
    onEditPress,
}) {
    if (!notesPanelVisible) {
        return null;
    }

    return (
        <Animated.View style={[styles.notesPanelWrapper, notesPanelAnimatedStyle]} pointerEvents="box-none">
            <ImageViewerNotesPanel visible onClose={onClose} imageUri={imageUri} paddingBottom={0} notes={notes} selectedNoteId={selectedNoteId} onSelectNote={onSelectNote} onEditPress={onEditPress} />
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    notesPanelWrapper: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 11,
    },
});
