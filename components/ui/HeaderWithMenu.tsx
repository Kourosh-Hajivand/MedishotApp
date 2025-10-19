import { Button, ContextMenu, Host, Submenu } from "@expo/ui/swift-ui";
import { foregroundStyle } from "@expo/ui/swift-ui/modifiers";
import React, { useRef } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { BaseText } from "@/components/text/BaseText";
import { useAuth } from "@/utils/hook/useAuth";
import { router } from "expo-router";
import Avatar from "../avatar";

export default function HeaderWithMenu() {
    const { logout, profile } = useAuth();
    const contextMenuRef = useRef<any>(null);

    const handleLogout = () => {
        logout();
        router.replace("/welcome");
    };

    return (
        <View style={styles.headerTop} className="flex-row items-center justify-between flex-1">
            {/* <TouchableOpacity onPressIn={() => router.push("/(profile)")} style={styles.userContainer} className="w-fit flex-row items-center gap-2 self-start rounded-full px-1 py-1 pr-4" onPress={() => {}}>
                <Avatar name={profile?.first_name ?? ""} size={30} />
                <BaseText lineBreakMode="tail" numberOfLines={1} type="Body" weight={400} style={{ maxWidth: 200 }} color="labels.secondary">
                    {profile?.first_name} {profile?.last_name}
                </BaseText>
            </TouchableOpacity> */}

            <Host style={{ flex: 1 }}>
                <ContextMenu activationMethod="longPress">
                    <ContextMenu.Items>
                        <Button systemImage="person.crop.circle" disabled onPress={() => {}}>
                            Switch Profile
                        </Button>
                        <Button systemImage="person.crop.circle" onPress={() => {}}>
                            Personal Account
                        </Button>

                        <Button systemImage="briefcase" onPress={() => {}}>
                            Work Account
                        </Button>

                        <Button systemImage="rectangle.portrait.and.arrow.right" role="destructive" onPress={handleLogout}>
                            Logout
                        </Button>
                    </ContextMenu.Items>

                    <ContextMenu.Trigger>
                        <View style={{ alignSelf: "flex-start" }}>
                            <TouchableOpacity onPress={() => router.push("/(profile)")} delayLongPress={300} activeOpacity={0.7} className="flex-row items-center gap-2 bg-system-gray6 rounded-full px-1 py-1 pr-4">
                                <Avatar name={profile?.first_name ?? ""} size={30} />
                                <BaseText lineBreakMode="tail" numberOfLines={1} type="Body" weight={400} style={{ maxWidth: 200 }} color="labels.secondary">
                                    {profile?.first_name} {profile?.last_name}
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
});
