import { MINT_COLOR } from "@/app/camera/_components/create-template/constants";
import { containerSize, iconSize } from "@/constants/theme";
import colors from "@/theme/colors";
import { Host, HStack, Spacer } from "@expo/ui/swift-ui";
import { frame, glassEffect, padding } from "@expo/ui/swift-ui/modifiers";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { IconSymbol } from "../../ui/icon-symbol";

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
                                }),
                            ]}
                        >
                            <TouchableOpacity onPress={onSharePress} className="  w-[48px] h-[48px] items-center justify-center">
                                <IconSymbol size={iconSize} name="square.and.arrow.up" color={colors.system.white as any} style={{ bottom: 2 }} />
                            </TouchableOpacity>
                        </HStack>
                    )}
                    {(showNote || showEdit || showCompare || showMagic) && <Spacer />}
                    {(showNote || showEdit || showCompare || showMagic) && (
                        <HStack alignment="center" modifiers={bottomActionModifiers as any}>
                            {showNote && (
                                <TouchableOpacity onPress={onNotePress} className="w-[44px] h-[44px]  items-center justify-center">
                                    <IconSymbol size={iconSize} name="pin.circle" color={colors.system.white as any} style={{ bottom: -2, left: 8 }} />
                                </TouchableOpacity>
                            )}
                            {showMagic && (
                                <TouchableOpacity onPress={onMagicPress} className="w-[44px] h-[44px] relative items-center justify-center">
                                    <IconSymbol size={iconSize} name="sparkles" color={colors.system.white as any} style={{ bottom: -1, left: 4 }} />
                                </TouchableOpacity>
                            )}
                            {showCompare && (
                                <TouchableOpacity onPress={currentImageHasAfter ? onSplitPress : enableTakeAfterTemplate ? onTakeAfterTemplatePress : onSplitPress} className="w-[44px] h-[44px] relative items-center justify-center">
                                    <IconSymbol size={iconSize} name="square.split.2x1" color={colors.system.white as any} style={{ bottom: -2 }} />
                                    {!currentImageHasAfter && enableTakeAfterTemplate && (
                                        <View style={{ position: "absolute", top: 10, right: 4, backgroundColor: MINT_COLOR, borderRadius: 8, minWidth: 14, height: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 2 }}>
                                            <IconSymbol name="plus" size={10} color={colors.system.white as any} />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            )}
                            {showEdit && (
                                <TouchableOpacity onPress={onAdjustPress} className="w-[44px] h-[44px] relative items-center justify-center">
                                    <IconSymbol size={iconSize} name="slider.horizontal.3" color={colors.system.white as any} style={{ bottom: -2 }} />
                                </TouchableOpacity>
                            )}
                        </HStack>
                    )}
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
                                    },
                                }),
                            ]}
                        >
                            <TouchableOpacity onPress={onBookmarkPress} className="relative items-center justify-center w-[44px] h-[44px]">
                                <IconSymbol size={iconSize} name={isBookmarked ? "heart.fill" : "heart"} color={colors.system.white as any} style={{ bottom: -2, left: 2 }} />
                            </TouchableOpacity>
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
                            <TouchableOpacity onPress={onRestorePress} className="w-[44px] h-[44px]  items-center justify-center">
                                <IconSymbol size={iconSize} name="arrow.uturn.backward" color={colors.system.white as any} style={{ bottom: -2, left: 2 }} />
                            </TouchableOpacity>
                        </HStack>
                    )}
                </HStack>
            </Host>
        </View>
    );
});

const styles = StyleSheet.create({
    actionButtonsContainer: {
        alignItems: "center",
        justifyContent: "center",
    },
});
