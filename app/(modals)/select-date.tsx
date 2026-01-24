import { BackButton } from "@/components/button/ui/BackButton";
import { getPickerCallback, removePickerCallback } from "@/components/input/ControlledPickerInput";
import { BaseText } from "@/components/text/BaseText";
import { DateTimePicker, Host } from "@expo/ui/swift-ui";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

function parseDateSafe(value: string | undefined): Date {
    if (!value || typeof value !== "string") return new Date();
    const trimmed = value.trim();
    if (!trimmed || !YYYY_MM_DD.test(trimmed)) return new Date();
    const d = new Date(trimmed + "T12:00:00");
    return Number.isNaN(d.getTime()) ? new Date() : d;
}

export default function SelectDateScreen() {
    const params = useLocalSearchParams<{ callbackKey?: string; currentValue?: string }>();
    const navigation = useNavigation();
    useEffect(() => {
        if (__DEV__) console.log("[SelectDate]", "mount", params);
    }, []);
    const safeAreaInsets = useSafeAreaInsets();
    const initialDate = useMemo(() => parseDateSafe(params.currentValue), [params.currentValue]);

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

    const isoDate = (() => {
        try {
            const t = selectedDate.getTime();
            return Number.isNaN(t) ? new Date().toISOString() : selectedDate.toISOString();
        } catch {
            return new Date().toISOString();
        }
    })();

    return (
        <View style={[styles.container, { paddingTop: safeAreaInsets.top + 40 }]}>
            <View style={styles.content}>
                <Host style={styles.datePickerContainer}>
                    <DateTimePicker
                        onDateSelected={(date) => {
                            setSelectedDate(date);
                        }}
                        displayedComponents="date"
                        initialDate={isoDate}
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
