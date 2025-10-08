import { router } from "expo-router";
import React, { useState } from "react";
import { Dimensions, Image, ScrollView, StyleSheet, View } from "react-native";
// import DocumentScanner from "react-native-document-scanner-plugin";
import { SafeAreaView } from "react-native-safe-area-context";
// import TextRecognition from "react-native-text-recognition";
import { BaseButton, BaseText } from "../components";
import { spacing } from "../styles/spaces";
import colors from "../theme/colors.shared";

export const AddPatientFormScreen: React.FC = () => {
    const screenWidth = Dimensions.get("window").width;
    const imageWidth = screenWidth * 0.7;
    const imageHeight = screenWidth * 0.6;

    const [scannedImage, setScannedImage] = useState<string | null>(null);
    const [extractedText, setExtractedText] = useState<string | null>(null);

    // const scanDocument = async () => {
    //     try {
    //         const { scannedImages } = await DocumentScanner.scanDocument({
    //             maxNumDocuments: 1,
    //         });

    //         if (scannedImages && scannedImages.length > 0) {
    //             const imagePath = scannedImages[0];
    //             setScannedImage(imagePath);

    //             const path = imagePath.replace("file://", "");

    //             const lines = await TextRecognition.recognize(path);
    //             const fullText = Array.isArray(lines) ? lines.join("\n") : String(lines ?? "");
    //             setExtractedText(fullText);
    //             console.log("OCR:", fullText);
    //         }
    //     } catch (error) {
    //         console.error("Document scan or OCR failed:", error);
    //         // setExtractedText('OCR failed. Please try a clearer scan.');
    //     }
    // };

    return (
        <SafeAreaView style={styles.container} className="flex-1 items-center justify-between bg-white">
            <View style={styles.mainContent} className="mt-[15%] flex-1 items-center gap-16">
                <View style={[styles.imageContainer, { width: imageWidth, height: imageHeight }]}>{scannedImage ? <Image resizeMode="contain" source={{ uri: scannedImage }} style={styles.image} /> : <Image resizeMode="contain" source={require("../assets/png/AddPatient.png")} style={styles.image} />}</View>

                <View style={styles.textContainer} className="gap-6">
                    <BaseText type="LargeTitle" weight={700} color="labels.primary">
                        Add Patient ID
                    </BaseText>
                    <BaseText style={{ width: 240 }} align="center">
                        You can fill patient data with image of ID card easily.
                    </BaseText>
                </View>

                {extractedText && (
                    <ScrollView style={{ maxHeight: 150, marginTop: 10 }}>
                        <BaseText type="Body" color="labels.primary">
                            {extractedText}
                        </BaseText>
                    </ScrollView>
                )}
            </View>

            <View style={styles.buttonContainer} className="mb-[10%] w-full gap-4 px-10">
                <BaseButton label="Scan The ID" size="Large" ButtonStyle="Filled" />
                <BaseButton label="Skip" size="Large" ButtonStyle="Plain" onPress={() => router.push("/(modals)/add-patient/photo")} />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        alignItems: "center",
        justifyContent: "space-between",
    },
    mainContent: {
        gap: spacing["16"],
        flex: 1,
        alignItems: "center",
        marginTop: "15%",
    },
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
    buttonContainer: {
        gap: spacing["4"],
        width: "100%",
        paddingHorizontal: spacing["10"],
        marginBottom: "10%",
    },
});
