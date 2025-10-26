import { BackButton } from "@/components/button/ui/BackButton";
import { getPickerCallback, removePickerCallback } from "@/components/input/ControlledPickerInput";
import { BaseText } from "@/components/text/BaseText";
import { DateTimePicker, Host } from "@expo/ui/swift-ui";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useLayoutEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SelectDateScreen() {
    const params = useLocalSearchParams<{ callbackKey?: string; currentValue?: string }>();
    const navigation = useNavigation();
    const safeAreaInsets = useSafeAreaInsets();
    const initialDate = params.currentValue ? new Date(params.currentValue + "T00:00:00") : new Date();

    const [selectedDate, setSelectedDate] = useState(initialDate);

    const handleDone = () => {
        // Convert to YYYY-MM-DD format
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
        const day = String(selectedDate.getDate()).padStart(2, "0");
        const formattedDate = `${year}-${month}-${day}`;

        // Call the callback if it exists
        const callback = params.callbackKey ? getPickerCallback(params.callbackKey) : null;
        if (callback) {
            callback(formattedDate);
            if (params.callbackKey) {
                removePickerCallback(params.callbackKey);
            }
        }

        router.back();
    };

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: true,
            headerTitle: "Select Date",
            headerTitleStyle: {
                fontWeight: "600",
            },
            headerLeft: () => <BackButton onPress={() => router.back()} />,
            headerRight: () => (
                <Pressable onPress={handleDone} className="px-4">
                    <BaseText type="Body" weight="600" color="system.blue">
                        Done
                    </BaseText>
                </Pressable>
            ),
            headerShadowVisible: true,
        });
    }, [navigation, selectedDate]);

    return (
        <View style={[styles.container, { paddingTop: safeAreaInsets.top + 40 }]}>
            <View style={styles.content}>
                <Host style={styles.datePickerContainer}>
                    <DateTimePicker
                        onDateSelected={(date) => {
                            setSelectedDate(date);
                        }}
                        displayedComponents="date"
                        initialDate={selectedDate.toISOString()}
                        variant="wheel"
                    />
                </Host>
            </View>
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
        justifyContent: "flex-start",
        alignItems: "flex-start",
    },
    datePickerContainer: {
        width: "100%",
        height: 200,
    },
});
