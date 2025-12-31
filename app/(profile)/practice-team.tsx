import { BaseText } from "@/components";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol.ios";
import { headerHeight } from "@/constants/theme";
import themeColors from "@/theme/colors";
import { useGetPracticeList, useGetPracticeMembers, useRemoveMember, useTransferOwnership } from "@/utils/hook";
import { useAuth } from "@/utils/hook/useAuth";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { TransferOwnershipDto } from "@/utils/service/models/RequestModels";
import { Button, ContextMenu, Host, Switch } from "@expo/ui/swift-ui";
import { router, useNavigation } from "expo-router";
import React, { useEffect, useLayoutEffect } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PracticeTeamScreen() {
    const insets = useSafeAreaInsets();
    const { profile, isAuthenticated } = useAuth();
    const { data: practiceList } = useGetPracticeList(isAuthenticated === true);
    const { selectedPractice, setSelectedPractice } = useProfileStore();
    const { data: practiceMembers } = useGetPracticeMembers(selectedPractice?.id ?? 0, isAuthenticated === true && !!selectedPractice?.id);
    const navigation = useNavigation();
    console.log("practiceMembers?.data====================================");
    console.log(practiceMembers?.data);
    console.log("====================================");

    // Set default practice if none is selected
    useEffect(() => {
        if (!selectedPractice && practiceList?.data && practiceList.data.length > 0) {
            setSelectedPractice(practiceList.data[0]);
        }
    }, [selectedPractice, practiceList?.data, setSelectedPractice]);
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
                <Host style={{ width: 105, height: 35 }}>
                    <Button
                        systemImage="plus"
                        onPress={() =>
                            router.push({
                                pathname: "/(modals)/add-practice-member",
                                params: { practiceId: selectedPractice?.id },
                            })
                        }
                    >
                        Member
                    </Button>
                </Host>
            ),
        });
    }, [navigation, selectedPractice?.id]);
    const handleRemoveMember = (practiceId: number, memberId: string | number) => {
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
    const handleTransferOwnership = (practiceId: number, memberId: string | number) => {
        // Extract numeric ID from "user:1" format if needed
        const numericId = typeof memberId === "string" ? parseInt(memberId.split(":")[1] || memberId, 10) : memberId;
        Alert.alert("Transfer Ownership", "Are you sure you want to transfer ownership of this practice to this member?", [
            {
                text: "Cancel",
                style: "cancel",
                isPreferred: true,
            },
            {
                text: "Transfer",
                style: "default",
                onPress: () => transferOwnership({ practiceId: practiceId, data: { new_owner_id: numericId } as TransferOwnershipDto }),
            },
        ]);
    };
    console.log("==============practiceMembers?.datapracticeMembers?.datapracticeMembers?.data======================");
    console.log(practiceMembers?.data);
    console.log("====================================");
    return (
        <ScrollView style={[styles.container, { paddingTop: insets.top + headerHeight }]} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
            <Host style={{ width: "100%", height: 68 }}>
                <ContextMenu activationMethod="longPress">
                    <ContextMenu.Items>
                        {practiceList?.data.map((practice, index) => (
                            <Switch
                                key={index}
                                label={practice.name}
                                variant="switch"
                                value={selectedPractice?.id === practice.id}
                                onValueChange={() => {
                                    setSelectedPractice(practice);
                                }}
                            />
                        ))}
                    </ContextMenu.Items>

                    <ContextMenu.Trigger>
                        <View className={`w-full flex-row items-center justify-between bg-system-gray6 p-1 pr-[27px] rounded-[12px]`}>
                            <View className="flex-row items-center gap-2">
                                <Avatar size={60} rounded={8} name={selectedPractice?.name ?? ""} imageUrl={selectedPractice?.image?.url} />
                                <View className="flex-1 ">
                                    <BaseText type="Title3" weight="500" color="system.black" lineBreakMode="tail" numberOfLines={1}>
                                        {selectedPractice?.name}
                                    </BaseText>
                                    <BaseText type="Callout" weight="400" color="labels.secondary" style={{ textTransform: "capitalize" }}>
                                        {selectedPractice?.role}
                                    </BaseText>
                                </View>
                            </View>
                            <View className="flex-1">
                                <IconSymbol name="chevron.up.chevron.down" size={14} color={themeColors.labels.secondary} />
                            </View>
                        </View>
                    </ContextMenu.Trigger>
                </ContextMenu>
            </Host>
            <View className="pt-0 border-t border-system-gray5">
                {practiceMembers?.data?.map((member, index) => (
                    <Host key={`member-${member.id}`} style={{ width: "100%", height: 68 }}>
                        <ContextMenu activationMethod="longPress">
                            <ContextMenu.Items>
                                {/* {member.role !== "owner" && (
                                    <Button systemImage="person.crop.circle.badge.plus" onPress={() => handleTransferOwnership(selectedPractice?.id ?? 0, member.id)}>
                                        Transfer Ownership
                                    </Button>
                                )} */}
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
                                    className={`flex-row items-center justify-between pl-1 py-2 pr-4 bg-white disabled:opacity-60 ${index !== (practiceMembers?.data?.length ?? 0) - 1 ? "pb-2 border-b border-system-gray5" : ""}`}
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
                                        <Avatar size={54} imageUrl={member.image?.url} rounded={99} name={member.first_name && member.last_name ? `${member.first_name} ${member.last_name}` : member.email} color={member.color} haveRing />
                                        <View>
                                            <BaseText type="Callout" weight="500" color="system.black">
                                                {member.first_name && member.last_name ? `${member.first_name} ${member.last_name}` : member.email}
                                            </BaseText>
                                            <BaseText type="Footnote" weight="400" color="labels.secondary" className="capitalize">
                                                {member.role}
                                            </BaseText>
                                        </View>
                                    </View>
                                    <IconSymbol name="chevron.right" size={14} color={themeColors.labels.secondary} />
                                </TouchableOpacity>
                            </ContextMenu.Trigger>
                        </ContextMenu>
                    </Host>
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
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 12,
    },
    description: {
        marginTop: 8,
    },
});
