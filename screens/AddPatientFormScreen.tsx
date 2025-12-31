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
    const [parsedData, setParsedData] = useState<any>(null);

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
                console.log("OCR:", fullText);
                // Parse the extracted data
                const parsed = parseUSIDCardData(fullText, imagePath);
                setParsedData(parsed);
                console.log("Parsed ID Card Data:", parsed);
            }
        } catch (error) {
            console.error("Document scan or OCR failed:", error);
            // setExtractedText('OCR failed. Please try a clearer scan.');
        }
    };

    const handleContinue = () => {
        if (parsedData && scannedImage) {
            // Encode the parsed data and image as base64 or pass as params
            const routeParams: any = {
                ...parsedData,
                scannedImageUri: scannedImage,
            };

            // Pass doctor_id if provided
            if (params.doctor_id) {
                routeParams.doctor_id = params.doctor_id;
            }

            // Navigate to photo screen with parsed data
            router.push({
                pathname: "/(modals)/add-patient/photo",
                params: routeParams,
            });
        } else {
            // If no scan, go to photo screen normally
            const routeParams: any = {};
            if (params.doctor_id) {
                routeParams.doctor_id = params.doctor_id;
            }
            router.push({
                pathname: "/(modals)/add-patient/photo",
                params: routeParams,
            });
        }
    };

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
                {parsedData && scannedImage && <BaseButton label="Continue with Scanned Data" size="Large" rounded ButtonStyle="Filled" onPress={handleContinue} />}
                <BaseButton
                    label="Skip"
                    size="Large"
                    ButtonStyle="Plain"
                    onPress={() => {
                        const routeParams: any = {};
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
