import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PlusIcon } from "../assets/icons";
import { BaseButton, BaseText } from "../components";
import { spacing } from "../styles/spaces";
import colors from "../theme/colors.shared.js";

export const AddPatientPhotoScreen: React.FC = () => {
    const router = useRouter();
    const params = useLocalSearchParams<{ patientData?: string }>();
    const patientData = params.patientData ? JSON.parse(params.patientData as string) : undefined;
    const [photoUri, setPhotoUri] = useState<string | null>(null);

    const handleTakePhoto = () => {
        // TODO: Implement camera functionality
        console.log("Take photo");
    };

    const handleSelectFromGallery = () => {
        // TODO: Implement gallery picker
        console.log("Select from gallery");
    };

    const handleNext = () => {
        router.push({ pathname: "/(modals)/add-patient/review", params: { patientData: JSON.stringify(patientData ?? {}), photoUri: photoUri || "" } });
    };

    return (
        <SafeAreaView style={styles.container} className="flex-1 bg-white">
            <View style={styles.content} className="flex-1 px-4 pt-6">
                <View style={styles.photoContainer} className="flex-1 items-center justify-center">
                    {photoUri ? (
                        <Image source={{ uri: photoUri }} style={styles.photo} className="w-64 h-64 rounded-lg" resizeMode="cover" />
                    ) : (
                        <View style={styles.placeholderContainer} className="w-64 h-64 border-2 border-dashed border-gray-300 rounded-lg items-center justify-center">
                            <PlusIcon width={48} height={48} color="#9CA3AF" />
                            <BaseText className="text-gray-500 mt-2 text-center">Add Patient Photo</BaseText>
                        </View>
                    )}
                </View>

                <View style={styles.buttonContainer} className="space-y-4 pb-6">
                    <BaseButton onPress={handleTakePhoto} label="Take Photo" ButtonStyle="Plain" className="border-blue-500" />

                    <BaseButton onPress={handleSelectFromGallery} label="Select from Gallery" ButtonStyle="Plain" className="border-gray-500" />

                    <BaseButton onPress={handleNext} label="Next" ButtonStyle="Filled" className="bg-blue-500" disabled={!photoUri} />
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing["4"],
        paddingTop: spacing["6"],
    },
    photoContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    photo: {
        width: 256,
        height: 256,
        borderRadius: 8,
    },
    placeholderContainer: {
        width: 256,
        height: 256,
        borderWidth: 2,
        borderStyle: "dashed",
        borderColor: colors.system.gray3,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    buttonContainer: {
        gap: spacing["4"],
        paddingBottom: spacing["6"],
    },
});
