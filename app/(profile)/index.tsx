import { BaseText } from "@/components";
import { ErrorState } from "@/components/ErrorState";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import themeColors from "@/theme/colors";
import { useGetPracticeList, useGetPracticeMembers } from "@/utils/hook";
import { useAuth } from "@/utils/hook/useAuth";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { Button, ContextMenu, Host, Image, Switch } from "@expo/ui/swift-ui";
import { router, useNavigation } from "expo-router";
import React, { useEffect, useLayoutEffect } from "react";
import { TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IconSymbolName = "person.circle.fill" | "chart.bar.xaxis" | "person.2.fill" | "printer.fill" | "dollarsign.circle.fill" | "bell.fill" | "tray.fill";
export default function Index() {
    const insets = useSafeAreaInsets();
    const { profile, isAuthenticated, logout: handleLogout } = useAuth();
    const { data: practiceList, error: practiceListError, refetch: refetchPracticeList, isLoading: isPracticeListLoading } = useGetPracticeList(isAuthenticated === true);
    const { setSelectedPractice, selectedPractice } = useProfileStore();
    const { data: practiceMembers } = useGetPracticeMembers(selectedPractice?.id ?? 0, isAuthenticated === true && !!selectedPractice?.id);

    // Get current user's role in the selected practice
    const currentUserRole = React.useMemo(() => {
        if (!selectedPractice || !practiceMembers?.data || !profile?.email) {
            return selectedPractice?.role; // Fallback to practice role
        }

        // Find current user in practice members by email
        const currentMember = practiceMembers.data.find((member) => member.email === profile.email);
        return currentMember?.role || selectedPractice.role;
    }, [selectedPractice, practiceMembers?.data, profile?.email]);

    const navigation = useNavigation();

    // Force view to "practice" (no switching back to own profile)
    useEffect(() => {
        const firstPractice = practiceList?.data?.[0];
        if (!firstPractice) return;

        if (!selectedPractice) {
            setSelectedPractice(firstPractice);
        }
    }, [practiceList?.data, selectedPractice, setSelectedPractice]);

    const handleEditPress = React.useCallback(() => {
        if (selectedPractice?.role === "owner" && selectedPractice) {
            router.push({
                pathname: "/(modals)/edit-practice",
                params: { practice: JSON.stringify(selectedPractice) },
            });
        }
    }, [selectedPractice]);

    // Check if edit button should be shown
    const canEdit = selectedPractice?.role === "owner";

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <Host style={{ width: 30, height: 50 }}>
                    <ContextMenu>
                        <ContextMenu.Items>
                            <Button systemImage="plus" onPress={() => router.push("/(auth)/select-role")}>
                                Add Practice
                            </Button>
                            {canEdit && (
                                <Button systemImage="square.and.pencil" onPress={handleEditPress}>
                                    Edit Practice
                                </Button>
                            )}
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
    }, [navigation, handleLogout, selectedPractice, canEdit, handleEditPress]);
    // Filter menu items based on user role
    const filteredMenuItems = React.useMemo(() => {
        const allMenuItems: { lable: string; icon: IconSymbolName; href: string; roles?: string[] }[] = [
            { lable: "Personal Profile", icon: "person.circle.fill", href: "/profile-detail" },
            { lable: "Practice Overview", icon: "chart.bar.xaxis", href: "/practice-overview", roles: ["owner", "admin"] },
            { lable: "Practice Team", icon: "person.2.fill", href: "/practice-team", roles: ["owner", "admin"] },
            { lable: "Print Information", icon: "printer.fill", href: "/print-information", roles: ["owner", "admin"] },
            { lable: "Subscription", icon: "dollarsign.circle.fill", href: "/subscription", roles: ["owner", "admin"] },
            // { lable: "Notification", icon: "bell.fill", href: "/notification" },
            { lable: "Archive", icon: "tray.fill", href: "/archive" },
        ];

        const userRole = currentUserRole;

        // staff (admin) can see: Personal Profile, Practice Team, Notification, Archive
        if (userRole === "admin") {
            return allMenuItems.filter((item) => item.lable === "Personal Profile" || item.lable === "Practice Team" || item.lable === "Notification" || item.lable === "Archive");
        }

        // doctor can see: Personal Profile, Archive, Notification
        if (userRole === "doctor") {
            return allMenuItems.filter((item) => item.lable === "Personal Profile" || item.lable === "Archive" || item.lable === "Notification");
        }

        // owner and others see all items (or items without role restriction)
        return allMenuItems.filter((item) => !item.roles || item.roles.includes(userRole || ""));
    }, [currentUserRole]);

    const menuItems = filteredMenuItems;

    // Show error state if there's an error loading practice list
    if (practiceListError && !isPracticeListLoading) {
        const errorMessage = practiceListError instanceof Error ? practiceListError.message : "Failed to load practices. Please try again.";
        return (
            <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
                <ErrorState
                    title="خطا در بارگذاری Practice List"
                    message={errorMessage}
                    onRetry={() => {
                        refetchPracticeList();
                    }}
                />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white  gap-4" style={{ paddingTop: insets.top + 110 }}>
            <View className="px-4">
                <Host style={{ width: "100%", height: 68 }}>
                    <ContextMenu activationMethod="longPress">
                        <ContextMenu.Items>
                            {practiceList?.data.map((practice) => (
                                <Switch
                                    key={practice.id}
                                    label={practice.name}
                                    color="red"
                                    variant="switch"
                                    value={selectedPractice?.id === practice.id}
                                    onValueChange={() => {
                                        setSelectedPractice(practice);
                                    }}
                                />
                            ))}
                            <Button systemImage="plus" onPress={() => router.push("/(auth)/select-role")}>
                                Create a Practice
                            </Button>
                        </ContextMenu.Items>

                        <ContextMenu.Trigger>
                            <TouchableOpacity
                                disabled={!(selectedPractice?.role === "owner")}
                                className="w-full flex-row items-center justify-between bg-system-gray6 p-1 pr-[27px] rounded-[12px]"
                                onPress={() => {
                                    if (selectedPractice?.role === "owner") {
                                        router.push("/(profile)/practice-detail");
                                    }
                                }}
                            >
                                <View className="flex-row items-center gap-2">
                                    <Avatar size={60} rounded={8} name={selectedPractice?.name ?? ""} imageUrl={selectedPractice?.image?.url} />
                                    <View className="flex-1 ">
                                        <BaseText type="Title3" weight="500" color="system.black" lineBreakMode="tail" numberOfLines={1}>
                                            {selectedPractice?.name ?? ""}
                                        </BaseText>
                                        <BaseText type="Callout" weight="400" color="labels.secondary" className="capitalize">
                                            {selectedPractice?.role === "owner" ? "Owner" : "Member"}
                                        </BaseText>
                                    </View>
                                </View>
                                <View className="flex-1">
                                    <IconSymbol name="chevron.up.chevron.down" size={14} color={themeColors.labels.secondary} />
                                </View>
                            </TouchableOpacity>
                        </ContextMenu.Trigger>
                    </ContextMenu>
                </Host>
            </View>

            <View className="w-full pt-0 border-t border-border">
                <View className="px-4">
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            onPress={() => router.push(item.href as any)}
                            className="flex-row items-center justify-between py-5 pr-4 pl-2"
                            style={{
                                borderBottomWidth: index !== menuItems.length - 1 ? 0.5 : 0,
                                borderBottomColor: themeColors.system.gray5,
                            }}
                        >
                            <View className="flex-row items-center gap-3">
                                <View className="p-1 bg-system-blue rounded-md" style={{ position: "relative" }}>
                                    {/* Shadow clone (reliable cross-platform shadow for the glyph itself) */}
                                    <View style={{ position: "absolute", left: 3.5, top: 5 }}>
                                        <IconSymbol name={item.icon as any} size={18} color={"rgba(0,0,0,0.25)"} />
                                    </View>

                                    {/* Main icon */}
                                    <IconSymbol name={item.icon as any} size={18} color={themeColors.system.white} />
                                </View>
                                <BaseText type="Body" weight="400" color="system.black">
                                    {item.lable}
                                </BaseText>
                            </View>
                            <IconSymbol name="chevron.right" size={14} color={themeColors.labels.secondary} />
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
    );
}
