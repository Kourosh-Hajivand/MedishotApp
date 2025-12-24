import { BackButton } from "@/components/button/ui/BackButton";
import { getPickerCallback, removePickerCallback } from "@/components/input/ControlledPickerInput";
import { BaseText } from "@/components/text/BaseText";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useLayoutEffect } from "react";
import { Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SelectGenderScreen() {
    const params = useLocalSearchParams<{ callbackKey?: string; currentValue?: string }>();
    const navigation = useNavigation();
    const safeAreaInsets = useSafeAreaInsets();
    // Convert lowercase value from backend to uppercase for display
    const selectedGender = params.currentValue ? params.currentValue.charAt(0).toUpperCase() + params.currentValue.slice(1).toLowerCase() : "";

    const genders = ["Male", "Female", "Other"];

    const handleSelectGender = (gender: string) => {
        // Convert to lowercase for backend (Male -> male, Female -> female, Other -> other)
        const genderLowercase = gender.toLowerCase();

        // Call the callback if it exists
        const callback = params.callbackKey ? getPickerCallback(params.callbackKey) : null;
        if (callback) {
            callback(genderLowercase);
            if (params.callbackKey) {
                removePickerCallback(params.callbackKey);
            }
        }

        router.back();
    };

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: true,
            headerTitle: "Select Gender",
            headerTitleStyle: {
                fontWeight: "600",
            },
            headerLeft: () => <BackButton onPress={() => router.back()} />,
            headerRight: () => (
                <Pressable onPress={() => router.back()} className="px-4">
                    <BaseText type="Body" weight="600" color="system.blue">
                        Done
                    </BaseText>
                </Pressable>
            ),
            headerShadowVisible: true,
        });
    }, [navigation]);

    return (
        <View style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {genders.map((gender, index) => {
                    const isSelected = selectedGender.toLowerCase() === gender.toLowerCase();
                    return (
                        <TouchableOpacity key={index} style={[styles.optionButton, isSelected && styles.selectedOption]} onPress={() => handleSelectGender(gender)} activeOpacity={0.7}>
                            <BaseText type="Body" color={isSelected ? "system.blue" : "labels.primary"} weight={isSelected ? "600" : "400"}>
                                {gender}
                            </BaseText>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
        gap: 8,
    },
    optionButton: {
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: "#f5f5f5",
    },
    selectedOption: {
        backgroundColor: "#e3f2fd",
    },
});
