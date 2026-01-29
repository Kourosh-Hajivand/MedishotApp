import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Dimensions, Image, StyleSheet, View } from "react-native";
import DocumentScanner from "react-native-document-scanner-plugin";
import { SafeAreaView } from "react-native-safe-area-context";
import TextRecognition from "react-native-text-recognition";
import { BaseButton, BaseText } from "../components";
import { spacing } from "../styles/spaces";
import { parseUSIDCardData } from "../utils/helper/HelperFunction";

export const AddPatientFormScreen: React.FC = () => {
    const params = useLocalSearchParams<{ doctor_id?: string }>();
    const screenWidth = Dimensions.get("window").width;
    const imageWidth = screenWidth * 0.7;
    const imageHeight = screenWidth * 0.6;

    const [scannedImage, setScannedImage] = useState<string | null>(null);
    const [extractedText, setExtractedText] = useState<string | null>(null);
    interface ParsedIDData {
        firstName?: string;
        lastName?: string;
        birthDate?: string;
        gender?: string;
        idNumber?: string;
        address?: string;
        phone?: string;
        email?: string;
    }

    const [parsedData, setParsedData] = useState<ParsedIDData | null>(null);

    const scanDocument = async () => {
        try {
            const { scannedImages } = await DocumentScanner.scanDocument({
                maxNumDocuments: 1,
            });

            if (scannedImages && scannedImages.length > 0) {
                const imagePath = scannedImages[0];
                setScannedImage(imagePath);

                const path = imagePath.replace("file://", "");
                const lines = await TextRecognition.recognize(path);
                const fullText = Array.isArray(lines) ? lines.join("\n") : String(lines ?? "");
                setExtractedText(fullText);
                const parsed = parseUSIDCardData(fullText, imagePath);
                setParsedData(parsed);

                const routeParams: RouteParams = {
                    ...parsed,
                    scannedImageUri: imagePath,
                };
                if (params.doctor_id) routeParams.doctor_id = params.doctor_id;
                router.push({
                    pathname: "/(modals)/add-patient/photo",
                    params: routeParams,
                });
            }
        } catch (error) {
            // Error handled silently
        }
    };

    interface RouteParams {
        firstName?: string;
        lastName?: string;
        birthDate?: string;
        gender?: string;
        idNumber?: string;
        address?: string;
        phone?: string;
        email?: string;
        scannedImageUri?: string;
        doctor_id?: string;
        [key: string]: string | undefined;
    }

    return (
        <SafeAreaView className="flex-1 items-center justify-center  gap-24 ">
            <View className=" items-center gap-10">
                <View style={[styles.imageContainer, { width: imageWidth, height: imageHeight }]}>{scannedImage ? <Image resizeMode="contain" source={{ uri: scannedImage }} style={styles.image} /> : <Image resizeMode="contain" source={require("../assets/png/AddPatient.png")} style={styles.image} />}</View>

                <View style={styles.textContainer} className="gap-6">
                    <BaseText type="LargeTitle" weight={700} color="labels.primary">
                        Add Patient ID
                    </BaseText>
                    <BaseText style={{ width: 240 }} align="center">
                        You can fill patient data with image of ID card easily.
                    </BaseText>
                </View>
            </View>

            <View className="w-full gap-4 px-10">
                <BaseButton label="Scan The ID" size="Large" rounded ButtonStyle="Filled" onPress={scanDocument} />
                <BaseButton
                    label="Skip"
                    size="Large"
                    ButtonStyle="Plain"
                    onPress={() => {
                        const routeParams: RouteParams = {};
                        if (params.doctor_id) {
                            routeParams.doctor_id = params.doctor_id;
                        }
                        router.push({
                            pathname: "/(modals)/add-patient/photo",
                            params: routeParams,
                        });
                    }}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    imageContainer: {
        width: 0,
        height: 0,
    },
    image: {
        width: "100%",
        height: "100%",
    },
    textContainer: {
        gap: spacing["6"],
        alignItems: "center",
    },
});
