import { BaseText } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { Patient } from "@/utils/service/models/ResponseModels";
import { Button, ButtonRole, ContextMenu, Host } from "@expo/ui/swift-ui";
import { Image } from "expo-image";
import { SymbolViewProps } from "expo-symbols";
import React, { useMemo, useState } from "react";
import { Dimensions, SectionList, StyleSheet, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { runOnJS, useSharedValue } from "react-native-reanimated";
import { ImageViewerModal } from "./ImageViewerModal";

interface MenuItem {
    icon: SymbolViewProps["name"];
    label: string;
    onPress?: (uri: string) => void;
    role?: ButtonRole;
}

interface ImageSection {
    title: string;
    data: string[];
}

interface GalleryWithMenuProps {
    images?: string[]; // For backward compatibility
    sections?: ImageSection[]; // New grouped format
    initialColumns?: number;
    minColumns?: number;
    maxColumns?: number;
    onImagePress?: (uri: string) => void;
    patientData?: Patient;
    menuItems: MenuItem[];
}

const { width } = Dimensions.get("window");

export const GalleryWithMenu: React.FC<GalleryWithMenuProps> = ({ images, sections, initialColumns = 2, minColumns = 2, maxColumns = 6, onImagePress, patientData, menuItems }) => {
    const [numColumns, setNumColumns] = useState(initialColumns);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const scale = useSharedValue(1);

    // Convert images array to sections format if sections not provided (backward compatibility)
    const imageSections = useMemo(() => {
        if (sections && sections.length > 0) {
            return sections;
        }
        if (images && images.length > 0) {
            return [{ title: "", data: images }];
        }
        return [];
    }, [images, sections]);

    // Flatten all images for the viewer modal
    const allImages = useMemo(() => {
        return imageSections.flatMap((section) => section.data);
    }, [imageSections]);

    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = e.scale;
        })
        .onEnd(() => {
            const s = scale.value;
            runOnJS(() => {
                if (s > 1.2 && numColumns > minColumns) {
                    setNumColumns(numColumns - 1);
                } else if (s < 0.8 && numColumns < maxColumns) {
                    setNumColumns(numColumns + 1);
                }
            })();
            scale.value = 1;
        });

    const handleImagePress = (uri: string) => {
        if (onImagePress) onImagePress(uri);
        const index = allImages.indexOf(uri);
        if (index !== -1) {
            setSelectedIndex(index);
            setViewerVisible(true);
        }
    };

    const renderItem = ({ item, index, section }: { item: string; index: number; section: ImageSection }) => {
        // Calculate row and column for proper layout
        const row = Math.floor(index / numColumns);
        const col = index % numColumns;
        const isLastInRow = col === numColumns - 1;
        const isFirstInRow = col === 0;

        return (
            <Host style={{ flex: 1 }}>
                <ContextMenu activationMethod="longPress">
                    <ContextMenu.Items>
                        {menuItems.map((menu, menuIndex) => (
                            <Button key={`${menu.icon}-${menuIndex}`} systemImage={menu.icon} role={menu.role} onPress={() => menu.onPress?.(item)}>
                                {menu.label}
                            </Button>
                        ))}
                    </ContextMenu.Items>

                    <ContextMenu.Trigger>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => handleImagePress(item)}
                            style={{
                                width: width / numColumns,
                                height: width / numColumns,
                                paddingRight: isLastInRow ? 0 : 2,
                                paddingLeft: isFirstInRow ? 0 : 2,
                                paddingTop: row === 0 ? 0 : 2,
                                paddingBottom: 2,
                            }}
                        >
                            <Image
                                source={{ uri: item }}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                }}
                                contentFit="cover"
                            />
                        </TouchableOpacity>
                    </ContextMenu.Trigger>
                </ContextMenu>
            </Host>
        );
    };

    const renderSectionHeader = ({ section }: { section: ImageSection }) => {
        if (!section.title) return null;
        return (
            <View style={styles.sectionHeader}>
                <BaseText type="Subhead" weight="600" color="labels.primary" style={styles.sectionHeaderText}>
                    {section.title}
                </BaseText>
            </View>
        );
    };

    // Show empty state if no images
    if (!imageSections || imageSections.length === 0 || allImages.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <IconSymbol name="photo" color={colors.labels.tertiary} size={64} />
                <BaseText type="Title2" weight="600" color="labels.secondary" style={styles.emptyTitle}>
                    No Images
                </BaseText>
                <BaseText type="Body" color="labels.tertiary" style={styles.emptyDescription}>
                    This patient doesn't have any images yet.
                </BaseText>
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <GestureDetector gesture={pinchGesture}>
                <Animated.View style={{ flex: 1 }}>
                    <SectionList
                        sections={imageSections}
                        key={numColumns}
                        numColumns={numColumns}
                        renderItem={renderItem}
                        renderSectionHeader={renderSectionHeader}
                        keyExtractor={(item, index) => `${item}-${index}`}
                        stickySectionHeadersEnabled={false}
                        contentContainerStyle={styles.sectionListContent}
                    />
                </Animated.View>
            </GestureDetector>

            <ImageViewerModal patientData={patientData} visible={viewerVisible} images={allImages} initialIndex={selectedIndex} onClose={() => setViewerVisible(false)} />
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    emptyContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
        paddingVertical: 64,
    },
    emptyTitle: {
        marginTop: 16,
        marginBottom: 8,
    },
    emptyDescription: {
        textAlign: "center",
    },
    sectionHeader: {
        backgroundColor: colors.system.white,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    sectionHeaderText: {
        fontSize: 15,
        letterSpacing: -0.24,
    },
    sectionListContent: {
        paddingBottom: 16,
    },
});
