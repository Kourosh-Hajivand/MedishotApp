import { BaseText } from "@/components";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { useGetPracticeList } from "@/utils/hook";
import { useAuth } from "@/utils/hook/useAuth";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { Button, ContextMenu, Host, Image, Switch } from "@expo/ui/swift-ui";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useNavigation } from "expo-router";
import { SymbolViewProps } from "expo-symbols";
import React, { ComponentProps, useLayoutEffect } from "react";
import { TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const profileIcons = {
    practiceOverview: require("../../assets/icons/profile/Practice Overview.png"),
    practiceTeam: require("../../assets/icons/profile/Practice Team.png"),
    printInformation: require("../../assets/icons/profile/Print Information.png"),
    subscription: require("../../assets/icons/profile/Subscription.png"),
    notification: require("../../assets/icons/profile/Notfication.png"),
};
type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;
const MAPPING = {
    "house.fill": "home",
    "paperplane.fill": "send",
    "chevron.left.forwardslash.chevron.right": "code",
    "chevron.right": "chevron-right",
} as IconMapping;

export default function index() {
    const insets = useSafeAreaInsets();
    const { profile, isAuthenticated, logout: handleLogout } = useAuth();
    const { data: practiceList } = useGetPracticeList(isAuthenticated === true);
    const { setSettingView, settingView } = useProfileStore();
    const navigation = useNavigation();
    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <Host style={{ width: 30, height: 50 }}>
                    <ContextMenu>
                        <ContextMenu.Items>
                            <Button systemImage="square.and.pencil">Edit Profile</Button>
                            <Button systemImage="rectangle.portrait.and.arrow.right" role="destructive" onPress={handleLogout}>
                                Logout
                            </Button>
                        </ContextMenu.Items>

                        <ContextMenu.Trigger>
                            <View>
                                <Host style={{ width: 35, height: 35 }}>
                                    <Image systemName="ellipsis" />
                                </Host>
                            </View>
                        </ContextMenu.Trigger>
                    </ContextMenu>
                </Host>
            ),
        });
    }, [navigation, handleLogout]);
    const menuItems: { lable: string; icon: IconSymbolName; href: string }[] = [
        { lable: "Practice Overview", icon: "chart.bar.xaxis", href: "/practice-overview" },
        { lable: "Practice Team", icon: "person.2.fill", href: "/practice-team" },
        { lable: "Print Information", icon: "printer.fill", href: "/print-information" },
        { lable: "Subscription", icon: "dollarsign.circle.fill", href: "/subscription" },
        { lable: "Notification", icon: "bell.fill", href: "/notification" },
        { lable: "Archive", icon: "tray.fill", href: "/archive" },
    ];

    return (
        <View className="flex-1 bg-white px-4" style={{ paddingTop: insets.top + 100 }}>
            <Host style={{ width: "100%", height: 68 }}>
                <ContextMenu activationMethod="longPress">
                    <ContextMenu.Items>
                        <Switch
                            label={"View as " + profile?.first_name + " " + profile?.last_name}
                            variant="switch"
                            value={settingView.type === "profile" && settingView.profile?.id === profile?.id}
                            onValueChange={() => {
                                setSettingView({ type: "profile", profile: profile ?? null });
                            }}
                        />
                        {practiceList?.data.map((practice, index) => (
                            <Switch
                                key={index}
                                label={"View as " + practice.name}
                                variant="switch"
                                value={settingView.type === "practice" && settingView.practice?.id === practice.id}
                                onValueChange={() => {
                                    setSettingView({ type: "practice", practice: practice });
                                }}
                            />
                        ))}
                    </ContextMenu.Items>

                    <ContextMenu.Trigger>
                        <TouchableOpacity className={`w-full flex-row items-center justify-between bg-system-gray6 p-1 pr-[27px] ${settingView.type === "profile" ? "rounded-full" : "rounded-[12px]"}`} onPress={() => router.push("/(profile)/profile-detail")}>
                            <View className="flex-row items-center gap-2">
                                <Avatar size={54} rounded={settingView.type === "profile" ? 99 : 8} name={profile?.first_name ?? ""} haveRing={settingView.type === "profile"} color={settingView.type === "profile" && profile?.colors ? profile?.colors : undefined} />
                                <View className="flex-1 ">
                                    <BaseText type="Title3" weight="500" color="system.black">
                                        {settingView.type === "profile" ? profile?.first_name + " " + profile?.last_name : settingView.practice?.name}
                                    </BaseText>
                                    <BaseText type="Callout" weight="400" color="labels.secondary" className="capitalize">
                                        {settingView.type}
                                    </BaseText>
                                </View>
                            </View>
                            <View className="flex-1">
                                <IconSymbol name="chevron.up.chevron.down" size={14} color={colors.labels.secondary} />
                            </View>
                        </TouchableOpacity>
                    </ContextMenu.Trigger>
                </ContextMenu>
            </Host>

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
                        <View className="flex-row items-center gap-3">
                            <View className="p-1 bg-system-blue rounded">
                                <IconSymbol name={item.icon as any} size={18} color={colors.system.white} />
                            </View>
                            <BaseText type="Body" weight="400" color="system.black">
                                {item.lable}
                            </BaseText>
                        </View>
                        <IconSymbol name="chevron.right" size={14} color={colors.labels.secondary} />
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}
