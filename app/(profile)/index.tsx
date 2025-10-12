import { BaseText } from "@/components";
import Avatar from "@/components/avatar";
import colors from "@/theme/colors";
import { useAuth } from "@/utils/hook/useAuth";
import { router } from "expo-router";
import React from "react";
import { Image, TouchableOpacity, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRightIcon } from "../../assets/icons";

const profileIcons = {
    practiceOverview: require("../../assets/icons/profile/Practice Overview.png"),
    practiceTeam: require("../../assets/icons/profile/Practice Team.png"),
    printInformation: require("../../assets/icons/profile/Print Information.png"),
    subscription: require("../../assets/icons/profile/Subscription.png"),
    notification: require("../../assets/icons/profile/Notfication.png"),
};

export default function index() {
    const insets = useSafeAreaInsets();
    const { profile } = useAuth();

    const menuItems = [
        { lable: "Practice Overview", icon: profileIcons.practiceOverview, href: "/profile/practice-overview" },
        { lable: "Practice Team", icon: profileIcons.practiceTeam, href: "/profile/practice-team" },
        { lable: "Print Information", icon: profileIcons.printInformation, href: "/profile/print-information" },
        { lable: "Subscription", icon: profileIcons.subscription, href: "/profile/subscription" },
        { lable: "Notification", icon: profileIcons.notification, href: "/profile/notification" },
    ];

    return (
        <ScrollView className="flex-1 bg-white px-4" style={{ paddingTop: insets.top + 60 }}>
            <View className="gap-4">
                <BaseText type="LargeTitle" weight="700" color="system.black">
                    Profile
                </BaseText>
                <View className="w-full bg-system-gray6 p-1 rounded-[12px]">
                    <Avatar rounded={8} name={profile?.first_name ?? ""} />
                </View>
                <View className="w-full">
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            onPress={() => router.push(item.href as any)}
                            className="flex-row items-center justify-between py-4 pr-4 pl-2"
                            style={{
                                borderBottomWidth: index !== menuItems.length - 1 ? 0.5 : 0,
                                borderBottomColor: colors.system.gray5,
                            }}
                        >
                            <View className="flex-row items-center gap-2">
                                <Image source={item.icon} style={{ width: 24, height: 24 }} />
                                <BaseText type="Body" weight="400" color="system.black">
                                    {item.lable}
                                </BaseText>
                            </View>
                            <ChevronRightIcon width={12} height={12} />
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </ScrollView>
    );
}
