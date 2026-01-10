import { BaseText } from "@/components";
import colors from "@/theme/colors.shared";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, NativeScrollEvent, NativeSyntheticEvent, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, runOnJS, useAnimatedKeyboard, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { ImageEditorToolProps } from "./types";

export type Note = {
    id: string;
    x: number; // percentage 0-1
    y: number; // percentage 0-1
    text: string;
};

const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 3;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

// Picker Item Component
const PickerItem: React.FC<{
    note: Note;
    index: number;
    isCenter: boolean;
    onTextChange: (id: string, text: string) => void;
    onDelete: (id: string) => void;
    onPress: (id: string) => void;
}> = ({ note, index, isCenter, onTextChange, onDelete, onPress }) => {
    const translateX = useSharedValue(0);
    const deleteOpacity = useSharedValue(0);

    const panGesture = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-5, 5])
        .onStart(() => {
            runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
        })
        .onUpdate((event) => {
            if (event.translationX < 0) {
                translateX.value = Math.max(event.translationX, -80);
            }
        })
        .onEnd(() => {
            if (translateX.value < -40) {
                translateX.value = withTiming(-80, { duration: 200 });
                deleteOpacity.value = withTiming(1, { duration: 150 });
            } else {
                translateX.value = withTiming(0, { duration: 200 });
                deleteOpacity.value = withTiming(0, { duration: 150 });
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const deleteStyle = useAnimatedStyle(() => ({
        opacity: deleteOpacity.value,
    }));

    const handleDelete = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onDelete(note.id);
    };

    // Scale/opacity based on center state
    const scale = isCenter ? 1 : 0.9;
    const opacity = isCenter ? 1 : 0.9;

    return (
        <View style={styles.pickerItemWrapper}>
            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.noteItemContainer, isCenter && styles.noteItemContainerActive, { transform: [{ scale }], opacity }, animatedStyle]}>
                    <Pressable style={styles.itemPressable} onPress={() => onPress(note.id)}>
                        <View style={[styles.noteNumberBadge, isCenter && styles.noteNumberBadgeActive]}>
                            <BaseText type="Body" color={isCenter ? "system.white" : "labels.secondary"} style={isCenter ? { fontWeight: "700" } : undefined}>
                                {index + 1}
                            </BaseText>
                        </View>
                        <BaseText type="Body" color={isCenter ? "labels.primary" : "labels.tertiary"} numberOfLines={1} style={styles.notePreviewText}>
                            {note.text || "Type Here..."}
                        </BaseText>
                    </Pressable>
                </Animated.View>
            </GestureDetector>

            {/* Delete Button */}
            <Animated.View style={[styles.deleteButton, deleteStyle]}>
                <Pressable onPress={handleDelete} style={styles.deleteButtonInner}>
                    <BaseText type="Subhead" color="system.white">
                        Delete
                    </BaseText>
                </Pressable>
            </Animated.View>
        </View>
    );
};

