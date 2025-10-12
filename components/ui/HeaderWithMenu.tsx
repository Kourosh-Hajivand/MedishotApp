import colors from "@/theme/colors";
import { Button, ContextMenu, Host, Submenu, Text, VStack } from "@expo/ui/swift-ui";
import { foregroundStyle } from "@expo/ui/swift-ui/modifiers";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { BaseText } from "@/components/text/BaseText";
import { useAuth } from "@/utils/hook/useAuth";
import { router } from "expo-router";
import Avatar from "../avatar";

export default function HeaderWithMenu() {
    const { logout, profile } = useAuth();
    return (
        <View style={styles.headerTop} className="flex-row items-center justify-between flex-1">
            <TouchableOpacity onPressIn={() => router.push("/(profile)")} style={styles.userContainer} className="w-fit flex-row items-center gap-2 self-start rounded-full px-1 py-1 pr-4" onPress={() => {}}>
                <Avatar name={profile?.first_name ?? ""} size={30} />
                <BaseText lineBreakMode="tail" numberOfLines={1} type="Body" weight={400} style={{ maxWidth: 200 }} color="labels.secondary">
                    {profile?.first_name} {profile?.last_name}
                </BaseText>
            </TouchableOpacity>

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

                        {/* Divider-like spacer */}
                        <VStack spacing={4}>
                            <Text size={10} modifiers={[foregroundStyle("gray")]}>
                                Actions
                            </Text>
                        </VStack>

                        {/* Logout */}
                        <Button systemImage="rectangle.portrait.and.arrow.right" role="destructive" onPress={logout}>
                            Logout
                        </Button>
                    </ContextMenu.Items>

                    <ContextMenu.Trigger>
                        <Button systemImage="ellipsis.circle.fill" variant="plain" modifiers={[foregroundStyle("labels.secondary")]} />
                    </ContextMenu.Trigger>
                </ContextMenu>
            </Host>
        </View>
    );
}

const styles = StyleSheet.create({
    headerTop: {},
    userContainer: {
        backgroundColor: colors.system.gray6,
    },
});
