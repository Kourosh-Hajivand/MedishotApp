import { BaseText } from "@/components/text/BaseText";
import colors from "@/theme/colors";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const COUNTRIES = ["United States", "Canada", "United Kingdom", "Germany", "France", "Italy", "Iran", "Japan", "China", "India", "Australia", "Brazil", "Mexico"];

export default function SelectCountryModal() {
    const router = useRouter();
    const { selected, paramKey } = useLocalSearchParams<{ selected?: string; paramKey?: string }>();
    const safeAreaInsets = useSafeAreaInsets();

    const [current, setCurrent] = useState(selected || "United States");

    useEffect(() => {
        if (!selected) {
            router.setParams({ selected: "United States" });
        }
    }, []);

    return (
        <View style={[styles.container, { paddingTop: safeAreaInsets.top + 20 }]}>
            <FlatList
                data={COUNTRIES}
                keyExtractor={(item) => item}
                renderItem={({ item }) => {
                    const isSelected = current === item;
                    return (
                        <TouchableOpacity
                            key={item}
                            className="px-4"
                            style={[styles.optionButton, { backgroundColor: isSelected ? colors.system.blue + "10" : "transparent" }]}
                            onPress={() => {
                                router.setParams({ selected: item, paramKey: paramKey });
                                setCurrent(item);
                                router.back();
                            }}
                            activeOpacity={0.7}
                        >
                            <BaseText type="Footnote" color={isSelected ? "system.blue" : "labels.primary"} weight={isSelected ? "500" : "400"}>
                                {item}
                            </BaseText>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.system.white,
        padding: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    optionButton: {
        paddingVertical: 12,
        borderRadius: 10,
        marginBottom: 6,
    },
});
