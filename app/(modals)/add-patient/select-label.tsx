import { BaseText } from "@/components/text/BaseText";
import colors from "@/theme/colors";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SelectLabelModal() {
    const router = useRouter();
    const { options, selected, paramKey } = useLocalSearchParams<{ options: string; selected?: string; paramKey?: string }>();
    const labelOptions: string[] = options ? JSON.parse(options) : [];
    const safeAreaInsets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: safeAreaInsets.top + 20 }]}>
            {labelOptions.map((option, index) => {
                const isSelected = selected === option;
                return (
                    <TouchableOpacity
                        key={index}
                        className="px-4"
                        style={[styles.optionButton, { backgroundColor: isSelected ? colors.system.blue + "10" : "transparent" }]}
                        onPress={() => {
                            router.setParams({ selected: option, paramKey });
                            router.back();
                        }}
                        activeOpacity={0.7}
                    >
                        <BaseText type="Footnote" color={isSelected ? "system.blue" : "labels.primary"} weight={isSelected ? "500" : "400"}>
                            {option}
                        </BaseText>
                    </TouchableOpacity>
                );
            })}
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
