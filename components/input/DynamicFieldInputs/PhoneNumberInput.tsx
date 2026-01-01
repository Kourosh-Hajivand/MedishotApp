import colors from "@/theme/colors";
import React from "react";
import { Platform, TextInput, TextInputProps } from "react-native";

interface Props extends TextInputProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
}

export const PhoneNumberInput: React.FC<Props> = ({ value, onChangeText, placeholder = "Phone", ...props }) => {
    const formatPhoneNumber = (text: string) => {
        // Remove all non-numeric characters
        const cleaned = text.replace(/\D/g, "");

        // Format as (XXX) XXX-XXXX
        if (cleaned.length <= 3) {
            return cleaned;
        } else if (cleaned.length <= 6) {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
        } else {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
        }
    };

    const handleChange = (text: string) => {
        const formatted = formatPhoneNumber(text);
        onChangeText(formatted);
    };

    return (
        <TextInput
            {...props}
            className="flex-1  px-0"
            style={{
                paddingVertical: Platform.OS === "ios" ? 12 : 10,
                color: colors.text,
            }}
            placeholder={placeholder}
            placeholderTextColor={"rgba(60, 60, 67, 0.30)"}
            value={value}
            onChangeText={handleChange}
            keyboardType="phone-pad"
            maxLength={14} // (XXX) XXX-XXXX
            returnKeyType={Platform.OS === "ios" ? undefined : props.returnKeyType || "done"}
            blurOnSubmit={props.blurOnSubmit !== undefined ? props.blurOnSubmit : Platform.OS === "ios" ? false : true}
        />
    );
};
