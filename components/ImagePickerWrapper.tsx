import { CameraIcon, GalleryWideIcon } from "@/assets/icons";
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useMemo, useRef } from "react";
import { Keyboard, StyleSheet, TouchableOpacity, View } from "react-native";
import { spacing } from "../styles/spaces";
import colors from "../theme/colors.shared";
import BaseButton from "./button/BaseButton";
import { BaseText } from "./text/BaseText";
type Props = {
    onImageSelected?: (result: { uri: string; base64?: string | null }) => void;
    children: React.ReactNode;
};

export default function ImagePickerWrapper({ onImageSelected, children }: Props) {
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ["50%"], []);

    const openSheet = useCallback(() => {
        Keyboard.dismiss();
        bottomSheetRef.current?.present();
        console.log("openSheet");
    }, []);

    const closeSheet = useCallback(() => {
        bottomSheetRef.current?.dismiss();
        console.log("closeSheet");
    }, []);

    const renderBackdrop = useCallback((props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.1} />, []);
    const pickImage = useCallback(async () => {
        closeSheet();
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            alert("Gallery permission is required.");
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
    }, [onImageSelected]);

    const takePhoto = useCallback(async () => {
        closeSheet();
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
            alert("Camera permission is required.");
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
    }, [onImageSelected]);

    const handleSheetChanges = useCallback((index: number) => {
        console.log("handleSheetChanges", index);
    }, []);

    return (
        <>
            <TouchableOpacity onPress={openSheet}>{children}</TouchableOpacity>
            <BottomSheetModal ref={bottomSheetRef} enablePanDownToClose backdropComponent={renderBackdrop} backgroundStyle={styles.sheetBackground} handleIndicatorStyle={{ backgroundColor: colors.system.gray3 }}>
                <BottomSheetView style={styles.sheetContent} className="w-full justify-start px-5 items-start gap-5">
                    <BaseText type="Title3" weight="600" color="system.black" className=" w-full">
                        Select Image
                    </BaseText>
                    <View className="w-full space-y-4 gap-4">
                        <BaseButton label="Take Photo" leftIcon={<CameraIcon width={20} height={20} color={colors.system.blue} />} onPress={takePhoto} ButtonStyle="Plain" className="!justify-start " />

                        <BaseButton label="Select from Gallery" leftIcon={<GalleryWideIcon width={20} height={20} color={colors.system.blue} />} onPress={pickImage} ButtonStyle="Plain" className="!justify-start" />
                    </View>
                </BottomSheetView>
            </BottomSheetModal>
        </>
    );
}

const styles = StyleSheet.create({
    sheetBackground: {
        backgroundColor: colors.system.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    sheetContent: {
        flex: 1,
        alignItems: "center",
        paddingVertical: spacing["6"],
    },
    optionButton: {
        width: "90%",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing["3"],
        borderRadius: 10,
        backgroundColor: colors.system.gray6,
        marginVertical: spacing["2"],
    },
});
