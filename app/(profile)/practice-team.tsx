import { BaseText } from "@/components";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol.ios";
import { headerHeight } from "@/constants/theme";
import colors from "@/theme/colors";
import { useGetPracticeList, useGetPracticeMembers, useRemoveMember, useTransferOwnership } from "@/utils/hook";
import { useAuth } from "@/utils/hook/useAuth";
import { TransferOwnershipDto } from "@/utils/service/models/RequestModels";
import { Practice } from "@/utils/service/models/ResponseModels";
import { Button, ContextMenu, Host, Switch } from "@expo/ui/swift-ui";
import { router, useNavigation } from "expo-router";
import React, { useLayoutEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PracticeTeamScreen() {
    const insets = useSafeAreaInsets();
    const { profile, isAuthenticated } = useAuth();
    const { data: practiceList } = useGetPracticeList(isAuthenticated === true);
    const [selectedPractice, setSelectedPractice] = useState<Practice | undefined>(practiceList?.data[0]);
    const { data: practiceMembers } = useGetPracticeMembers(selectedPractice?.id ?? 0, isAuthenticated === true);
    const navigation = useNavigation();
    console.log("====================================");
    console.log(practiceMembers?.data);
    console.log("====================================");
    const { mutate: transferOwnership } = useTransferOwnership(
        () => {},
        (error: Error) => {
            Alert.alert("Error", error?.message || "An error occurred while transferring ownership.");
        },
    );
    const { mutate: removeMember } = useRemoveMember(
        () => {},
        (error: Error) => {
            Alert.alert("Error", error?.message || "An error occurred while removing the member.");
        },
    );
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
    const handleRemoveMember = (practiceId: number, memberId: number) => {
        Alert.alert("Remove This Doctor", "By taking this action this doctor will be removed from your practise.", [
            {
                text: "Cancel",
                style: "cancel",
                isPreferred: true,
            },
            {
                text: "Remove",
                style: "destructive",

                onPress: () => removeMember({ practiceId: practiceId, memberId: memberId }),
            },
        ]);
    };
    const handleTransferOwnership = (practiceId: number, memberId: number) => {
        Alert.alert("Transfer Ownership", "Are you sure you want to transfer ownership of this practice to this member?", [
            {
                text: "Cancel",
                style: "cancel",
                isPreferred: true,
            },
            {
                text: "Transfer",
                style: "default",
                onPress: () => transferOwnership({ practiceId: practiceId, data: { new_owner_id: memberId } as TransferOwnershipDto }),
            },
        ]);
    };
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
            <View className="pt-0 border-t border-system-gray5">
                {practiceMembers?.data?.members?.map((member, index) => (
                    <Host style={{ width: "100%", height: 68 }}>
                        <ContextMenu activationMethod="longPress">
                            <ContextMenu.Items>
                                {/* {member.role !== "owner" && ( */}
                                <Button systemImage="person.crop.circle.badge.plus" onPress={() => handleTransferOwnership(selectedPractice?.id ?? 0, member.id)}>
                                    Transfer Ownership
                                </Button>
                                {/* )} */}
                                <Button
                                    systemImage="pencil.and.scribble"
                                    onPress={() =>
                                        router.push({
                                            pathname: "/(modals)/add-practice-member",
                                            params: {
                                                practiceId: selectedPractice?.id,
                                                mode: "edit",
                                                member: JSON.stringify(member),
                                            },
                                        })
                                    }
                                >
                                    Update Member Role
                                </Button>
                                <Button systemImage="trash" role="destructive" onPress={() => handleRemoveMember(selectedPractice?.id ?? 0, member.id)}>
                                    Remove
                                </Button>
                            </ContextMenu.Items>

                            <ContextMenu.Trigger>
                                <TouchableOpacity
                                    disabled={member.status !== "active"}
                                    key={`member-${member.id}`}
                                    className={`flex-row items-center justify-between pl-1 py-2 pr-4 bg-white disabled:opacity-60 ${index !== practiceMembers?.data.members.length - 1 ? "pb-2 border-b border-system-gray5" : ""}`}
                                    onPress={() => {
                                        if (member.status === "active") {
                                            router.push({
                                                pathname: "/practice-member-details",
                                                params: {
                                                    practiceId: selectedPractice?.id,
                                                    memberId: member.id,
                                                },
                                            });
                                        }
                                    }}
                                >
                                    <View className="flex-row items-center gap-2">
                                        <Avatar size={54} rounded={99} name={member.first_name && member.last_name ? `${member.first_name} ${member.last_name}` : member.email} color={member.color} haveRing />
                                        <View>
                                            <BaseText type="Callout" weight="500" color="system.black">
                                                {member.first_name && member.last_name ? `${member.first_name} ${member.last_name}` : member.email}
                                            </BaseText>
                                            <BaseText type="Footnote" weight="400" color="labels.secondary">
                                                {member.role}
                                            </BaseText>
                                        </View>
                                    </View>
                                    <IconSymbol name="chevron.right" size={14} color={colors.labels.secondary} />
                                </TouchableOpacity>
                            </ContextMenu.Trigger>
                        </ContextMenu>
                    </Host>
                ))}
                {practiceMembers?.data?.invitations?.map((invitation, index) => (
                    <TouchableOpacity disabled={true} key={`invite-${invitation.id}`} className={`flex-row items-center justify-between pl-1 py-2 pr-4 disabled:opacity-60 ${index !== practiceMembers?.data.invitations.length - 1 ? "pb-2 border-b border-system-gray5" : ""}`}>
                        <View className="flex-row items-center gap-2">
                            <Avatar size={54} rounded={99} name={invitation.email} />
                            <View>
                                <BaseText type="Callout" weight="500" color="system.black">
                                    {invitation.email}
                                </BaseText>
                                <BaseText type="Footnote" weight="400" color="labels.secondary">
                                    Pending
                                </BaseText>
                            </View>
                        </View>
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
