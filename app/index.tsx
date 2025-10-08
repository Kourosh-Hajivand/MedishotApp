import { Redirect } from "expo-router";
import React from "react";
import { useAuth } from "../utils/hook/useAuth";

export default function IndexRoute() {
    const { isAuthenticated } = useAuth();

    if (isAuthenticated === null) return null;

    if (isAuthenticated) {
        return <Redirect href="/(tabs)/patients" />;
    }

    return <Redirect href="/welcome" />;
}
