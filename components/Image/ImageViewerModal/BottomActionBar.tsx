import { MINT_COLOR } from "@/app/camera/_components/create-template/constants";
import { containerSize, iconSize } from "@/constants/theme";
import { Button, Host, HStack, Image, Spacer } from "@expo/ui/swift-ui";
import { frame, glassEffect, padding } from "@expo/ui/swift-ui/modifiers";
import React from "react";
import { StyleSheet, View } from "react-native";

export interface BottomActionBarProps {
    showShare: boolean;
    showNote: boolean;
    showEdit: boolean;
    showCompare: boolean;
    showMagic: boolean;
    showBookmark: boolean;
    showRestore: boolean;
    isBookmarked: boolean;
    currentImageHasAfter: boolean;
    enableTakeAfterTemplate: boolean;
    bottomActionModifiers: unknown[];
    onSharePress: () => void;
    onNotePress: () => void;
    onSplitPress: () => void;
    onTakeAfterTemplatePress: () => void;
    onAdjustPress: () => void;
    onMagicPress: () => void;
    onBookmarkPress: () => void;
    onRestorePress: () => void;
}

export const BottomActionBar = React.memo<BottomActionBarProps>(function BottomActionBar({
    showShare,
    showNote,
    showEdit,
    showCompare,
    showMagic,
    showBookmark,
    showRestore,
    isBookmarked,
    currentImageHasAfter,
    enableTakeAfterTemplate,
    bottomActionModifiers,
    onSharePress,
    onNotePress,
    onSplitPress,
    onTakeAfterTemplatePress,
    onAdjustPress,
    onMagicPress,
    onBookmarkPress,
    onRestorePress,
}) {
    return (
        <View style={styles.actionButtonsContainer}>
            <Host style={{ width: "100%" }} matchContents={{ vertical: true }}>
                <HStack alignment="center" spacing={0} modifiers={[padding({ horizontal: 20 })]}>
                    {showShare && (
                        <HStack
                            alignment="center"
                            modifiers={[
                                padding({ all: 0 }),
                                frame({ width: 48, height: 48, alignment: "center" }),
                                glassEffect({
                                    glass: {
                                        variant: "regular",
                                    },
                                    shape: "circle",
                                }),
                            ]}
                        >
                            <Button onPress={onSharePress} variant="plain">
                                <Image systemName="square.and.arrow.up" size={iconSize} />
                            </Button>
                            {/* <TouchableOpacity onPress={onSharePress} className="  w-[48px] h-[48px] items-center justify-center">
                                <IconSymbol size={iconSize} name="square.and.arrow.up" color={colors.system.white as any} style={{ bottom: 2 }} />
                            </TouchableOpacity> */}
                        </HStack>
                    )}
                    {(showNote || showEdit || showCompare || showMagic) && <Spacer />}
                    {(showNote || showEdit || showCompare || showMagic) &&
                        (() => {
                            const count = (showNote ? 1 : 0) + (showMagic ? 1 : 0) + (showCompare ? 1 : 0) + (showEdit ? 1 : 0);
                            const centerGroupWidth = count * SLOT_SIZE + (count - 1) * SLOT_GAP;
                            return (
                                <HStack alignment="center" modifiers={bottomActionModifiers as any}>
                                    {/* <Host style={[styles.centerGroupRoot, { width: centerGroupWidth, height: SLOT_SIZE }]}> */}
                                    {showNote && (
                                        <>
                                            <Button onPress={onNotePress} variant="plain">
                                                <Image systemName="pin.circle" size={iconSize} />
                                            </Button>
                                            <Spacer />
                                        </>
                                        // <TouchableOpacity onPress={onNotePress} style={[styles.slotTouchable, { backgroundColor: DEBUG.note }]}>
                                        //     <View style={styles.slotIconWrap}>
                                        //         <View style={[styles.slotIconBox, { width: iconSize, height: iconSize }]}>
                                        //             <IconSymbol size={iconSize} name="pin.circle" color={colors.system.white as any} />
                                        //         </View>
                                        //     </View>
                                        // </TouchableOpacity>
                                    )}
                                    {showMagic && (
                                        <>
                                            <Button onPress={onMagicPress} variant="plain">
                                                <Image systemName="sparkles" size={iconSize} />
                                            </Button>
                                            <Spacer />
                                        </>
                                        // <TouchableOpacity onPress={onMagicPress} style={[styles.slotTouchable, { backgroundColor: DEBUG.magic }]}>
                                        //     <View style={styles.slotIconWrap}>
                                        //         <View style={[styles.slotIconBox, { width: iconSize, height: iconSize }]}>
                                        //             <IconSymbol size={iconSize} name="sparkles" color={colors.system.white as any} />
                                        //         </View>
                                        //     </View>
                                        // </TouchableOpacity>
                                    )}
                                    {showCompare && (
                                        <>
                                            <Button role="default" onPress={currentImageHasAfter ? onSplitPress : enableTakeAfterTemplate ? onTakeAfterTemplatePress : onSplitPress} variant="plain">
                                                <Image systemName={!currentImageHasAfter && enableTakeAfterTemplate ? "plus.app" : "square.split.2x1"} size={iconSize} />
                                            </Button>
                                            <Spacer />
                                        </>
                                        // <TouchableOpacity onPress={currentImageHasAfter ? onSplitPress : enableTakeAfterTemplate ? onTakeAfterTemplatePress : onSplitPress} style={[styles.slotTouchable, { backgroundColor: DEBUG.compareEdit }]}>
                                        //     <View style={styles.slotIconWrap}>
                                        //         <View style={[styles.slotIconBox, { width: iconSize, height: iconSize }]}>
                                        //             <IconSymbol size={iconSize} name="square.split.2x1" color={colors.system.white as any} />
                                        //         </View>
                                        //     </View>
                                        //     {!currentImageHasAfter && enableTakeAfterTemplate && (
                                        //         <View style={styles.compareBadge}>
                                        //             <IconSymbol name="plus" size={10} color={colors.system.white as any} />
                                        //         </View>
                                        //     )}
                                        // </TouchableOpacity>
                                    )}
                                    {showEdit && (
                                        <>
                                            <Button onPress={onAdjustPress} variant="plain">
                                                <Image systemName="slider.horizontal.3" size={iconSize} />
                                            </Button>
                                        </>
                                        // <TouchableOpacity onPress={onAdjustPress} style={[styles.slotTouchable, { backgroundColor: DEBUG.adjust }]}>
                                        //     <View style={styles.slotIconWrap}>
                                        //         <View style={[styles.slotIconBox, { width: iconSize, height: iconSize }]}>
                                        //             <IconSymbol size={iconSize} name="slider.horizontal.3" color={colors.system.white as any} />
                                        //         </View>
                                        //     </View>
                                        // </TouchableOpacity>
                                    )}
                                    {/* </Host> */}
                                </HStack>
                            );
                        })()}
                    {showBookmark && <Spacer />}
                    {showBookmark && (
                        <HStack
                            alignment="center"
                            modifiers={[
                                padding({ all: 0 }),
                                frame({ width: 48, height: containerSize }),
                                glassEffect({
                                    glass: {
                                        variant: "regular",
                                        interactive: true,
                                        tint: "rgba(0, 0, 0, 0.2)",
                                    },
                                }),
                            ]}
                        >
                            <Button onPress={onBookmarkPress} variant="plain">
                                <Image systemName={isBookmarked ? "heart.fill" : "heart"} size={iconSize} />
                            </Button>
                            {/* <TouchableOpacity onPress={onBookmarkPress} className="relative items-center justify-center w-[44px] h-[44px]">
                                <IconSymbol size={iconSize} name={isBookmarked ? "heart.fill" : "heart"} color={colors.system.white as any} style={{ bottom: -2, left: 2 }} />
                            </TouchableOpacity> */}
                        </HStack>
                    )}
                    {showRestore && <Spacer />}
                    {showRestore && (
                        <HStack
                            alignment="center"
                            modifiers={[
                                padding({ all: 0 }),
                                frame({ width: 48, height: containerSize }),
                                glassEffect({
                                    glass: {
                                        variant: "regular",
                                    },
                                }),
                            ]}
                        >
                            <Button onPress={onRestorePress} variant="plain">
                                <Image systemName="arrow.uturn.backward" size={iconSize} />
                            </Button>
                            {/* <TouchableOpacity onPress={onRestorePress} className="w-[44px] h-[44px]  items-center justify-center">
                                <IconSymbol size={iconSize} name="arrow.uturn.backward" color={colors.system.white as any} style={{ bottom: -2, left: 2 }} />
                            </TouchableOpacity> */}
                        </HStack>
                    )}
                </HStack>
            </Host>
        </View>
    );
});

const SLOT_SIZE = 48;
const SLOT_GAP = 1;

const DEBUG = {
    note: "rgba(0, 200, 83, 0)",
    magic: "rgba(33, 150, 243, 0)",
    compareEdit: "rgba(255, 152, 0, 0)",
    adjust: "rgba(0, 255, 255, 0)",
};

const styles = StyleSheet.create({
    actionButtonsContainer: {
        alignItems: "center",
        justifyContent: "center",
    },
    centerGroupRoot: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: SLOT_GAP,
    },
    slotTouchable: {
        width: SLOT_SIZE,
        height: SLOT_SIZE,
        position: "relative",
        overflow: "hidden",
    },
    slotIconWrap: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        alignItems: "center",
        justifyContent: "center",
    },
    slotIconBox: {
        alignItems: "center",
        justifyContent: "center",
    },
    compareBadge: {
        position: "absolute",
        top: 10,
        right: 4,
        backgroundColor: MINT_COLOR,
        borderRadius: 8,
        minWidth: 14,
        height: 14,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 2,
    },
});
