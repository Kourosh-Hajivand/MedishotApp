import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useLayoutEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { BaseText } from "../components";
import colors from "../theme/colors.shared.js";

export const AddPatientPhotoScreen: React.FC = () => {
    const router = useRouter();
    const navigation = useNavigation();
    const params = useLocalSearchParams<{ patientData?: string }>();
    const patientData = params.patientData ? JSON.parse(params.patientData as string) : undefined;
    const [photoUri, setPhotoUri] = useState<string | null>(null);

    const handleTakePhoto = () => {
        console.log("Take photo");
    };

    const handleSelectFromGallery = () => {
        console.log("Select from gallery");
    };

    const handleNext = () => {
        router.push({ pathname: "/(modals)/add-patient/review", params: { patientData: JSON.stringify(patientData ?? {}), photoUri: photoUri || "" } });
    };

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity onPress={handleNext} disabled={!photoUri} className="px-2">
                    <BaseText type="Body" weight="600" color={photoUri ? "system.blue" : "system.gray"}>
                        Done
                    </BaseText>
                </TouchableOpacity>
            ),
        });
    }, [navigation, photoUri, patientData]);

    return (
        <View className="flex-1 bg-white">
            <BaseText>Add Patient Photo</BaseText>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
});
