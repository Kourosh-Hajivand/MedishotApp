import { getRelativeTime } from "@/utils/helper/dateUtils";
import { Patient } from "@/utils/service/models/ResponseModels";
import { Button, Host } from "@expo/ui/swift-ui";
import { Image } from "expo-image";
import React from "react";
import { Dimensions, Modal, StyleSheet, View } from "react-native";
import { FlatList } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Avatar from "../avatar";
import { BaseText } from "../text/BaseText";

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
    return (
        <Modal visible={visible} transparent={false} animationType="slide" presentationStyle="fullScreen">
            <View style={styles.container}>
                <View style={{ top: insets.top }} className="absolute top-0 left-0 w-full px-5  z-10  ">
                    <View className="w-full relative">
                        <Host style={{ width: 36, height: 36 }}>
                            <Button systemImage="chevron.left" variant="glass" onPress={onClose} />
                        </Host>

                        <View className="absolute  left-1/2 -translate-x-1/2 h-full max-w-[150px] flex-row items-center justify-center gap-2">
                            <Avatar name={`${patientData?.first_name ?? ""} ${patientData?.last_name ?? ""}`} size={32} haveRing imageUrl={patientData?.profile_image?.url} />
                            <View className="gap-0 ">
                                <BaseText type="Caption1" weight={600} color="labels.primary" className="line-clamp-1">
                                    {patientData?.first_name} {patientData?.last_name}
                                </BaseText>
                                <BaseText type="Caption2" weight={400} color="labels.secondary" className="line-clamp-1">
                                    Taken: {patientData?.updated_at ? getRelativeTime(patientData.updated_at) : ""}
                                </BaseText>
                            </View>
                        </View>
                    </View>
                </View>

                <FlatList
                    horizontal
                    pagingEnabled
                    initialScrollIndex={initialIndex}
                    data={images}
                    keyExtractor={(_, i) => i.toString()}
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
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    closeButton: {
        position: "absolute",
        top: 50,
        right: 20,
        zIndex: 10,
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
});
