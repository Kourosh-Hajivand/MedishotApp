import { containerSize, iconSize } from "@/constants/theme";
import colors from "@/theme/colors";
import { getRelativeTime } from "@/utils/helper/dateUtils";
import { Button, ContextMenu, Host, HStack, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import { frame, glassEffect, padding } from "@expo/ui/swift-ui/modifiers";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Animated from "react-native-reanimated";
import { IconSymbol } from "../../ui/icon-symbol";

export interface HeaderBarProps {
    paddingTop: number;
    headerAnimatedStyle: Record<string, unknown>;
    controlsVisible: boolean;
    notesPanelVisible: boolean;
    patientFullName: string;
    description: "Date" | "taker";
    currentTaker: { first_name?: string | null; last_name?: string | null } | null;
    currentCreatedAt: string | undefined | null;
    showShare: boolean;
    showBookmark: boolean;
    showNote: boolean;
    showMagicInMore: boolean;
    showCompare: boolean;
    showEditInMore: boolean;
    showArchiveInMore: boolean;
    showRestore: boolean;
    isBookmarked: boolean;
    isCurrentImageOriginalMedia: boolean;
    currentImageHasAfter: boolean;
    enableTakeAfterTemplate: boolean;
    onClose: () => void;
    onSharePress: () => void;
    onBookmarkPress: () => void;
    onNotePress: () => void;
    onMagicPress: () => void;
    onSplitPress: () => void;
    onTakeAfterTemplatePress: () => void;
    onAdjustPress: () => void;
    onArchivePress: () => void;
    onRestorePress: () => void;
}

export const HeaderBar = React.memo<HeaderBarProps>(function HeaderBar({
    paddingTop,
    headerAnimatedStyle,
    controlsVisible,
    notesPanelVisible,
    patientFullName,
    description,
    currentTaker,
    currentCreatedAt,
    showShare,
    showBookmark,
    showNote,
    showMagicInMore,
    showCompare,
    showEditInMore,
    showArchiveInMore,
    showRestore,
    isBookmarked,
    isCurrentImageOriginalMedia,
    currentImageHasAfter,
    enableTakeAfterTemplate,
    onClose,
    onSharePress,
    onBookmarkPress,
    onNotePress,
    onMagicPress,
    onSplitPress,
    onTakeAfterTemplatePress,
    onAdjustPress,
    onArchivePress,
    onRestorePress,
}) {
    return (
        <Animated.View style={[{ paddingTop }, styles.header, headerAnimatedStyle, !controlsVisible && styles.hidden]} pointerEvents={notesPanelVisible ? "none" : "auto"}>
            <View style={styles.actionButtonsContainer}>
                <Host style={{ width: "100%" }} matchContents={{ vertical: true }}>
                    <HStack alignment="center" spacing={10} modifiers={[padding({ horizontal: 20 })]}>
                        <HStack
                            alignment="center"
                            modifiers={[
                                padding({ all: 0 }),
                                frame({ width: containerSize, height: containerSize }),
                                glassEffect({
                                    glass: {
                                        variant: "regular",
                                    },
                                }),
                            ]}
                        >
                            <TouchableOpacity onPress={onClose} className="w-[44px] h-[44px]  items-center justify-center">
                                <IconSymbol size={iconSize} name="chevron.left" color={colors.system.white as any} style={{ bottom: -2, left: 2 }} />
                            </TouchableOpacity>
                        </HStack>
                        <Spacer />
                        <VStack
                            alignment="center"
                            modifiers={[
                                padding({ all: 4 }),
                                frame({ width: description === "taker" && currentTaker ? 230 : 230, height: containerSize }),
                                glassEffect({
                                    glass: {
                                        variant: "regular",
                                    },
                                }),
                            ]}
                            spacing={4}
                        >
                            <Text size={14}>{patientFullName}</Text>
                            {description === "taker" && currentTaker ? (
                                <Text weight="light" size={12}>
                                    {`taken by DR.${`${currentTaker.first_name || ""} ${currentTaker.last_name || ""}`.trim()}`}
                                </Text>
                            ) : description === "Date" && currentCreatedAt ? (
                                <Text weight="light" size={12}>
                                    {getRelativeTime(currentCreatedAt)}
                                </Text>
                            ) : null}
                        </VStack>
                        <Spacer />
                        <ContextMenu>
                            <ContextMenu.Items>
                                {showShare && (
                                    <Button systemImage="square.and.arrow.up" onPress={onSharePress}>
                                        Share
                                    </Button>
                                )}
                                {showBookmark && (
                                    <Button systemImage={isBookmarked ? "heart.fill" : "heart"} onPress={onBookmarkPress}>
                                        {isBookmarked ? "Remove from Practice Album" : "Add to Practice Album"}
                                    </Button>
                                )}
                                {showNote && (
                                    <Button systemImage="pin" onPress={onNotePress}>
                                        Note
                                    </Button>
                                )}
                                {showMagicInMore && !isCurrentImageOriginalMedia && (
                                    <Button systemImage="sparkles" onPress={onMagicPress}>
                                        Use Magic
                                    </Button>
                                )}
                                {showCompare && (
                                    <Button systemImage="square.split.2x1" onPress={currentImageHasAfter ? onSplitPress : enableTakeAfterTemplate ? onTakeAfterTemplatePress : onSplitPress}>
                                        {currentImageHasAfter ? "Compare Before & After" : enableTakeAfterTemplate ? "Create After from Template" : "Compare"}
                                    </Button>
                                )}
                                {showEditInMore && (
                                    <Button systemImage="slider.horizontal.3" onPress={onAdjustPress}>
                                        Adjust
                                    </Button>
                                )}
                                {showArchiveInMore && (
                                    <Button systemImage="archivebox" role="destructive" onPress={onArchivePress}>
                                        Archive
                                    </Button>
                                )}
                                {showRestore && (
                                    <Button systemImage="arrow.uturn.backward" onPress={onRestorePress}>
                                        Restore
                                    </Button>
                                )}
                            </ContextMenu.Items>
                            <ContextMenu.Trigger>
                                <HStack
                                    alignment="center"
                                    modifiers={[
                                        padding({ all: 10 }),
                                        frame({ width: containerSize, height: containerSize, alignment: "center" }),
                                        glassEffect({
                                            glass: {
                                                variant: "regular",
                                            },
                                        }),
                                    ]}
                                >
                                    <TouchableOpacity>
                                        <IconSymbol size={iconSize} name="ellipsis" color={colors.system.white as any} style={{ left: 1 }} />
                                    </TouchableOpacity>
                                </HStack>
                            </ContextMenu.Trigger>
                        </ContextMenu>
                    </HStack>
                </Host>
            </View>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    header: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        overflow: "hidden",
    },
    actionButtonsContainer: {
        alignItems: "center",
        justifyContent: "center",
    },
    hidden: {
        pointerEvents: "none",
    },
});
