import { BaseText } from "@/components";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol.ios";
import { headerHeight } from "@/constants/theme";
import colors from "@/theme/colors";
import { useGetPracticeList, useGetPracticeMembers } from "@/utils/hook";
import { useAuth } from "@/utils/hook/useAuth";
import { Practice } from "@/utils/service/models/ResponseModels";
import { Button, ContextMenu, Host, Switch } from "@expo/ui/swift-ui";
import { router, useNavigation } from "expo-router";
import React, { useLayoutEffect, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PracticeTeamScreen() {
    const insets = useSafeAreaInsets();
    const { profile, isAuthenticated } = useAuth();
    const { data: practiceList } = useGetPracticeList(isAuthenticated === true);
    const [selectedPractice, setSelectedPractice] = useState<Practice | undefined>(practiceList?.data[0]);
    const { data: practiceMembers } = useGetPracticeMembers(selectedPractice?.id ?? 0, isAuthenticated === true);
    console.log("practiceMembers", practiceMembers);
    const navigation = useNavigation();
    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <Host style={{ width: 35, height: 35 }}>
                    <Button
                        systemImage="plus"
                        onPress={() =>
                            router.push({
                                pathname: "/(modals)/add-practice-member",
                                params: { practiceId: selectedPractice?.id },
                            })
                        }
                    />
                </Host>
            ),
        });
    }, [navigation]);
    return (
        <ScrollView style={[styles.container, { paddingTop: insets.top + headerHeight }]} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
            <Host style={{ width: "100%", height: 61 }}>
                <ContextMenu activationMethod="longPress">
                    <ContextMenu.Items>
                        {practiceList?.data.map((practice, index) => (
                            <Switch
                                key={index}
                                label={"View as " + practice.name}
                                variant="switch"
                                value={selectedPractice ? selectedPractice.id === practice.id : false}
                                onValueChange={() => {
                                    setSelectedPractice(practice);
                                }}
                            />
                        ))}
                    </ContextMenu.Items>

                    <ContextMenu.Trigger>
                        <View className={`w-full flex-row items-center justify-between bg-system-gray6 p-1 pr-[27px] rounded-[12px]`}>
                            <View className="flex-row items-center gap-2">
                                <Avatar size={54} rounded={8} name={selectedPractice?.name ?? ""} />
                                <View className="flex-1 ">
                                    <BaseText type="Title3" weight="500" color="system.black">
                                        {selectedPractice?.name}
                                    </BaseText>
                                    <BaseText type="Callout" weight="400" color="labels.secondary" className="capitalize">
                                        {selectedPractice?.type}
                                    </BaseText>
                                </View>
                            </View>
                            <View className="flex-1">
                                <IconSymbol name="chevron.up.chevron.down" size={14} color={colors.labels.secondary} />
                            </View>
                        </View>
                    </ContextMenu.Trigger>
                </ContextMenu>
            </Host>
            <View className="pt-2 border-t border-system-gray5">
                {practiceMembers?.data.map((member, index) => (
                    <TouchableOpacity key={member.id} className={`flex-row items-center justify-between pl-1 pr-4 ${index !== practiceMembers?.data.length - 1 ? "pb-2 border-b border-system-gray5" : ""}`}>
                        <View className="flex-row items-center gap-2">
                            <Avatar size={54} rounded={99} name={member.first_name + " " + member.last_name} imageUrl={member.image?.url} />
                            <View>
                                <BaseText type="Callout" weight="500" color="system.black">
                                    {member.first_name} {member.last_name}
                                </BaseText>
                                <BaseText type="Footnote" weight="400" color="labels.secondary">
                                    {member.role}
                                </BaseText>
                            </View>
                        </View>
                        <IconSymbol name="chevron.right" size={14} color={colors.labels.secondary} />
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        gap: 12,
    },
    description: {
        marginTop: 8,
    },
});
