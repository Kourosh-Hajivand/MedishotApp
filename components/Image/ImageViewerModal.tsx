import colors from "@/theme/colors";
import { getRelativeTime } from "@/utils/helper/dateUtils";
import { Patient } from "@/utils/service/models/ResponseModels";
import { Button, Host } from "@expo/ui/swift-ui";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import { Dimensions, Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import { FlatList } from "react-native-gesture-handler";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Avatar from "../avatar";
import { BaseText } from "../text/BaseText";
import { IconSymbol } from "../ui/icon-symbol";

const { width, height } = Dimensions.get("window");

interface ImageViewerModalProps {
    visible: boolean;
    images: string[];
    initialIndex: number;
    onClose: () => void;
    patientData?: Patient;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ visible, images, initialIndex, onClose, patientData }) => {
    const insets = useSafeAreaInsets();
    const flatListRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    const handleScroll = (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / width);
        if (index !== currentIndex && index >= 0 && index < images.length) {
            setCurrentIndex(index);
        }
    };

    const handleEditPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const currentImageUri = images[currentIndex];
        onClose();
        setTimeout(() => {
            router.push({
                pathname: "/(fullmodals)/image-editor",
                params: { uri: currentImageUri },
            });
        }, 300);
    };

    return (
        <Modal visible={visible} transparent={false} animationType="slide" presentationStyle="fullScreen">
            <View style={styles.container}>
                {/* Header */}
                <View style={{ top: insets.top }} className="absolute top-0 left-0 w-full px-5 z-10">
                    <View className="w-full relative flex-row items-center justify-between">
                        <Host style={{ width: 36, height: 36 }}>
                            <Button systemImage="chevron.left" variant="glass" onPress={onClose} />
                        </Host>

                        <View className="absolute left-1/2 -translate-x-1/2 h-full max-w-[150px] flex-row items-center justify-center gap-2">
                            <Avatar name={`${patientData?.first_name ?? ""} ${patientData?.last_name ?? ""}`} size={32} haveRing imageUrl={patientData?.profile_image?.url} />
                            <View className="gap-0">
                                <BaseText type="Caption1" weight={600} color="labels.primary" className="line-clamp-1">
                                    {patientData?.first_name} {patientData?.last_name}
                                </BaseText>
                                <BaseText type="Caption2" weight={400} color="labels.secondary" className="line-clamp-1">
                                    Taken: {patientData?.updated_at ? getRelativeTime(patientData.updated_at) : ""}
                                </BaseText>
                            </View>
                        </View>

                        {/* Edit Button */}
                        <TouchableOpacity style={styles.editButton} onPress={handleEditPress} activeOpacity={0.7}>
                            <IconSymbol name="slider.horizontal.3" size={20} color={colors.system.white} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Image Carousel */}
                <FlatList
                    ref={flatListRef}
                    horizontal
                    pagingEnabled
                    initialScrollIndex={initialIndex}
                    data={images}
                    keyExtractor={(_, i) => i.toString()}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <View style={styles.imageWrapper}>
                            <Image source={{ uri: item }} style={styles.image} contentFit="contain" />
                        </View>
                    )}
                    getItemLayout={(_, index) => ({
                        length: width,
                        offset: width * index,
                        index,
                    })}
                />

                {/* Bottom Action Bar */}
                <Animated.View entering={FadeIn.delay(300)} style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
                    <TouchableOpacity style={styles.actionButton} onPress={handleEditPress}>
                        <IconSymbol name="wand.and.stars" size={22} color={colors.system.white} />
                        <BaseText type="Caption1" weight={500} color="labels.primary">
                            Edit
                        </BaseText>
                    </TouchableOpacity>

                    <View style={styles.pageIndicator}>
                        <BaseText type="Caption1" color="labels.secondary">
                            {currentIndex + 1} / {images.length}
                        </BaseText>
                    </View>

                    <TouchableOpacity style={styles.actionButton}>
                        <IconSymbol name="square.and.arrow.up" size={22} color={colors.system.white} />
                        <BaseText type="Caption1" weight={500} color="labels.primary">
                            Share
                        </BaseText>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.system.black,
    },
    closeButton: {
        position: "absolute",
        top: 50,
        right: 20,
        zIndex: 10,
    },
    editButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    imageWrapper: {
        width,
        height,
        justifyContent: "center",
        alignItems: "center",
    },
    image: {
        width: width,
        height: height,
    },
    bottomBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 30,
        paddingTop: 16,
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    actionButton: {
        alignItems: "center",
        gap: 4,
        minWidth: 60,
    },
    pageIndicator: {
        backgroundColor: "rgba(255,255,255,0.15)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
});
