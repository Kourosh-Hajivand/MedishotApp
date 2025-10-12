import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../utils/hook/useAuth";

export default function IndexRoute() {
    const { isAuthenticated } = useAuth();

    if (isAuthenticated === null) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    if (isAuthenticated) {
        return <Redirect href="/(tabs)/patients" />;
    }

    return <Redirect href="/welcome" />;
}
