import CustomTabBar from "@/components/navigation/CustomTabBar";
import { Tabs, useRouter, useSegments } from "expo-router";
import React from "react";

export default function TabsLayout() {
    const router = useRouter();

    const segments = useSegments() as string[];

    const isPatientDetail = segments.includes("patients") && segments.length > 2;

    const handleAddPatient = () => {
        router.push("/(modals)/add-patient/form");
    };

    return (
        <Tabs
            initialRouteName="patients"
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    display: isPatientDetail ? "none" : "flex",
                },
            }}
            tabBar={(props) => <CustomTabBar {...(props as any)} onAddPress={handleAddPatient} />}
        >
            <Tabs.Screen
                name="album"
                options={{
                    tabBarLabel: "Album",
                }}
            />
            <Tabs.Screen
                name="patients"
                options={{
                    tabBarLabel: "Patients",
                }}
            />
        </Tabs>
    );
}
