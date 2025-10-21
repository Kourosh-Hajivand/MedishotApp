import { Button, ContextMenu, Host, Submenu, Switch } from "@expo/ui/swift-ui";
import { foregroundStyle } from "@expo/ui/swift-ui/modifiers";
import React, { useEffect } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { BaseText } from "@/components/text/BaseText";
import { useGetPracticeList } from "@/utils/hook";
import { useAuth } from "@/utils/hook/useAuth";
import { loadProfileSelection, useProfileStore, validateAndSetDefaultSelection } from "@/utils/hook/useProfileStore";
import { router } from "expo-router";
import Avatar from "../avatar";

export default function HeaderWithMenu() {
    const { logout, profile } = useAuth();
    const { data: practiceList } = useGetPracticeList();
    const { selectedProfile, selectedPractice, setSelectedProfile, isLoaded } = useProfileStore();

    useEffect(() => {
        if (practiceList?.data) {
            loadProfileSelection(practiceList.data);

            validateAndSetDefaultSelection(practiceList.data);
        } else {
            loadProfileSelection();
        }
    }, [practiceList?.data]);

    const handleLogout = () => {
        logout();
        router.replace("/welcome");
    };

    if (!isLoaded) {
        return (
            <View style={styles.headerTop} className="flex-row items-center justify-between flex-1">
                <View style={{ alignSelf: "flex-start" }}>
                    <TouchableOpacity onPress={() => router.push("/(profile)")} delayLongPress={300} activeOpacity={0.7} className="flex-row items-center gap-2 bg-system-gray6 rounded-full px-1 py-1 pr-4">
                        <Avatar name={profile?.first_name ?? ""} size={30} />
                        <BaseText lineBreakMode="tail" numberOfLines={1} type="Body" weight={400} style={{ maxWidth: 200 }} color="labels.secondary">
                            {profile?.first_name} {profile?.last_name}
                        </BaseText>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.headerTop} className="flex-row items-center justify-between flex-1">
            <Host style={{ flex: 1 }}>
                <ContextMenu activationMethod="longPress">
                    <ContextMenu.Items>
                        {/* <Button systemImage="person.crop.circle" disabled onPress={() => {}}>
                            Switch Profile
                        </Button> */}

                        <Switch label={`${profile?.first_name} ${profile?.last_name}`} variant="switch" value={selectedProfile === "profile"} onValueChange={() => setSelectedProfile("profile")} />
                        {practiceList?.data.map((practice, index) => (
                            <Switch key={index} label={practice.name} variant="switch" value={selectedProfile === "practice" && selectedPractice?.id === practice.id} onValueChange={() => setSelectedProfile("practice", practice)} />
                        ))}

                        {/* <Button systemImage="rectangle.portrait.and.arrow.right" role="destructive" onPress={handleLogout}>
                            Logout
                        </Button> */}
                    </ContextMenu.Items>

                    <ContextMenu.Trigger>
                        <View style={{ alignSelf: "flex-start" }}>
                            <TouchableOpacity onPress={() => router.push("/(profile)")} delayLongPress={300} activeOpacity={0.7} className={`flex-row items-center gap-2 bg-system-gray6  px-1 py-1 pr-4 ${selectedProfile === "profile" ? "rounded-full" : "rounded-lg"}`}>
                                <Avatar name={selectedProfile === "profile" ? (profile?.first_name ?? "") : (selectedPractice?.name ?? "")} size={30} rounded={selectedProfile === "profile" ? 99 : 4} />
                                <BaseText lineBreakMode="tail" numberOfLines={1} type="Body" weight={400} style={{ maxWidth: 200 }} color="labels.secondary">
                                    {selectedProfile === "profile" ? `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}` : (selectedPractice?.name ?? "")}
                                </BaseText>
                            </TouchableOpacity>
                        </View>
                    </ContextMenu.Trigger>
                </ContextMenu>
            </Host>

            <Host style={{ width: 50, height: 44 }}>
                <ContextMenu>
                    <ContextMenu.Items>
                        {/* Submenu 1: Sort By */}
                        <Submenu button={<Button systemImage="arrow.up.arrow.down">Sort By</Button>}>
                            <Button systemImage="textformat.abc">Name</Button>
                            <Button systemImage="calendar">Date</Button>
                            <Button systemImage="exclamationmark.triangle">Priority</Button>
                        </Submenu>

                        {/* Submenu 2: Name Order */}
                        <Submenu button={<Button systemImage="textformat">Name Order</Button>}>
                            <Button systemImage="arrow.up">A → Z</Button>
                            <Button systemImage="arrow.down">Z → A</Button>
                        </Submenu>
                    </ContextMenu.Items>

                    <ContextMenu.Trigger>
                        <Button systemImage="ellipsis.circle.fill" variant="plain" controlSize="large" modifiers={[foregroundStyle("labels.primary")]} />
                    </ContextMenu.Trigger>
                </ContextMenu>
            </Host>
        </View>
    );
}

const styles = StyleSheet.create({
    headerTop: {},
    selectedView: {
        backgroundColor: "#f0f0f0",
        padding: 8,
        borderRadius: 8,
        marginTop: 8,
        alignItems: "center",
    },
});
