import { SearchGlyphIcon } from "@/assets/icons";
import { BaseText } from "@/components";
import Avatar from "@/components/avatar";
import BaseButton from "@/components/button/BaseButton";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { spacing } from "@/styles/spaces";
import colors from "@/theme/colors.shared";
import { e164ToDisplay } from "@/utils/helper/phoneUtils";
import { useArchivePatient, useGetPatients, useGetPracticeMembers } from "@/utils/hook";
import { useAuth } from "@/utils/hook/useAuth";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { Patient } from "@/utils/service/models/ResponseModels";
import { Button, ContextMenu, Host, Submenu } from "@expo/ui/swift-ui";
import { foregroundStyle } from "@expo/ui/swift-ui/modifiers";
import { useHeaderHeight } from "@react-navigation/elements";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, SectionList, StyleSheet, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function PatientsScreen() {
    const { selectedPractice, viewMode, selectedDoctor } = useProfileStore();
    const { profile, isAuthenticated } = useAuth();
    const queryClient = useQueryClient();
    const { data: practiceMembers } = useGetPracticeMembers(selectedPractice?.id ?? 0, isAuthenticated === true && !!selectedPractice?.id);
    const insets = useSafeAreaInsets();
    const headerHeight = useHeaderHeight();
    const { q } = useLocalSearchParams<{ q?: string }>();

    // Get current user's role in the selected practice
    const currentUserRole = useMemo(() => {
        if (!selectedPractice || !practiceMembers?.data || !profile?.email) {
            return selectedPractice?.role; // Fallback to practice role
        }

        // Find current user in practice members by email
        const currentMember = practiceMembers.data.find((member) => member.email === profile.email);
        return currentMember?.role || selectedPractice.role;
    }, [selectedPractice, practiceMembers?.data, profile?.email]);

    // Check if user can see doctor filter (only owner or admin)
    const canSeeDoctorFilter = useMemo(() => {
        return selectedPractice?.role === "owner" || selectedPractice?.role === "staff";
    }, [selectedPractice?.role]);

    const availableDoctors = useMemo(() => {
        if (!practiceMembers?.data) return [];
        return practiceMembers.data.filter((member) => member.role === "doctor" || member.role === "owner");
    }, [practiceMembers?.data]);

    // Determine doctor_id based on user role and selected doctor filter
    const doctorId = useMemo(() => {
        // If user is owner/admin and can see doctor filter
        if (canSeeDoctorFilter) {
            // If "All" is selected (selectedDoctor is null), don't pass doctor_id
            if (selectedDoctor === null) {
                return undefined;
            }
            // If a specific doctor is selected, pass that doctor's id
            if (selectedDoctor) {
                return parseInt(selectedDoctor);
            }
        }

        // If user is a doctor (not owner/admin), only show their own patients
        if (currentUserRole === "doctor" && profile?.id) {
            return profile.id;
        }

        // Default: don't filter by doctor
        return undefined;
    }, [canSeeDoctorFilter, selectedDoctor, currentUserRole, profile?.id]);

    const { data: patients, isLoading: isPatientsLoading, refetch: refetchPatients } = useGetPatients(selectedPractice?.id, { doctor_id: doctorId });
    const currentPatients = patients?.data;
    const isLoading = isPatientsLoading;

    const archivePatientMutation = useArchivePatient(
        () => {
            refetchPatients();
            queryClient.invalidateQueries({ queryKey: ["GetArchivedPatients"] });
        },
        (error) => {
            Alert.alert("Error", error.message || "Failed to archive patient");
        },
    );

    const groupedPatients =
        currentPatients?.reduce(
            (acc: Record<string, Patient[]>, patient: Patient) => {
                const firstChar = patient.full_name?.[0]?.toUpperCase();
                // اگر حرف اول وجود نداشته باشد یا در A-Z نباشد، آن را به بخش "#" اضافه کن
                const letter = firstChar && alphabet.includes(firstChar) ? firstChar : "#";
                if (!acc[letter]) acc[letter] = [];
                acc[letter].push(patient);
                return acc;
            },
            {} as Record<string, Patient[]>,
        ) || {};

    const [search, setSearch] = useState("");
    useEffect(() => {
        if (q !== undefined) setSearch(q);
    }, [q]);

    const [stickyEnabled, setStickyEnabled] = useState(true);
    const scrollViewRef = useRef<SectionList>(null);
    const [isDragging, setIsDragging] = useState(false);
    const alphabetContainerRef = useRef<View>(null);
    const [alphabetContainerLayout, setAlphabetContainerLayout] = useState({ y: 0, height: 0 });
    const [activeLetter, setActiveLetter] = useState<string | null>(null);
    const activeIndexSV = useSharedValue(-1);

    const filteredGroupedPatients = Object.keys(groupedPatients || {}).reduce(
        (acc, letter) => {
            const items = groupedPatients?.[letter]?.filter((p: Patient) => p.full_name.toLowerCase().includes(search.toLowerCase())) || [];
            if (items && items.length > 0) acc[letter] = items;
            return acc;
        },
        {} as Record<string, Patient[]>,
    );

    const sections = (() => {
        const keys = Object.keys(filteredGroupedPatients);
        const hashSection = keys.find((key) => key === "#");
        const otherKeys = keys.filter((key) => key !== "#").sort();
        const sortedKeys = hashSection ? [...otherKeys, hashSection] : otherKeys;
        return sortedKeys.map((letter) => ({
            title: letter,
            data: filteredGroupedPatients[letter],
        }));
    })();

    const alphabetWithHash = useMemo(() => {
        return sections.some((s) => s.title === "#") ? [...alphabet, "#"] : alphabet;
    }, [sections]);

    const alphabetWithHashRef = useRef<string[]>(alphabetWithHash);
    useEffect(() => {
        alphabetWithHashRef.current = alphabetWithHash;
    }, [alphabetWithHash]);

    const alphabetLengthSV = useSharedValue(alphabetWithHash.length);

    useEffect(() => {
        alphabetLengthSV.value = alphabetWithHash.length;
    }, [alphabetWithHash.length, alphabetLengthSV]);

    const handleAlphabetPress = (letter: string, animated = true) => {
        const sectionIndex = sections.findIndex((sec) => sec.title === letter);
        if (sectionIndex === -1 || !scrollViewRef.current) return;

        const stickyHeaderHeight = headerHeight || 0;

        setTimeout(() => {
            try {
                scrollViewRef.current?.scrollToLocation({
                    sectionIndex,
                    itemIndex: 0,
                    animated,
                    viewPosition: 0,
                    viewOffset: stickyHeaderHeight,
                });
            } catch (e) {
                console.warn("ScrollToLocation error:", e);
            }
        }, 50);
    };

    const handleGestureUpdate = (index: number) => {
        const letter = alphabetWithHashRef.current[index] || "";
        setActiveLetter(letter);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        handleAlphabetPress(letter, false);
    };

    const handleGestureTap = (index: number) => {
        const letter = alphabetWithHashRef.current[index] || "";
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        handleAlphabetPress(letter, true);
    };

    const onAlphabetContainerLayout = (event: any) => {
        const { y, height } = event.nativeEvent.layout;
        setAlphabetContainerLayout({ y, height });
    };

    const pan = Gesture.Pan()
        .onBegin((e) => {
            if (alphabetContainerLayout.height === 0) return;

            const relativeX = e.absoluteX - (alphabetContainerLayout.y > 0 ? 0 : 0);
            const relativeY = e.absoluteY - alphabetContainerLayout.y;

            if (relativeY < 0 || relativeY > alphabetContainerLayout.height) {
                return;
            }

            runOnJS(setIsDragging)(true);
        })
        .onUpdate((e) => {
            const containerHeight = alphabetContainerLayout.height;
            if (containerHeight === 0) return;

            const relativeY = e.absoluteY - alphabetContainerLayout.y;
            if (relativeY < 0 || relativeY > containerHeight) return;

            const alphabetLength = alphabetLengthSV.value;
            const itemHeight = containerHeight / alphabetLength;
            const index = Math.floor(relativeY / itemHeight);
            const clampedIndex = Math.max(0, Math.min(index, alphabetLength - 1));
            if (clampedIndex !== activeIndexSV.value) {
                activeIndexSV.value = clampedIndex;
                runOnJS(handleGestureUpdate)(clampedIndex);
            }
        })
        .onEnd(() => {
            runOnJS(setIsDragging)(false);
            runOnJS(setActiveLetter)(null);
            activeIndexSV.value = -1;
        })
        .maxPointers(1);

    const tap = Gesture.Tap().onStart((e) => {
        const containerHeight = alphabetContainerLayout.height;
        if (containerHeight === 0) return;

        const relativeY = e.absoluteY - alphabetContainerLayout.y;
        if (relativeY < 0 || relativeY > containerHeight) return;

        const alphabetLength = alphabetLengthSV.value;
        const itemHeight = containerHeight / alphabetLength;
        const index = Math.floor(relativeY / itemHeight);
        const clampedIndex = Math.max(0, Math.min(index, alphabetLength - 1));
        runOnJS(handleGestureTap)(clampedIndex);
    });

    const composedGesture = Gesture.Race(pan, tap);

    return (
        <>
            {isLoading ? (
                <View className="flex-1 py-[60%] items-center justify-center">
                    <ActivityIndicator size="large" color="#007AFF" />
                    <BaseText type="Body" color="labels.secondary" weight={500} style={{ marginTop: 8 }}>
                        Loading patients...
                    </BaseText>
                </View>
            ) : currentPatients && currentPatients.length > 0 ? (
                <SectionList
                    ref={scrollViewRef}
                    style={{ flex: 1, backgroundColor: "white" }}
                    sections={sections}
                    keyExtractor={(item, index) => item.full_name + index}
                    stickySectionHeadersEnabled={stickyEnabled}
                    showsVerticalScrollIndicator={false}
                    scrollEventThrottle={16}
                    contentInsetAdjustmentBehavior="automatic"
                    contentContainerStyle={{ paddingEnd: spacing["5"], backgroundColor: "white" }}
                    getItemLayout={(data, index) => {
                        const ITEM_HEIGHT = 60;
                        const SECTION_HEADER_HEIGHT = 24;
                        let offset = 0;
                        let currentIndex = 0;

                        for (let i = 0; i < sections.length; i++) {
                            const sectionLength = sections[i].data.length;
                            if (index < currentIndex + sectionLength) {
                                const itemIndexInSection = index - currentIndex;
                                return {
                                    length: ITEM_HEIGHT,
                                    offset: offset + SECTION_HEADER_HEIGHT + itemIndexInSection * ITEM_HEIGHT,
                                    index,
                                };
                            }
                            offset += SECTION_HEADER_HEIGHT + sectionLength * ITEM_HEIGHT;
                            currentIndex += sectionLength;
                        }

                        return {
                            length: ITEM_HEIGHT,
                            offset: offset,
                            index,
                        };
                    }}
                    renderItem={({ item, index, section }) => {
                        const chartNumber = item.chart_number;
                        const hasChartNumber = chartNumber !== null && chartNumber !== undefined && (typeof chartNumber === "number" || (typeof chartNumber === "string" && chartNumber.trim() !== ""));
                        console.log(`Patient ${item.id} - chart_number:`, chartNumber, "hasChartNumber:", hasChartNumber);
                        return (
                            <Host matchContents>
                                <ContextMenu activationMethod="longPress" modifiers={[foregroundStyle("labels.primary")]}>
                                    <ContextMenu.Items>
                                        {hasChartNumber && (
                                            <Button systemImage="number" disabled>
                                                {String(chartNumber)}
                                            </Button>
                                        )}
                                        <Button
                                            systemImage="creditcard"
                                            onPress={() => {
                                                router.push({
                                                    pathname: `/patients/${item.id}` as any,
                                                    params: { action: "addId" },
                                                });
                                            }}
                                        >
                                            Add ID
                                        </Button>
                                        <Button
                                            systemImage="camera"
                                            onPress={() => {
                                                router.push({
                                                    pathname: `/patients/${item.id}` as any,
                                                    params: { action: "takePhoto" },
                                                });
                                            }}
                                        >
                                            Take Photo
                                        </Button>
                                        <Button
                                            systemImage="text.document"
                                            onPress={() => {
                                                router.push({
                                                    pathname: `/patients/${item.id}` as any,
                                                    params: { action: "fillConsent" },
                                                });
                                            }}
                                        >
                                            Fill Consent
                                        </Button>
                                        {item.numbers && item.numbers.length > 0 && (
                                            <Submenu button={<Button systemImage="message">Message</Button>}>
                                                {item.numbers.map((number: any, index: number) => {
                                                    const phoneNumberRaw = typeof number === "string" ? number : number?.value || number?.number || String(number);
                                                    const phoneType = typeof number === "object" ? number?.type || "phone" : "phone";
                                                    // Display formatted phone number
                                                    const phoneNumberDisplay = e164ToDisplay(phoneNumberRaw) || phoneNumberRaw;
                                                    return (
                                                        <Button
                                                            key={`message-${index}-${phoneNumberRaw}`}
                                                            systemImage="message"
                                                            onPress={() => {
                                                                router.push({
                                                                    pathname: `/patients/${item.id}` as any,
                                                                    params: { action: "message", phoneIndex: index.toString() },
                                                                });
                                                            }}
                                                        >
                                                            {phoneType}: {phoneNumberDisplay}
                                                        </Button>
                                                    );
                                                })}
                                            </Submenu>
                                        )}
                                        {item.numbers && item.numbers.length > 0 && (
                                            <Submenu button={<Button systemImage="phone">Call</Button>}>
                                                {item.numbers.map((number: any, index: number) => {
                                                    const phoneNumberRaw = typeof number === "string" ? number : number?.value || number?.number || String(number);
                                                    const phoneType = typeof number === "object" ? number?.type || "phone" : "phone";
                                                    // Display formatted phone number
                                                    const phoneNumberDisplay = e164ToDisplay(phoneNumberRaw) || phoneNumberRaw;
                                                    return (
                                                        <Button
                                                            key={`call-${index}-${phoneNumberRaw}`}
                                                            systemImage="phone"
                                                            onPress={() => {
                                                                router.push({
                                                                    pathname: `/patients/${item.id}` as any,
                                                                    params: { action: "call", phoneIndex: index.toString() },
                                                                });
                                                            }}
                                                        >
                                                            {phoneType}: {phoneNumberDisplay}
                                                        </Button>
                                                    );
                                                })}
                                            </Submenu>
                                        )}
                                        <Button
                                            systemImage="archivebox"
                                            role="destructive"
                                            onPress={() => {
                                                Alert.alert("Archive Patient", `Are you sure you want to archive ${item.first_name} ${item.last_name}?`, [
                                                    {
                                                        text: "Cancel",
                                                        style: "cancel",
                                                    },
                                                    {
                                                        text: "Archive",
                                                        style: "destructive",
                                                        onPress: () => {
                                                            archivePatientMutation.mutate(item.id);
                                                        },
                                                    },
                                                ]);
                                            }}
                                        >
                                            Archive Patient
                                        </Button>
                                    </ContextMenu.Items>
                                    <ContextMenu.Trigger>
                                        <TouchableOpacity
                                            onPress={() => router.push(`/patients/${item.id}`)}
                                            key={`${section.title}-${index}`}
                                            style={[styles.listItem, index !== section.data.length - 1 && styles.listItemBorder]}
                                            className={`flex-row items-center gap-3 px-4 py-2 bg-white ${index !== section.data.length - 1 ? "border-b border-gray-200" : ""}`}
                                        >
                                            <Avatar haveRing name={item.full_name} size={36} imageUrl={item.profile_image?.url || undefined} color={item.doctor?.color} />
                                            <BaseText type="Callout" weight={500} color="labels.primary">
                                                {item.full_name}
                                            </BaseText>
                                        </TouchableOpacity>
                                    </ContextMenu.Trigger>
                                </ContextMenu>
                            </Host>
                        );
                    }}
                    renderSectionHeader={({ section: { title } }) => (
                        <View style={styles.sectionHeader} className="px-4">
                            <BaseText type="Footnote" color="labels.tertiary" weight={"600"}>
                                {title}
                            </BaseText>
                        </View>
                    )}
                />
            ) : search.length > 0 ? (
                <View style={styles.noResults} className="flex-1 items-center justify-center">
                    <SearchGlyphIcon width={40} height={40} strokeWidth={0} style={{ marginBottom: 10 }} />
                    <BaseText type="Body" lineBreakMode="tail" numberOfLines={1} color="labels.primary" weight={500}>
                        No results for "{search}"
                    </BaseText>
                    <BaseText type="Caption1" color="labels.secondary" weight={500}>
                        Check the spelling or try a new search.
                    </BaseText>
                </View>
            ) : (
                <View style={[styles.emptyStateContainer, { paddingTop: headerHeight + spacing["5"] }]}>
                    <View style={styles.emptyStateCard}>
                        <View style={{ backgroundColor: colors.system.gray6 }} className="flex-row items-center gap-3 ">
                            <View style={styles.emptyStateContent}>
                                {/* Avatars */}
                                <View style={styles.avatarsContainer}>
                                    <Image source={require("@/assets/images/fakePatients/Ellipse11.png")} style={[styles.avatar, styles.avatarLarge]} />
                                    <Image source={require("@/assets/images/fakePatients/Ellipse12.png")} style={[styles.avatar, styles.avatarMedium]} />
                                    <Image source={require("@/assets/images/fakePatients/Ellipse13.png")} style={[styles.avatar, styles.avatarSmall]} />
                                </View>

                                {/* Text and Button */}
                                <View style={styles.textContainer}>
                                    <BaseText type="Body" color="labels.primary" weight="600" style={styles.title}>
                                        Let's add your first patient
                                    </BaseText>
                                    <BaseText type="Footnote" color="labels.secondary" weight="400" style={styles.subtitle}>
                                        Create a profile and keep their clinic details at your fingertips.
                                    </BaseText>
                                    <BaseButton
                                        label="Add Patient"
                                        ButtonStyle="Tinted"
                                        size="Medium"
                                        rounded={true}
                                        onPress={() => {
                                            // If user is staff (admin) or owner, check if there's only one doctor
                                            if (currentUserRole === "staff" || currentUserRole === "owner") {
                                                // If there's only one doctor, go directly to add patient with that doctor
                                                if (availableDoctors.length === 1) {
                                                    const singleDoctor = availableDoctors[0];
                                                    const doctorIdParam = typeof singleDoctor.id === "number" ? String(singleDoctor.id) : singleDoctor.id.includes(":") ? singleDoctor.id.split(":")[1] : singleDoctor.id;
                                                    router.push({
                                                        pathname: "/(modals)/add-patient/form",
                                                        params: {
                                                            doctor_id: doctorIdParam,
                                                            doctor: JSON.stringify(singleDoctor),
                                                        },
                                                    });
                                                } else {
                                                    // Multiple doctors, show selection modal
                                                    router.push("/(modals)/add-patient/select-doctor");
                                                }
                                            } else {
                                                // Otherwise, go directly to add patient
                                                router.push("/(modals)/add-patient/form");
                                            }
                                        }}
                                        leftIcon={<IconSymbol name="plus.circle.fill" size={20} color={colors.system.blue} />}
                                        style={styles.addButton}
                                    />
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            )}

            {sections.length > 0 && (
                <View className="absolute  right-0 top-1/2 -translate-y-1/2 items-center justify-center" ref={alphabetContainerRef} onLayout={onAlphabetContainerLayout} style={{ zIndex: 1 }} pointerEvents="box-none">
                    <GestureDetector gesture={composedGesture}>
                        <View style={styles.alphabetWrapper} pointerEvents="auto">
                            {alphabetWithHash.map((letter) => {
                                const hasSection = sections.some((s) => s.title === letter);
                                const isActive = isDragging && activeLetter === letter;
                                return (
                                    <View key={letter} style={[styles.alphabetItem, isActive && styles.activeAlphabetItem]}>
                                        <BaseText type="Caption1" color={isActive ? "system.blue" : hasSection ? "system.blue" : "labels.tertiary"} weight={isActive ? "700" : "500"} style={{ transform: [{ scale: isActive ? 1.4 : 1 }] }}>
                                            {letter}
                                        </BaseText>
                                    </View>
                                );
                            })}
                        </View>
                    </GestureDetector>
                </View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    listItem: { flexDirection: "row", alignItems: "center", gap: spacing["3"], paddingVertical: spacing["2"] },
    listItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.system.gray5 },
    sectionHeader: { backgroundColor: colors.background, paddingHorizontal: 0 },
    alphabetWrapper: { alignItems: "center", justifyContent: "center" },
    alphabetItem: { paddingHorizontal: spacing["1"], marginVertical: 1 },
    activeAlphabetItem: { backgroundColor: "rgba(0, 122, 255, 0.1)", borderRadius: 4 },
    noResults: { alignItems: "center", justifyContent: "center", gap: spacing["1"] },
    emptyStateContainer: {
        flex: 1,
        backgroundColor: "white",
        paddingHorizontal: spacing["5"],
        paddingBottom: spacing["10"],
    },
    emptyStateCard: {
        backgroundColor: colors.system.gray6,
        borderRadius: 24,
        padding: spacing["5"],
        width: "100%",
    },
    emptyStateContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing["2"],
    },
    avatarsContainer: {
        position: "relative",
        width: 65,
        height: 100,
    },
    avatar: {
        position: "absolute",
        borderRadius: 9999,
        borderWidth: 3,
        borderColor: colors.system.white,
    },
    avatarLarge: {
        width: 62,
        height: 62,
        top: 0,
        left: 0,
        zIndex: 3,
    },
    avatarMedium: {
        width: 42,
        height: 42,
        top: 48,
        left: -5,
        zIndex: 2,
    },
    avatarSmall: {
        width: 33,
        height: 33,
        top: 65,
        left: 25,
        zIndex: 3,
    },
    textContainer: {
        flex: 1,
        gap: spacing["0"],
    },
    title: {
        fontSize: 17,
        lineHeight: 22,
        letterSpacing: -0.43,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 13,
        lineHeight: 18,
        letterSpacing: -0.08,
        marginBottom: spacing["1"],
    },
    addButton: {
        marginTop: spacing["1"],
        alignSelf: "flex-start",
    },
});