// Floating Input that moves with keyboard
const FloatingInput: React.FC<{
    note: Note;
    index: number;
    onTextChange: (id: string, text: string) => void;
    onClose: () => void;
}> = ({ note, index, onTextChange, onClose }) => {
    const inputRef = useRef<TextInput>(null);
    const keyboard = useAnimatedKeyboard();
    const slideY = useSharedValue(30);
    const opacity = useSharedValue(0);

    useEffect(() => {
        // Smooth fade in + slide up animation
        slideY.value = withTiming(0, { duration: 350, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
        opacity.value = withTiming(1, { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
        setTimeout(() => inputRef.current?.focus(), 100);

        // Listen for keyboard WILL hide
        const keyboardHideSub = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => {
            // Fade out + slide down animation before closing
            slideY.value = withTiming(30, { duration: 250, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
            opacity.value = withTiming(0, { duration: 200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
            setTimeout(onClose, 200);
        });

        return () => {
            keyboardHideSub.remove();
        };
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        // 46px gap from keyboard
        transform: [{ translateY: -keyboard.height.value + 70 }],
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[styles.floatingContainer, animatedStyle]}>
            <View style={styles.floatingContent}>
                <View style={styles.floatingBadge}>
                    <BaseText type="Body" color="system.white" style={{ fontWeight: "700" }}>
                        {index + 1}
                    </BaseText>
                </View>
                <TextInput ref={inputRef} value={note.text} onChangeText={(text) => onTextChange(note.id, text)} placeholder="Type Here..." placeholderTextColor={colors.labels.tertiary} style={styles.floatingInput} returnKeyType="done" onSubmitEditing={onClose} autoFocus />
                <Pressable onPress={onClose} style={styles.doneButton}>
                    <BaseText type="Headline" color="system.blue">
                        Done
                    </BaseText>
                </Pressable>
            </View>
        </Animated.View>
    );
};

export const ToolNote: React.FC<ImageEditorToolProps & { activeNoteId?: string | null; onActiveNoteChange?: (id: string | null) => void }> = ({ imageUri, onChange, onApply, onCancel, notes: propNotes = [], activeNoteId: propActiveNoteId, onActiveNoteChange }) => {
    const scrollViewRef = useRef<ScrollView>(null);
    const [centerIndex, setCenterIndex] = useState(0);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const isScrolling = useRef(false);
    const lastHapticIndex = useRef(-1);

    const activeNoteId = propActiveNoteId ?? null;
    const setActiveNoteId = onActiveNoteChange ?? (() => {});

    // Get editing note
    const editingNote = propNotes.find((n) => n.id === editingNoteId);
    const editingNoteIndex = propNotes.findIndex((n) => n.id === editingNoteId);

    // Scroll to active note when it changes from outside (but don't open keyboard)
    useEffect(() => {
        if (activeNoteId && propNotes.length > 0 && !isScrolling.current) {
            const noteIndex = propNotes.findIndex((n) => n.id === activeNoteId);
            if (noteIndex >= 0) {
                // Only scroll to the note - don't open keyboard
                if (noteIndex !== centerIndex) {
                    setCenterIndex(noteIndex);
                    const targetY = noteIndex * ITEM_HEIGHT;
                    scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
                }
            }
        }
    }, [activeNoteId, propNotes]);

    const handleTextChange = useCallback(
        (id: string, text: string) => {
            const updated = propNotes.map((note) => (note.id === id ? { ...note, text } : note));
            onChange({
                type: "note",
                data: { notes: updated },
            });
        },
        [propNotes, onChange],
    );

    const handleDelete = useCallback(
        (id: string) => {
            const updated = propNotes.filter((note) => note.id !== id);
            onChange({
                type: "note",
                data: { notes: updated },
            });
        },
        [propNotes, onChange],
    );

    const handleItemPress = (id: string) => {
        setActiveNoteId(id);
        setEditingNoteId(id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleCloseEdit = () => {
        setEditingNoteId(null);
        Keyboard.dismiss();
    };

    const handleScrollBegin = () => {
        isScrolling.current = true;
    };

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = event.nativeEvent.contentOffset.y;
        const currentIndex = Math.round(y / ITEM_HEIGHT);
        const clampedIndex = Math.max(0, Math.min(currentIndex, propNotes.length - 1));

        // Haptic on each item change while scrolling
        if (clampedIndex !== lastHapticIndex.current && clampedIndex !== centerIndex) {
            lastHapticIndex.current = clampedIndex;
            Haptics.selectionAsync();
        }
    };

    const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        isScrolling.current = false;
        const y = event.nativeEvent.contentOffset.y;
        const newIndex = Math.round(y / ITEM_HEIGHT);
        const clampedIndex = Math.max(0, Math.min(newIndex, propNotes.length - 1));

        if (clampedIndex !== centerIndex) {
            setCenterIndex(clampedIndex);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            // Update active note
            if (propNotes[clampedIndex]) {
                setActiveNoteId(propNotes[clampedIndex].id);
            }
        }

        lastHapticIndex.current = -1;
    };

    // Set initial center index based on active note
    useEffect(() => {
        if (propNotes.length > 0) {
            const idx = propNotes.findIndex((n) => n.id === activeNoteId);
            if (idx >= 0) {
                setCenterIndex(idx);
            }
        }
    }, []);

    return (
        <View style={styles.container}>
            {propNotes.length > 0 ? (
                <View style={styles.pickerContainer}>
                    <ScrollView
                        ref={scrollViewRef}
                        style={styles.picker}
                        contentContainerStyle={[styles.pickerContent, { paddingVertical: ITEM_HEIGHT }]}
                        showsVerticalScrollIndicator={false}
                        snapToInterval={ITEM_HEIGHT}
                        decelerationRate="fast"
                        onScrollBeginDrag={handleScrollBegin}
                        onScroll={handleScroll}
                        onMomentumScrollEnd={handleScrollEnd}
                        onScrollEndDrag={handleScrollEnd}
                        scrollEventThrottle={16}
                        nestedScrollEnabled
                    >
                        {propNotes.map((note, index) => (
                            <PickerItem key={note.id} note={note} index={index} isCenter={index === centerIndex} onTextChange={handleTextChange} onDelete={handleDelete} onPress={handleItemPress} />
                        ))}
                    </ScrollView>

                    {/* Top fade overlay */}
                    <LinearGradient colors={["rgba(255,255,255,1)", "rgba(255,255,255,0)"]} style={styles.fadeTop} pointerEvents="none" />

                    {/* Bottom fade overlay */}
                    <LinearGradient colors={["rgba(255,255,255,0)", "rgba(255,255,255,1)"]} style={styles.fadeBottom} pointerEvents="none" />
                </View>
            ) : (
                <View style={styles.emptyState}>
                    <View style={styles.hintBox}>
                        <BaseText type="Footnote" color="labels.primary" style={styles.hintText}>
                            Hold your finger over desired spot
                        </BaseText>
                    </View>
                </View>
            )}

            {/* Floating Input above keyboard */}
            {editingNote && <FloatingInput note={editingNote} index={editingNoteIndex} onTextChange={handleTextChange} onClose={handleCloseEdit} />}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    floatingContainer: {
        position: "absolute",
        left: 16,
        right: 16,
        bottom: 0,
    },
    floatingContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 10,
        backgroundColor: colors.system.white,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: colors.system.blue,
        shadowColor: colors.system.black,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 12,
    },
    floatingBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.system.blue,
        alignItems: "center",
        justifyContent: "center",
    },
    floatingInput: {
        flex: 1,
        fontSize: 17,
        lineHeight: 22,
        color: colors.labels.primary,
        letterSpacing: -0.43,
        paddingVertical: 8,
    },
    doneButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    pickerContainer: {
        height: PICKER_HEIGHT,
        position: "relative",
        overflow: "hidden",
    },
    picker: {
        height: PICKER_HEIGHT,
    },
    pickerContent: {},
    fadeTop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: ITEM_HEIGHT,
        zIndex: 10,
    },
    fadeBottom: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: ITEM_HEIGHT,
        zIndex: 10,
    },
    pickerItemWrapper: {
        height: ITEM_HEIGHT,
        position: "relative",
        overflow: "hidden",
        justifyContent: "center",
    },
    itemPressable: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flex: 1,
    },
    noteItemContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 6,
        paddingVertical: 6,
        marginHorizontal: 4,
        backgroundColor: "rgba(120, 120, 128, 0.12)",
        borderRadius: 22,
        height: 44,
        borderWidth: 2,
        borderColor: "transparent",
    },
    noteItemContainerActive: {
        backgroundColor: "rgba(0, 122, 255, 0.1)",
        borderColor: colors.system.blue,
    },
    noteNumberBadge: {
        width: 32,
        height: 32,
        borderRadius: 30,
        backgroundColor: colors.system.white,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: colors.system.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    noteNumberBadgeActive: {
        backgroundColor: colors.system.blue,
    },
    notePreviewText: {
        flex: 1,
        fontSize: 17,
        letterSpacing: -0.43,
    },
    deleteButton: {
        position: "absolute",
        right: 10,
        top: 4,
        bottom: 4,
        justifyContent: "center",
        paddingHorizontal: 16,
        backgroundColor: colors.system.red,
        borderRadius: 22,
    },
    deleteButtonInner: {
        alignItems: "center",
        justifyContent: "center",
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 40,
    },
    hintBox: {
        backgroundColor: "rgba(255, 174, 0, 0.1)",
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 40,
        borderWidth: 1,
        borderColor: "rgba(255, 174, 0, 0.3)",
    },
    hintText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#FFAE00",
        letterSpacing: -0.08,
        textAlign: "center",
    },
});
