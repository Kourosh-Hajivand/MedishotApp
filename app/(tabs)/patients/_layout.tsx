import Avatar from "@/components/avatar";
import { BackButton } from "@/components/button/ui/BackButton";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors.shared";
import { useGetPracticeList } from "@/utils/hook";
import { useAuth } from "@/utils/hook/useAuth";
import { loadProfileSelection, useProfileStore } from "@/utils/hook/useProfileStore";
import { Button, ContextMenu, Host, Image, Submenu, Switch } from "@expo/ui/swift-ui";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { BlurView } from "expo-blur";
import { router, Stack } from "expo-router";
import React, { useEffect } from "react";
import { Animated, TouchableOpacity, View } from "react-native";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export const blurValue = new Animated.Value(0);

export default function PatientsLayout() {
    const { data: practiceList } = useGetPracticeList();
    const { logout: handleLogout, profile } = useAuth();
    const { selectedPractice, viewMode, setSelectedPractice, setViewMode, isLoaded, isLoading } = useProfileStore();
    useEffect(() => {
        if (practiceList?.data && practiceList.data.length > 0) {
            loadProfileSelection(practiceList.data);
        }
    }, [practiceList?.data]);

    return (
        <BottomSheetModalProvider>
            <Stack>
                <Stack.Screen
                    name="index"
                    options={{
                        headerTitle: "Patients",
                        headerLargeTitle: true,
                        headerTransparent: true,
                        headerShadowVisible: true,
                        headerRight: () => (
                            <Host style={{ width: 30, height: 50 }}>
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
                                        <View>
                                            <Host style={{ width: 35, height: 35 }}>
                                                <Image systemName="ellipsis" />
                                            </Host>
                                        </View>
                                    </ContextMenu.Trigger>
                                </ContextMenu>
                            </Host>
                        ),
                        headerLeft: () => (
                            // <Switch key={index} label={practice.name} variant="switch" value={selectedProfile === "practice" && selectedPractice?.id === practice.id} onValueChange={() => setSelectedProfile("practice", practice)} />
                            <Host style={{ width: 35 }}>
                                <ContextMenu activationMethod="longPress">
                                    <ContextMenu.Items>
                                        {practiceList?.data.map((practice, index) =>
                                            practice.role === "owner" ? (
                                                <Submenu button={<Button>{practice.name}</Button>}>
                                                    <Switch
                                                        label={`View as Owner`}
                                                        variant="switch"
                                                        value={viewMode === "owner" && selectedPractice?.id === practice.id}
                                                        onValueChange={() => {
                                                            setSelectedPractice(practice);
                                                            setViewMode("owner");
                                                        }}
                                                    />
                                                    <Switch
                                                        label={`View as Doctor`}
                                                        variant="switch"
                                                        value={viewMode === "doctor" && selectedPractice?.id === practice.id}
                                                        onValueChange={() => {
                                                            setSelectedPractice(practice);
                                                            setViewMode("doctor");
                                                        }}
                                                    />
                                                </Submenu>
                                            ) : (
                                                <Switch
                                                    key={index}
                                                    label={practice.name}
                                                    variant="switch"
                                                    value={selectedPractice?.id === practice.id}
                                                    onValueChange={() => {
                                                        setSelectedPractice(practice);
                                                        setViewMode("doctor");
                                                    }}
                                                />
                                            ),
                                        )}
                                    </ContextMenu.Items>

                                    <ContextMenu.Trigger>
                                        <View style={{ width: 35, backgroundColor: "white", borderRadius: 100 }} className="flex-row items-center gap-2">
                                            <Avatar name={viewMode === "doctor" ? (profile?.first_name ?? "") : (selectedPractice?.name ?? "")} size={35} />
                                        </View>
                                    </ContextMenu.Trigger>
                                </ContextMenu>
                            </Host>
                        ),
                        headerSearchBarOptions: {
                            placeholder: "Search patients",
                            // allowToolbarIntegration: true,
                            onChangeText: (event) => {
                                router.setParams({
                                    q: event.nativeEvent.text,
                                });
                            },
                        },
                    }}
                />

                <Stack.Screen
                    name="[id]"
                    options={{
                        headerTransparent: true,
                        headerTitleAlign: "center",
                        headerTintColor: "#000",
                        title: "",
                        headerRight: () => (
                            <TouchableOpacity className="flex-row px-2  justify-center items-center ">
                                <IconSymbol name="square.and.pencil" size={24} color={colors.system.blue} />
                            </TouchableOpacity>
                        ),
                        headerLeft: () => <BackButton onPress={() => router.back()} />,
                        headerBackground: () => <AnimatedBlurBackground />,
                    }}
                />
            </Stack>
        </BottomSheetModalProvider>
    );
}

function AnimatedBlurBackground() {
    const animatedIntensity = blurValue.interpolate({
        inputRange: [60, 140],
        outputRange: [0, 80],
        extrapolate: "clamp",
    });

    return (
        <AnimatedBlurView
            intensity={animatedIntensity as any}
            tint="light"
            style={{
                flex: 1,

                borderBottomColor: "rgba(0,0,0,0.15)",
            }}
        />
    );
}
