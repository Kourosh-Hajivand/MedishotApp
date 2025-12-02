import { CameraIcon, GalleryWideIcon } from "@/assets/icons";
import colors from "@/theme/colors.shared";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useState } from "react";
import { Alert, Animated, Keyboard, Modal, Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing } from "../styles/spaces";
import BaseButton from "./button/BaseButton";
import { BaseText } from "./text/BaseText";

type Props = {
    onImageSelected?: (result: { uri: string; base64?: string | null }) => void;
    children: React.ReactNode;
    disabled?: boolean;
};

export default function ImagePickerWrapper({ onImageSelected, children, disabled = false }: Props) {
    const [visible, setVisible] = useState(false);
    const insets = useSafeAreaInsets();
    const slideAnim = React.useRef(new Animated.Value(300)).current;

    const openSheet = useCallback(() => {
        Keyboard.dismiss();
        setVisible(true);
        Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
        }).start();
    }, [slideAnim]);

    const closeSheet = useCallback(() => {
        Animated.timing(slideAnim, {
            toValue: 300,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setVisible(false);
        });
    }, [slideAnim]);

    const pickImage = useCallback(async () => {
        closeSheet();
        setTimeout(async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Permission Required", "Gallery permission is required.");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled) {
                const uri = result.assets[0].uri;
                const base64 = result.assets[0].base64;
                onImageSelected?.({ uri, base64 });
            }
        }, 300);
    }, [onImageSelected, closeSheet]);

    const takePhoto = useCallback(async () => {
        closeSheet();
        setTimeout(async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Permission Required", "Camera permission is required.");
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled) {
                const uri = result.assets[0].uri;
                const base64 = result.assets[0].base64;
                onImageSelected?.({ uri, base64 });
            }
        }, 300);
    }, [onImageSelected, closeSheet]);

    return (
        <>
            <TouchableOpacity onPress={disabled ? undefined : openSheet} disabled={disabled} style={{ opacity: disabled ? 0.5 : 1 }}>
                {children}
            </TouchableOpacity>
            <Modal visible={visible} transparent animationType="fade" onRequestClose={closeSheet}>
                <View style={styles.overlay}>
                    <Pressable style={styles.backdrop} onPress={closeSheet} />
                    <Animated.View style={[styles.sheetContainer, { paddingBottom: insets.bottom + spacing["4"], transform: [{ translateY: slideAnim }] }]}>
                        <View style={styles.handle} />
                        <View style={styles.sheetContent}>
                            <BaseText type="Title3" weight="600" color="system.black" className="w-full">
                                Select Image
                            </BaseText>
                            <View className="w-full gap-3 mt-4">
                                <BaseButton label="Take Photo" leftIcon={<CameraIcon width={20} height={20} color={colors.system.blue} />} onPress={takePhoto} ButtonStyle="Plain" className="!justify-start" />
                                <BaseButton label="Choose from Gallery" leftIcon={<GalleryWideIcon width={20} height={20} color={colors.system.blue} />} onPress={pickImage} ButtonStyle="Plain" className="!justify-start" />
                            </View>
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: "flex-end",
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0, 0, 0, 0.3)",
    },
    sheetContainer: {
        backgroundColor: colors.system.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: spacing["2"],
    },
    handle: {
        width: 36,
        height: 5,
        backgroundColor: colors.system.gray3,
        borderRadius: 3,
        alignSelf: "center",
        marginBottom: spacing["3"],
    },
    sheetContent: {
        paddingHorizontal: spacing["5"],
        paddingVertical: spacing["4"],
    },
});
