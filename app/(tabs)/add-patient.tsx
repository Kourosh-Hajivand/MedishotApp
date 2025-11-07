import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback } from "react";
import { View } from "react-native";

export default function AddPatientRedirect() {
    useFocusEffect(
        useCallback(() => {
            router.push("/(modals)/add-patient/form");
        }, []),
    );

    return <View style={{ flex: 1, backgroundColor: "white" }} />;
}
