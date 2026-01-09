import colors from "@/theme/colors";
import { extractPhoneDigits, formatPhoneDisplay, toE164 } from "@/utils/helper/phoneUtils";
import React, { useEffect, useRef, useState } from "react";
import { Platform, TextInput, TextInputProps } from "react-native";

interface Props extends TextInputProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
}

export const PhoneNumberInput: React.FC<Props> = ({ value, onChangeText, placeholder = "Phone", ...props }) => {
    const inputRef = useRef<TextInput>(null);
    // Track if the change is from internal (typing) or external (prop change)
    const isInternalChangeRef = useRef(false);
    // Track the last value we sent to parent to detect external changes
    const lastSentValueRef = useRef<string>(value);
    // Store digits locally to prevent clearing during typing
    const [localDigits, setLocalDigits] = useState<string>(() => extractPhoneDigits(value));

    // Sync localDigits with prop value when it changes externally
    useEffect(() => {
        // Skip sync if this change was triggered by our own handleChange
        // Check if the current value matches what we just sent
        if (isInternalChangeRef.current && value === lastSentValueRef.current) {
            isInternalChangeRef.current = false;
            return;
        }

        // External change - sync localDigits with prop value
        const extracted = extractPhoneDigits(value);
        setLocalDigits((prev) => {
            // Only update if different to prevent unnecessary re-renders
            if (extracted !== prev) {
                return extracted;
            }
            return prev;
        });
        // Reset flag for external changes
        isInternalChangeRef.current = false;
    }, [value]);

    // Format display value from local digits
    const displayValue = formatPhoneDisplay(localDigits);

    const handleChange = (text: string) => {
        // Extract digits from input
        const digits = text.replace(/\D/g, "");
        const limited = digits.slice(0, 10);

        // Update local state immediately for smooth typing
        setLocalDigits(limited);

        // Convert to E.164 format and notify parent
        let valueToSend: string;
        if (limited.length === 10) {
            // Valid complete phone number - send E.164 format
            valueToSend = toE164(limited);
        } else if (limited.length > 0) {
            // Partial input - send raw digits to preserve state while typing
            // This prevents the value from being cleared
            valueToSend = limited;
        } else {
            // Empty input - clear everything
            valueToSend = "";
        }

        // Mark this as an internal change and track what we're sending
        isInternalChangeRef.current = true;
        lastSentValueRef.current = valueToSend;
        onChangeText(valueToSend);
    };

    return (
        <TextInput
            {...props}
            ref={inputRef}
            className="flex-1 px-0"
            style={{
                paddingVertical: Platform.OS === "ios" ? 12 : 10,
                color: colors.text,
            }}
            placeholder={placeholder}
            placeholderTextColor={"rgba(60, 60, 67, 0.30)"}
            value={displayValue}
            onChangeText={handleChange}
            keyboardType="phone-pad"
            textContentType={Platform.OS === "ios" ? "telephoneNumber" : undefined}
            autoComplete={Platform.OS === "android" ? "tel" : undefined}
            returnKeyType={Platform.OS === "ios" ? undefined : props.returnKeyType || "done"}
            blurOnSubmit={props.blurOnSubmit !== undefined ? props.blurOnSubmit : Platform.OS === "ios" ? false : true}
        />
    );
};
