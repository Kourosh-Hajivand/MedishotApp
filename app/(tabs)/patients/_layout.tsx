import { BaseText, ErrorState } from "@/components";
import Avatar from "@/components/avatar";
import { useGetPatients, useGetPracticeList, useGetPracticeMembers } from "@/utils/hook";
import { useAuth } from "@/utils/hook/useAuth";
import { loadProfileSelection, useProfileStore } from "@/utils/hook/useProfileStore";
import { Button, ContextMenu, Host, Image, Submenu, Switch } from "@expo/ui/swift-ui";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { BlurView } from "expo-blur";
import { router, Stack } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import { Animated, TouchableOpacity, View } from "react-native";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export const blurValue = new Animated.Value(0);

const MODAL_PUSH_DELAY_MS = 450;

export default function PatientsLayout() {
    const { logout: handleLogout, isAuthenticated, profile, isProfileLoading } = useAuth();
    const { data: practiceList, isLoading: isPracticeListLoading, error: practiceListError, refetch: refetchPracticeList } = useGetPracticeList(isAuthenticated === true);
    const { selectedPractice, setSelectedPractice, selectedDoctor, setSelectedDoctor, isLoaded, isLoading } = useProfileStore();

    const hasIncompleteProfile = !!profile && (!profile.first_name || !profile.last_name) && !isProfileLoading;
    // Consider practice list empty if: no data and not loading
    // If there's an error, we'll still allow modal navigation (user can create practice)
    const hasNoPractice = !practiceList?.data?.length && !isPracticeListLoading;

    const hasPushedCompleteProfileModal = useRef(false);
    const hasPushedPracticeModal = useRef(false);

    useEffect(() => {
        if (!isAuthenticated || isProfileLoading) return;
        if (!profile || (profile.first_name && profile.last_name)) return;
        if (hasPushedCompleteProfileModal.current) return;
        hasPushedCompleteProfileModal.current = true;
        const id = setTimeout(() => {
            router.push({ pathname: "/(auth)/completeProfile", params: { requireCompleteProfile: "1" } });
        }, MODAL_PUSH_DELAY_MS);
        return () => clearTimeout(id);
    }, [isAuthenticated, profile, isProfileLoading]);

    useEffect(() => {
        if (!isAuthenticated || !profile || isProfileLoading || hasIncompleteProfile) return;
        // Don't push modal if practice list is still loading or if we already have practices
        if (isPracticeListLoading) return;
        if (practiceList?.data && practiceList.data.length > 0) return;
        // Even if there's an error, we should still allow user to create practice
        // But we'll show the error state separately
        if (hasPushedPracticeModal.current) return;
        hasPushedPracticeModal.current = true;
        const id = setTimeout(() => {
            router.push({ pathname: "/(auth)/select-role", params: { requirePractice: "1" } });
        }, MODAL_PUSH_DELAY_MS);
        return () => clearTimeout(id);
    }, [isAuthenticated, profile, practiceList, isPracticeListLoading, isProfileLoading, hasIncompleteProfile]);
    const { data: practiceMembers } = useGetPracticeMembers(selectedPractice?.id ?? 0, isAuthenticated === true && !!selectedPractice?.id);
    const { data: patientsData } = useGetPatients(selectedPractice?.id, { per_page: 1 });

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

    // Show error state if practice list fails
    // Show blocking error only if user has practices (meaning error is about loading, not about having none)
    // If no practices, allow modal to open (user can create practice)
    const shouldShowError = practiceListError && !isPracticeListLoading && !hasIncompleteProfile && profile && profile.first_name && profile.last_name;
    const hasPractices = practiceList?.data && practiceList.data.length > 0;
    const shouldShowBlockingError = shouldShowError && hasPractices;

    // If there's an error and user has practices, show blocking error state
    if (shouldShowBlockingError) {
        const errorMessage = practiceListError instanceof Error ? practiceListError.message : "Failed to load practices. Please try again.";
        // Ensure service name is in the message
        const displayMessage = errorMessage.includes("[Practice List API]") ? errorMessage : `[Practice List API] ${errorMessage}`;

        return (
            <BottomSheetModalProvider>
                <ErrorState
                    title="خطا در بارگذاری Practice List"
                    message={displayMessage}
                    onRetry={() => {
                        refetchPracticeList();
                    }}
                />
            </BottomSheetModalProvider>
        );
    }

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
                        headerRight: () =>
                            hasIncompleteProfile || hasNoPractice ? (
                                <Host style={{ width: 120, height: 35 }}>
                                    <Button systemImage="rectangle.portrait.and.arrow.right" role="destructive" onPress={handleLogout}>
                                        Logout
                                    </Button>
                                </Host>
                            ) : (
                                <Host style={{ width: 30, height: 50 }}>
                                    <ContextMenu>
                                        <ContextMenu.Items>
                                            <Submenu button={<Button systemImage="arrow.up.arrow.down">Sort By</Button>}>
                                                <Button systemImage="textformat.abc" onPress={() => router.setParams({ sortBy: "name" })}>
                                                    Name
                                                </Button>
                                                <Button systemImage="calendar" onPress={() => router.setParams({ sortBy: "date" })}>
                                                    Date
                                                </Button>
                                            </Submenu>
                                            <Submenu button={<Button systemImage="textformat">Name Order</Button>}>
                                                <Button systemImage="arrow.up" onPress={() => router.setParams({ nameOrder: "asc" })}>
                                                    A → Z
                                                </Button>
                                                <Button systemImage="arrow.down" onPress={() => router.setParams({ nameOrder: "desc" })}>
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
                                                            if (value) setSelectedDoctor(null);
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
                                                                    if (value) setSelectedDoctor(String(doctor.id));
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
                        headerLeft: () =>
                            hasIncompleteProfile || hasNoPractice ? null : (
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
                                                    <Switch key={index} label={practice.name} variant="switch" value={selectedPractice?.id === practice.id} onValueChange={() => setSelectedPractice(practice)} />
                                                ))}
                                            <Button systemImage="plus" onPress={() => router.push("/(auth)/select-role")}>
                                                Create a Practice
                                            </Button>
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
                        headerSearchBarOptions:
                            hasIncompleteProfile ||
                            hasNoPractice ||
                            (patientsData && Array.isArray(patientsData.data) && patientsData.data.length === 0)
                                ? undefined
                                : {
                                      placeholder: "Search patients",
                                      allowToolbarIntegration: false,
                                      onChangeText: (event) => {
                                          router.setParams({ q: event.nativeEvent.text });
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
