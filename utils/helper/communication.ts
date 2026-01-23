import { Alert, Linking } from "react-native";

/**
 * Validates if a phone number exists and shows alert if not
 * @param numbers - Array of phone numbers
 * @returns The first valid phone number or null
 */
const validatePhoneNumber = (numbers: string[]): string | null => {
    if (!numbers || numbers.length === 0) {
        Alert.alert("No Phone Number", "This patient does not have a phone number registered.");
        return null;
    }

    const firstNumber = numbers[0];
    if (!firstNumber || firstNumber.trim() === "") {
        Alert.alert("No Phone Number", "This patient does not have a valid phone number.");
        return null;
    }

    return firstNumber;
};

/**
 * Opens iMessage with a specific phone number
 * @param phoneNumber - The phone number to send message to
 */
export const openMessage = (phoneNumber: string) => {
    // Remove any non-digit characters except + for international numbers
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, "");

    if (!cleanNumber) {
        Alert.alert("Error", "Invalid phone number");
        return;
    }

    const messageUrl = `sms:${cleanNumber}`;

    Linking.canOpenURL(messageUrl)
        .then((supported) => {
            if (supported) {
                return Linking.openURL(messageUrl);
            } else {
                Alert.alert("Error", "SMS is not supported on this device");
            }
        })
        .catch((err) => {
            Alert.alert("Error", "Could not open message app");
        });
};

/**
 * Opens iMessage with patient's phone number (with validation)
 * @param numbers - Array of patient's phone numbers
 */
export const openMessageForPatient = (numbers: string[]) => {
    const phoneNumber = validatePhoneNumber(numbers);
    if (phoneNumber) {
        openMessage(phoneNumber);
    }
};

/**
 * Opens phone dialer with a specific phone number
 * @param phoneNumber - The phone number to call
 */
export const openCall = (phoneNumber: string) => {
    // Remove any non-digit characters except + for international numbers
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, "");

    if (!cleanNumber) {
        Alert.alert("Error", "Invalid phone number");
        return;
    }

    const callUrl = `tel:${cleanNumber}`;

    Linking.canOpenURL(callUrl)
        .then((supported) => {
            if (supported) {
                return Linking.openURL(callUrl);
            } else {
                Alert.alert("Error", "Phone calls are not supported on this device");
            }
        })
        .catch((err) => {
            Alert.alert("Error", "Could not open phone app");
        });
};

/**
 * Opens phone dialer with patient's phone number (with validation)
 * @param numbers - Array of patient's phone numbers
 */
export const openCallForPatient = (numbers: string[]) => {
    const phoneNumber = validatePhoneNumber(numbers);
    if (phoneNumber) {
        openCall(phoneNumber);
    }
};

/**
 * Opens WhatsApp with a specific phone number
 * @param phoneNumber - The phone number to send WhatsApp message to
 */
export const openWhatsApp = (phoneNumber: string) => {
    // Remove any non-digit characters except + for international numbers
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, "");

    if (!cleanNumber) {
        Alert.alert("Error", "Invalid phone number");
        return;
    }

    const whatsappUrl = `whatsapp://send?phone=${cleanNumber}`;

    Linking.canOpenURL(whatsappUrl)
        .then((supported) => {
            if (supported) {
                return Linking.openURL(whatsappUrl);
            } else {
                // Fallback to web version
                const webUrl = `https://wa.me/${cleanNumber}`;
                return Linking.openURL(webUrl);
            }
        })
        .catch((err) => {
            Alert.alert("Error", "Could not open WhatsApp");
        });
};
