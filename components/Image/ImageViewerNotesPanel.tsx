import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const EDIT_BUTTON_MINT = "#5BE2BC";
const PANEL_BG = "rgba(44, 44, 46, 0.88)";
const NOTE_ITEM_BG = "rgba(58, 58, 60, 1)";
const NUMBER_CIRCLE_BG = "rgba(118, 118, 128, 0.4)";

export type NoteItem = { id: string; x: number; y: number; text: string };

export interface ImageViewerNotesPanelProps {
    visible: boolean;
    onClose: () => void;
    imageUri: string;
    /** Safe area bottom inset from parent */
    paddingBottom?: number;
    /** Optional: called when Edit or Add note is pressed – open editor on Note tab */
    onEditPress?: () => void;
    /** Notes from media.data.editor.notes for current image. If empty, "Add note" is shown. */
    notes?: NoteItem[];
    /** Currently selected note id (synced with markers on image). */
    selectedNoteId?: string | null;
    /** Called when user selects a note (panel selector or marker on image). */
    onSelectNote?: (id: string) => void;
    /** Optional: render custom content. If provided, overrides notes/Add note UI. */
    children?: React.ReactNode;
}

/**
 * Notes panel – shows selected note text from media.data, or "Add note" if none.
 * Only one note is shown at a time (default first). Edit opens editor on Note tab.
 */
export const ImageViewerNotesPanel: React.FC<ImageViewerNotesPanelProps> = ({ visible, onClose, imageUri, paddingBottom = 0, onEditPress, notes = [], selectedNoteId = null, onSelectNote, children }) => {
    const insets = useSafeAreaInsets();
    const safeNotes = Array.isArray(notes) ? notes : [];
    const hasNotes = safeNotes.length > 0;
    const selectedIndex =
        selectedNoteId != null
            ? Math.max(
                  0,
                  safeNotes.findIndex((n) => n.id === selectedNoteId),
              )
            : 0;
    const selectedNote = hasNotes ? safeNotes[Math.min(selectedIndex, safeNotes.length - 1)] : null;

    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
    };

    const handleEdit = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onEditPress?.();
    };

    const handleAddNote = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onEditPress?.();
    };

    if (!visible) return null;

    const renderContent = () => {
        if (children != null) return children;

        if (!hasNotes) {
            return (
                <TouchableOpacity onPress={handleEdit} style={styles.editButton} activeOpacity={0.8}>
                    <IconSymbol size={24} name="pin" color={colors.system.white as any} />
                    <Text style={styles.editButtonText}>Add note</Text>
                </TouchableOpacity>
            );
        }

        return (
            <View style={styles.contentBlock}>
                {/* Note selector: only one selected, default first */}
                <BlurView intensity={80} tint="dark" style={{ borderRadius: 30, overflow: "hidden", padding: 4 }}>
                    <View style={styles.noteItem}>
                        <View style={styles.noteNumberCircle}>
                            <Text style={styles.noteNumberText}>{selectedIndex + 1}</Text>
                        </View>
                        <Text style={styles.noteItemText} numberOfLines={4}>
                            {selectedNote?.text?.trim() || "—"}
                        </Text>
                    </View>
                </BlurView>
            </View>
        );
    };

    const panelContent = (
        <View style={styles.panel}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={handleClose} style={styles.headerLeft} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.7}>
                    <IconSymbol size={20} name="pin.circle" color={colors.system.white as any} />
                    <Text style={styles.title}>Notes</Text>
                </TouchableOpacity>
                {hasNotes && (
                    <TouchableOpacity onPress={handleEdit} style={styles.editButton} activeOpacity={0.8}>
                        <IconSymbol size={16} name="square.and.pencil" color={colors.system.white as any} />
                        <Text style={styles.editButtonText}>{hasNotes ? "Edit" : "Add note"}</Text>
                    </TouchableOpacity>
                )}
            </View>
            <View style={styles.content}>{renderContent()}</View>
        </View>
    );

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom, paddingHorizontal: 10 }]} pointerEvents="box-none">
            {Platform.OS === "ios" ? (
                <BlurView intensity={80} tint="dark" style={{ borderRadius: 30, overflow: "hidden" }}>
                    {panelContent}
                </BlurView>
            ) : (
                <View style={[styles.panel, styles.panelSolid]}>{panelContent}</View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 11,
    },
    panel: {
        borderRadius: 30,
        padding: 16,
        gap: 12,
    },
    panelSolid: {
        backgroundColor: PANEL_BG,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    title: {
        fontSize: 17,
        fontWeight: "500",
        color: colors.system.white as string,
    },
    editButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        justifyContent: "center",
        backgroundColor: EDIT_BUTTON_MINT,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    editButtonText: {
        fontSize: 16,
        fontWeight: "500",
        color: colors.system.white as string,
    },
    content: {},
    contentBlock: {
        gap: 10,
    },
    addNoteButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        backgroundColor: NOTE_ITEM_BG,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 16,
    },
    addNoteButtonText: {
        fontSize: 16,
        fontWeight: "500",
        color: colors.system.white as string,
    },
    selectorRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    selectorDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: NUMBER_CIRCLE_BG,
        alignItems: "center",
        justifyContent: "center",
    },
    selectorDotActive: {
        backgroundColor: EDIT_BUTTON_MINT,
    },
    selectorDotText: {
        fontSize: 13,
        fontWeight: "500",
        color: colors.system.white as string,
        opacity: 0.8,
    },
    selectorDotTextActive: {
        opacity: 1,
        color: colors.system.white as string,
    },
    noteItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        alignContent: "center",
        justifyContent: "center",
    },
    noteNumberCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: NUMBER_CIRCLE_BG,
        alignItems: "center",
        justifyContent: "center",
    },
    noteNumberText: {
        fontSize: 13,
        fontWeight: "500",
        color: colors.system.white as string,
    },
    noteItemText: {
        flex: 1,
        fontSize: 16,
        fontWeight: "400",

        color: colors.system.white as string,
    },
});
