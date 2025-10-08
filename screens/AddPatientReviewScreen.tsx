import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BaseButton, BaseText } from "../components";
import { spacing } from "../styles/spaces";
import colors from "../theme/colors.shared.js";

export const AddPatientReviewScreen: React.FC = () => {
    const params = useLocalSearchParams<{ patientData?: string; photoUri?: string }>();
    const patientData = params.patientData ? JSON.parse(params.patientData as string) : ({} as any);
    const photoUri = params.photoUri as string | undefined;

    const handleSubmit = () => {
        // TODO: Submit patient data to API
        console.log("Submitting patient data:", { patientData, photoUri });

        // Close modal and go back to main screen
        router.back();
    };

    return (
        <SafeAreaView style={styles.container} className="flex-1 bg-white">
            <ScrollView style={styles.scrollView} className="flex-1 px-4 pt-6">
                <View style={styles.content} className="space-y-6">
                    {/* Patient Photo */}
                    {photoUri && (
                        <View style={styles.photoContainer} className="items-center">
                            <Image source={{ uri: photoUri }} style={styles.photo} className="w-32 h-32 rounded-full" resizeMode="cover" />
                        </View>
                    )}

                    {/* Patient Information */}
                    <View style={styles.infoContainer} className="space-y-4">
                        <BaseText className="text-xl font-bold text-gray-800">Patient Information</BaseText>

                        <View style={styles.infoList} className="space-y-3">
                            <View style={styles.infoRow} className="flex-row justify-between">
                                <BaseText className="text-gray-600">First Name:</BaseText>
                                <BaseText className="text-gray-800 font-medium">{patientData.firstName}</BaseText>
                            </View>

                            <View style={styles.infoRow} className="flex-row justify-between">
                                <BaseText className="text-gray-600">Last Name:</BaseText>
                                <BaseText className="text-gray-800 font-medium">{patientData.lastName}</BaseText>
                            </View>

                            <View style={styles.infoRow} className="flex-row justify-between">
                                <BaseText className="text-gray-600">Phone:</BaseText>
                                <BaseText className="text-gray-800 font-medium">{patientData.phone}</BaseText>
                            </View>

                            <View style={styles.infoRow} className="flex-row justify-between">
                                <BaseText className="text-gray-600">Age:</BaseText>
                                <BaseText className="text-gray-800 font-medium">{patientData.age}</BaseText>
                            </View>

                            {patientData.notes && (
                                <View style={styles.infoRow} className="flex-row justify-between">
                                    <BaseText className="text-gray-600">Notes:</BaseText>
                                    <BaseText className="text-gray-800 font-medium flex-1 text-right">{patientData.notes}</BaseText>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                <View style={styles.buttonContainer} className="py-6 space-y-3">
                    <BaseButton onPress={handleSubmit} label="Add Patient" ButtonStyle="Filled" className="bg-blue-500" />

                    <BaseButton onPress={() => router.back()} label="Edit Information" ButtonStyle="Plain" className="text-blue-500" />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: spacing["4"],
        paddingTop: spacing["6"],
    },
    content: {
        gap: spacing["6"],
    },
    photoContainer: {
        alignItems: "center",
    },
    photo: {
        width: 128,
        height: 128,
        borderRadius: 64,
    },
    infoContainer: {
        gap: spacing["4"],
    },
    infoList: {
        gap: spacing["3"],
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    buttonContainer: {
        paddingVertical: spacing["6"],
        gap: spacing["3"],
    },
});
