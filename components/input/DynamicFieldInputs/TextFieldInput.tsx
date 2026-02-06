import colors from "@/theme/colors";
import React from "react";
import { Platform, TextInput, TextInputProps } from "react-native";

interface Props extends TextInputProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
}

export const TextFieldInput: React.FC<Props> = ({ value, onChangeText, placeholder = "Text", ...props }) => {
    return (
        <TextInput
            {...props}
            className="flex-1 px-0"
            style={{
                paddingVertical: Platform.OS === "ios" ? 12 : 10,
                fontSize: 16,
                color: colors.text,
            }}
            placeholder={placeholder}
            placeholderTextColor={"rgba(60, 60, 67, 0.30)"}
            value={value}
            onChangeText={onChangeText}
            returnKeyType={props.returnKeyType || "next"}
            blurOnSubmit={props.blurOnSubmit !== undefined ? props.blurOnSubmit : false}
        />
    );
};
