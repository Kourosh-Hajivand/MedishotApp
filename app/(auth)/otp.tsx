import React from "react";
import { Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

export default function otp() {
    return (
        <ScrollView contentContainerClassName="flex-1">
            <View>
                <Text>OTP</Text>
            </View>
        </ScrollView>
    );
}
