import { Patient } from "@/utils/service/models/ResponseModels";
import { Button, ButtonRole, ContextMenu, Host } from "@expo/ui/swift-ui";
import { Image } from "expo-image";
import { SymbolViewProps } from "expo-symbols";
import React, { useState } from "react";
import { Dimensions, FlatList, TouchableOpacity } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { runOnJS, useSharedValue } from "react-native-reanimated";
import { ImageViewerModal } from "./ImageViewerModal";

interface MenuItem {
    icon: SymbolViewProps["name"];
    label: string;
    onPress?: (uri: string) => void;
    role?: ButtonRole;
}
interface GalleryWithMenuProps {
    images: string[];
    initialColumns?: number;
    minColumns?: number;
    maxColumns?: number;
    onImagePress?: (uri: string) => void;
    patientData?: Patient;
    menuItems: MenuItem[];
}

const { width } = Dimensions.get("window");

export const GalleryWithMenu: React.FC<GalleryWithMenuProps> = ({ images, initialColumns = 2, minColumns = 2, maxColumns = 6, onImagePress, patientData, menuItems }) => {
    const [numColumns, setNumColumns] = useState(initialColumns);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const scale = useSharedValue(1);

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

    const handleImagePress = (uri: string, index: number) => {
        if (onImagePress) onImagePress(uri);
        setSelectedIndex(index);
        setViewerVisible(true);
    };

    const renderItem = ({ item, index }: { item: string; index: number }) => (
        <Host style={{ flex: 1 }}>
            <ContextMenu activationMethod="longPress">
                <ContextMenu.Items>
                    {menuItems.map((menu, index) => (
                        <Button key={`${menu.icon}-${index}`} systemImage={menu.icon} role={menu.role} onPress={() => menu.onPress?.(item)}>
                            {menu.label}
                        </Button>
                    ))}
                </ContextMenu.Items>

                <ContextMenu.Trigger>
                    <TouchableOpacity activeOpacity={0.9} onPress={() => handleImagePress(item, index)}>
                        <Image
                            source={{ uri: item }}
                            style={{
                                width: width / numColumns,
                                height: width / numColumns,
                            }}
                            contentFit="cover"
                        />
                    </TouchableOpacity>
                </ContextMenu.Trigger>
            </ContextMenu>
        </Host>
    );

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <GestureDetector gesture={pinchGesture}>
                <Animated.View style={{ flex: 1 }}>
                    <FlatList data={images} key={numColumns} numColumns={numColumns} renderItem={renderItem} keyExtractor={(_, i) => i.toString()} />
                </Animated.View>
            </GestureDetector>

            <ImageViewerModal patientData={patientData} visible={viewerVisible} images={images} initialIndex={selectedIndex} onClose={() => setViewerVisible(false)} />
        </GestureHandlerRootView>
    );
};
