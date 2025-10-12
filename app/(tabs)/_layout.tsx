import { Tabs, useRouter } from "expo-router";
import React from "react";
import CustomTabBar from "../../components/navigation/CustomTabBar";

export default function TabsLayout() {
    const router = useRouter();

    const handleAddPatient = () => {
        router.push("/(modals)/add-patient/form");
    };

    return (
        <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <CustomTabBar {...(props as any)} onAddPress={handleAddPatient} />} initialRouteName="patients">
            <Tabs.Screen
                name="Album"
                options={{
                    tabBarLabel: "Album",
                }}
            />
            <Tabs.Screen
                name="Patients"
                options={{
                    tabBarLabel: "Patients",
                }}
            />
        </Tabs>
    );
}
