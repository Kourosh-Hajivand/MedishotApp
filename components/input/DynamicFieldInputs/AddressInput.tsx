import colors from "@/theme/colors";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { BaseText } from "../../text/BaseText";

interface Address {
    street1: string;
    street2: string;
    city: string;
    state: string;
    zip: string;
    country: string;
}

interface Props {
    fieldId: string;
    value: Address;
    onChange: (address: Address) => void;
}

export const AddressInput: React.FC<Props> = ({ fieldId, value, onChange }) => {
    const router = useRouter();

    const handleFieldChange = (key: keyof Address, val: string) => {
        onChange({ ...value, [key]: val });
    };

    return (
        <View style={styles.container}>
            <TextInput placeholder="Street" value={value.street1} onChangeText={(t) => handleFieldChange("street1", t)} style={styles.input} placeholderTextColor={"rgba(60, 60, 67, 0.30)"} />
            <TextInput placeholder="Street" value={value.street2} onChangeText={(t) => handleFieldChange("street2", t)} style={styles.input} placeholderTextColor={"rgba(60, 60, 67, 0.30)"} />
            <TextInput placeholder="City" value={value.city} onChangeText={(t) => handleFieldChange("city", t)} style={[styles.input, styles.half]} placeholderTextColor={"rgba(60, 60, 67, 0.30)"} />
            <View className="flex-row gap-2">
                <TextInput placeholder="State" className="flex-1" value={value.state} onChangeText={(t) => handleFieldChange("state", t)} style={[styles.input, styles.half]} placeholderTextColor={"rgba(60, 60, 67, 0.30)"} />
                <TextInput placeholder="ZIP" className="flex-1" value={value.zip} onChangeText={(t) => handleFieldChange("zip", t)} style={styles.input} placeholderTextColor={"rgba(60, 60, 67, 0.30)"} keyboardType="numeric" />
            </View>

            <TouchableOpacity
                onPress={() =>
                    router.push({
                        pathname: "/(modals)/add-patient/select-country",
                        params: { selected: value.country, paramKey: fieldId, type: "country" },
                    })
                }
                style={styles.countryField}
                activeOpacity={0.7}
            >
                <BaseText type="Subhead" color={value.country ? "labels.primary" : "system.gray"}>
                    {value.country || "Select Country"}
                </BaseText>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, gap: 6 },
    half: { flex: 1 },
    input: {
        backgroundColor: "transparent",
        color: colors.text,
        fontSize: 16,
        paddingVertical: Platform.OS === "ios" ? 12 : 10,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.system.gray4,
    },
    countryField: { paddingVertical: Platform.OS === "ios" ? 12 : 10 },
});
