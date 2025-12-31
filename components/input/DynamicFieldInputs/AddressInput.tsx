import colors from "@/theme/colors";
import { useRouter } from "expo-router";
import React, { useRef } from "react";
import { Platform, StyleSheet, TextInput, TextInputProps, TouchableOpacity, View } from "react-native";
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
    const street2Ref = useRef<TextInput>(null);
    const cityRef = useRef<TextInput>(null);
    const stateRef = useRef<TextInput>(null);
    const zipRef = useRef<TextInput>(null);

    const handleFieldChange = (key: keyof Address, val: string) => {
        onChange({ ...value, [key]: val });
    };

    return (
        <View style={styles.container}>
            <TextInput 
                placeholder="Street" 
                value={value.street1} 
                onChangeText={(t) => handleFieldChange("street1", t)} 
                style={styles.input} 
                placeholderTextColor={"rgba(60, 60, 67, 0.30)"}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => street2Ref.current?.focus()}
            />
            <TextInput 
                ref={street2Ref}
                placeholder="Street" 
                value={value.street2} 
                onChangeText={(t) => handleFieldChange("street2", t)} 
                style={styles.input} 
                placeholderTextColor={"rgba(60, 60, 67, 0.30)"}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => cityRef.current?.focus()}
            />
            <TextInput 
                ref={cityRef}
                placeholder="City" 
                value={value.city} 
                onChangeText={(t) => handleFieldChange("city", t)} 
                style={[styles.input, styles.half]} 
                placeholderTextColor={"rgba(60, 60, 67, 0.30)"}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => stateRef.current?.focus()}
            />
            <View className="flex-row gap-2">
                <TextInput 
                    ref={stateRef}
                    placeholder="State" 
                    className="flex-1" 
                    value={value.state} 
                    onChangeText={(t) => handleFieldChange("state", t)} 
                    style={[styles.input, styles.half]} 
                    placeholderTextColor={"rgba(60, 60, 67, 0.30)"}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => zipRef.current?.focus()}
                />
                <TextInput 
                    ref={zipRef}
                    placeholder="ZIP" 
                    className="flex-1" 
                    value={value.zip} 
                    onChangeText={(t) => handleFieldChange("zip", t)} 
                    style={styles.input} 
                    placeholderTextColor={"rgba(60, 60, 67, 0.30)"} 
                    keyboardType="numeric"
                    returnKeyType="done"
                    blurOnSubmit={true}
                />
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
