import { BaseText } from "@/components";
import Avatar from "@/components/avatar";
import { useGetPracticeList, useGetPracticeMembers } from "@/utils/hook";
import { useAuth } from "@/utils/hook/useAuth";
import { loadProfileSelection, useProfileStore } from "@/utils/hook/useProfileStore";
import { Button, ContextMenu, Host, Image, Submenu, Switch } from "@expo/ui/swift-ui";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { BlurView } from "expo-blur";
import { router, Stack, useSegments } from "expo-router";
import React, { useEffect, useMemo } from "react";
import { Animated, TouchableOpacity, View } from "react-native";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export const blurValue = new Animated.Value(0);

export default function PatientsLayout() {
    const { logout: handleLogout, isAuthenticated, profile } = useAuth();
    const { data: practiceList, isLoading: isPracticeListLoading } = useGetPracticeList(isAuthenticated === true);
    const { selectedPractice, setSelectedPractice, selectedDoctor, setSelectedDoctor, isLoaded, isLoading } = useProfileStore();
    const segments = useSegments();

    useEffect(() => {
        const isInAuthFlow = segments.some((segment) => segment === "(auth)");

        if (isAuthenticated === true && profile && !isPracticeListLoading && !isInAuthFlow) {
            if (!practiceList?.data || practiceList.data.length === 0) {
                router.replace("/(auth)/select-role");
            }
        }
    }, [isAuthenticated, profile, practiceList, isPracticeListLoading, segments]);
    const { data: practiceMembers } = useGetPracticeMembers(selectedPractice?.id ?? 0, isAuthenticated === true && !!selectedPractice?.id);

    // Filter doctors from members
    const doctors = useMemo(() => {
        return practiceMembers?.data?.filter((member) => member.role === "doctor" || member.role === "owner") ?? [];
    }, [practiceMembers?.data]);

    // Check if user can see doctor filter (only owner or staff)
    const canSeeDoctorFilter = useMemo(() => {
        return selectedPractice?.role === "owner" || selectedPractice?.role === "staff";
    }, [selectedPractice?.role]);

    // Calculate width based on practice name length
    const headerButtonWidth = useMemo(() => {
        const practiceName = selectedPractice?.name ?? "";
        const characterCount = practiceName.length;

        // Base width: avatar (35px) + gap (8px) + padding (16px on each side = 32px)
        const baseWidth = 35 + 8 + 8;

        // Approximate width per character for Body font (around 8-9px per character)
        const charWidth = 8.5;
        const textWidth = characterCount * charWidth;

        // Total width
        const totalWidth = baseWidth + textWidth;

        // Clamp between minimum (100) and maximum (220)
        return Math.max(100, Math.min(220, totalWidth));
    }, [selectedPractice?.name]);

    // Load profile selection when practice list is available
    useEffect(() => {
        if (practiceList?.data && practiceList.data.length > 0 && isAuthenticated === true) {
            const currentState = useProfileStore.getState();
            if (!currentState.isLoaded || !currentState.selectedPractice) {
                loadProfileSelection(practiceList.data);
            } else {
                const isValidPractice = practiceList.data.some((p) => p.id === currentState.selectedPractice?.id);
                if (!isValidPractice) {
                    loadProfileSelection(practiceList.data);
                }
            }
        }
    }, [practiceList?.data?.length, isAuthenticated, isLoaded, selectedPractice?.id]);

    return (
        <BottomSheetModalProvider>
            <Stack>
                <Stack.Screen
                    name="index"
                    options={{
                        headerTitle: "Patients",
                        headerLargeTitle: true,
                        headerTransparent: true,
                        // headerTransparent: false,
                        headerShadowVisible: true,
                        headerRight: () => (
                            <Host style={{ width: 30, height: 50 }}>
                                <ContextMenu>
                                    <ContextMenu.Items>
                                        {/* Submenu 1: Sort By */}
                                        <Submenu button={<Button systemImage="arrow.up.arrow.down">Sort By</Button>}>
                                            <Button
                                                systemImage="textformat.abc"
                                                onPress={() => {
                                                    router.setParams({ sortBy: "name" });
                                                }}
                                            >
                                                Name
                                            </Button>
                                            <Button
                                                systemImage="calendar"
                                                onPress={() => {
                                                    router.setParams({ sortBy: "date" });
                                                }}
                                            >
                                                Date
                                            </Button>
                                        </Submenu>

                                        {/* Submenu 2: Name Order */}
                                        <Submenu button={<Button systemImage="textformat">Name Order</Button>}>
                                            <Button
                                                systemImage="arrow.up"
                                                onPress={() => {
                                                    router.setParams({ nameOrder: "asc" });
                                                }}
                                            >
                                                A → Z
                                            </Button>
                                            <Button
                                                systemImage="arrow.down"
                                                onPress={() => {
                                                    router.setParams({ nameOrder: "desc" });
                                                }}
                                            >
                                                Z → A
                                            </Button>
                                        </Submenu>
                                        {canSeeDoctorFilter && (
                                            <Submenu button={<Button systemImage="line.3.horizontal.decrease">Doctor Filter</Button>}>
                                                <Switch
                                                    label="All"
                                                    variant="switch"
                                                    value={selectedDoctor === null}
                                                    onValueChange={(value) => {
                                                        if (value) {
                                                            setSelectedDoctor(null);
                                                        }
                                                    }}
                                                />
                                                {doctors.length > 0 ? (
                                                    doctors.map((doctor) => (
                                                        <Switch
                                                            key={String(doctor.id)}
                                                            label={doctor.first_name && doctor.last_name ? `${doctor.first_name} ${doctor.last_name}` : doctor.email}
                                                            variant="switch"
                                                            value={selectedDoctor === String(doctor.id)}
                                                            onValueChange={(value) => {
                                                                if (value) {
                                                                    setSelectedDoctor(String(doctor.id));
                                                                }
                                                            }}
                                                        />
                                                    ))
                                                ) : (
                                                    <Button disabled>No doctors found</Button>
                                                )}
                                            </Submenu>
                                        )}
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
                            <Host style={{ width: headerButtonWidth }}>
                                <ContextMenu activationMethod="longPress">
                                    <ContextMenu.Items>
                                        {practiceList?.data
                                            ?.slice()
                                            .sort((a, b) => {
                                                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                                                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                                                return dateB - dateA;
                                            })
                                            .map((practice, index) => (
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
                                        <Button systemImage="plus" onPress={() => router.push("/(auth)/select-role")}>Create a Practice</Button>
                                    </ContextMenu.Items>

                                    <ContextMenu.Trigger>
                                        <TouchableOpacity onPress={() => router.push("/(profile)")} style={{ width: headerButtonWidth, backgroundColor: "white", borderRadius: 100 }} className="flex-row  bg-white items-center gap-2 overflow-hidden pr-2">
                                            <Avatar name={selectedPractice?.name ?? ""} size={35} imageUrl={selectedPractice?.image?.url} />
                                            <BaseText lineBreakMode="tail" numberOfLines={1} type="Body" weight="400" color="labels.secondary" className="line-clamp-1 truncate">
                                                {selectedPractice?.name}
                                            </BaseText>
                                        </TouchableOpacity>
                                    </ContextMenu.Trigger>
                                </ContextMenu>
                            </Host>
                        ),
                        headerSearchBarOptions: {
                            placeholder: "Search patients",
                            allowToolbarIntegration: false,

                            onChangeText: (event) => {
                                router.setParams({
                                    q: event.nativeEvent.text,
                                });
                            },
                        },
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

                borderBottomColor: "rgba(0,0,0,0.1)",
            }}
        />
    );
}
