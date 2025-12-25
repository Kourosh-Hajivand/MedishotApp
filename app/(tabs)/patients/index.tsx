import { SearchGlyphIcon } from "@/assets/icons";
import { BaseText } from "@/components";
import Avatar from "@/components/avatar";
import BaseButton from "@/components/button/BaseButton";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { spacing } from "@/styles/spaces";
import colors from "@/theme/colors.shared";
import { openCallForPatient, openMessageForPatient } from "@/utils/helper/communication";
import { useGetPatients, useGetPracticeMembers } from "@/utils/hook";
import { useAuth } from "@/utils/hook/useAuth";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { Button, ContextMenu, Host, Submenu } from "@expo/ui/swift-ui";
import { foregroundStyle } from "@expo/ui/swift-ui/modifiers";
import { useHeaderHeight } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, SectionList, StyleSheet, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function PatientsScreen() {
    const { selectedPractice, viewMode } = useProfileStore();
    const { profile, isAuthenticated } = useAuth();
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

    // Determine doctor_id based on user role
    const doctorId = useMemo(() => {
        // If role is "owner" or "admin" (staff), don't pass doctor_id
        if (currentUserRole === "owner" || currentUserRole === "admin" || currentUserRole === "member") {
            return undefined;
        }
        // If role is "doctor", pass current user's id
        if (currentUserRole === "doctor" && profile?.id) {
            return profile.id;
        }
        return undefined;
    }, [currentUserRole, profile?.id]);

    const { data: patients, isLoading: isPatientsLoading } = useGetPatients(selectedPractice?.id, { doctor_id: doctorId });
    console.log("====================================");
    console.log(patients?.data);
    console.log("====================================");
    const currentPatients = patients?.data;
    const isLoading = isPatientsLoading;

    const groupedPatients =
        currentPatients?.reduce(
            (acc: Record<string, { full_name: string; id: number }[]>, patient: any) => {
                const firstChar = patient.full_name?.[0]?.toUpperCase();
                // اگر حرف اول وجود نداشته باشد یا در A-Z نباشد، آن را به بخش "#" اضافه کن
                const letter = firstChar && alphabet.includes(firstChar) ? firstChar : "#";
                if (!acc[letter]) acc[letter] = [];
                acc[letter].push(patient);
                return acc;
            },
            {} as Record<string, { full_name: string; id: number }[]>,
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
            const items = groupedPatients?.[letter]?.filter((p: any) => p.full_name.toLowerCase().includes(search.toLowerCase())) || [];
            if (items && items.length > 0) acc[letter] = items;
            return acc;
        },
        {} as Record<string, { full_name: string; id: number }[]>,
    );

    const sections = (() => {
        const keys = Object.keys(filteredGroupedPatients);
        const hashSection = keys.find((key) => key === "#");
        const otherKeys = keys.filter((key) => key !== "#").sort();
        // بخش "#" را در انتهای لیست قرار بده
        const sortedKeys = hashSection ? [...otherKeys, hashSection] : otherKeys;
        return sortedKeys.map((letter) => ({
            title: letter,
            data: filteredGroupedPatients[letter],
        }));
    })();

    // آرایه حروف الفبا برای نمایش در sidebar (شامل "#" اگر وجود داشته باشد)
    const alphabetWithHash = useMemo(() => {
        return sections.some((s) => s.title === "#") ? [...alphabet, "#"] : alphabet;
    }, [sections]);

    // نگه‌داری alphabetWithHash در ref برای استفاده در gesture handlers
    const alphabetWithHashRef = useRef<string[]>(alphabetWithHash);
    useEffect(() => {
        alphabetWithHashRef.current = alphabetWithHash;
    }, [alphabetWithHash]);

    // طول alphabetWithHash را برای استفاده در gesture handlers نگه دار
    const alphabetLengthSV = useSharedValue(alphabetWithHash.length);

    // بروزرسانی طول وقتی sections تغییر می‌کند
    useEffect(() => {
        alphabetLengthSV.value = alphabetWithHash.length;
    }, [alphabetWithHash.length, alphabetLengthSV]);

    const handleAlphabetPress = (letter: string, animated = true) => {
        const sectionIndex = sections.findIndex((sec) => sec.title === letter);
        if (sectionIndex === -1 || !scrollViewRef.current) return;

        // محاسبه offset برای sticky header
        const stickyHeaderHeight = headerHeight || 0;

        setTimeout(() => {
            try {
                scrollViewRef.current?.scrollToLocation({
                    sectionIndex,
                    itemIndex: 0,
                    animated,
                    viewPosition: 0, // موقعیت در viewport (0 = بالا)
                    viewOffset: stickyHeaderHeight, // offset برای sticky header
                });
            } catch (e) {
                console.warn("ScrollToLocation error:", e);
            }
        }, 50);
    };

    // توابع helper برای gesture handlers
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

            const relativeX = e.absoluteX - (alphabetContainerLayout.y > 0 ? 0 : 0); // placeholder
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
                    renderItem={({ item, index, section }) => (
                        <Host style={{ flex: 1 }}>
                            <ContextMenu activationMethod="longPress" modifiers={[foregroundStyle("labels.primary")]}>
                                <ContextMenu.Items>
                                    <Button systemImage="creditcard">Add ID</Button>
                                    <Button systemImage="camera">Take Photo</Button>
                                    <Button systemImage="text.document">Fill Consent</Button>
                                    {item.numbers && item.numbers.length > 0 ? (
                                        <Submenu button={<Button systemImage="message">Message</Button>}>
                                            {item.numbers.map((number: any, index: number) => {
                                                const phoneNumber = typeof number === "string" ? number : number?.value || number?.number || String(number);
                                                const phoneType = typeof number === "object" ? number?.type || "phone" : "phone";
                                                return (
                                                    <Button key={`message-${index}-${phoneNumber}`} systemImage="message" onPress={() => openMessageForPatient([phoneNumber])}>
                                                        {phoneType}: {phoneNumber}
                                                    </Button>
                                                );
                                            })}
                                        </Submenu>
                                    ) : (
                                        <Button systemImage="message" onPress={() => openMessageForPatient(item.numbers)}>
                                            Message
                                        </Button>
                                    )}
                                    {item.numbers && item.numbers.length > 0 ? (
                                        <Submenu button={<Button systemImage="phone">Call</Button>}>
                                            {item.numbers.map((number: any, index: number) => {
                                                const phoneNumber = typeof number === "string" ? number : number?.value || number?.number || String(number);
                                                const phoneType = typeof number === "object" ? number?.type || "phone" : "phone";
                                                return (
                                                    <Button key={`call-${index}-${phoneNumber}`} systemImage="phone" onPress={() => openCallForPatient([phoneNumber])}>
                                                        {phoneType}: {phoneNumber}
                                                    </Button>
                                                );
                                            })}
                                        </Submenu>
                                    ) : (
                                        <Button systemImage="phone" onPress={() => openCallForPatient(item.numbers)}>
                                            Call
                                        </Button>
                                    )}
                                </ContextMenu.Items>
                                <ContextMenu.Trigger>
                                    <TouchableOpacity
                                        onPress={() => router.push(`/patients/${item.id}`)}
                                        key={`${section.title}-${index}`}
                                        style={[styles.listItem, index !== section.data.length - 1 && styles.listItemBorder]}
                                        className={`flex-row items-center gap-3 px-4 py-2 bg-white ${index !== section.data.length - 1 ? "border-b border-gray-200" : ""}`}
                                    >
                                        <Avatar haveRing name={item.full_name} size={36} imageUrl={item.profile_image?.url} />
                                        <BaseText type="Callout" weight={500} color="labels.primary">
                                            {item.full_name}
                                        </BaseText>
                                    </TouchableOpacity>
                                </ContextMenu.Trigger>
                            </ContextMenu>
                        </Host>
                    )}
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
                                    <Image source={{ uri: "https://www.figma.com/api/mcp/asset/2421f0e4-5d62-40ac-83d2-ba605aff86ae" }} style={[styles.avatar, styles.avatarLarge]} />
                                    <Image source={{ uri: "https://www.figma.com/api/mcp/asset/05fdd0e9-546c-43a4-b164-e485d7c3ac39" }} style={[styles.avatar, styles.avatarMedium]} />
                                    <Image source={{ uri: "https://www.figma.com/api/mcp/asset/fc5e9eef-bfd4-4ff3-bd11-0d7559b757e0" }} style={[styles.avatar, styles.avatarSmall]} />
                                </View>

                                {/* Text and Button */}
                                <View style={styles.textContainer}>
                                    <BaseText type="Body" color="labels.primary" weight="600" style={styles.title}>
                                        Let's add your first patient
                                    </BaseText>
                                    <BaseText type="Footnote" color="labels.secondary" weight="400" style={styles.subtitle}>
                                        Create a profile and keep their clinic details at your fingertips.
                                    </BaseText>
                                    <BaseButton label="Add Patient" ButtonStyle="Tinted" size="Medium" rounded={true} onPress={() => router.push("/(modals)/add-patient/photo")} leftIcon={<IconSymbol name="plus" size={16} color={colors.system.blue} />} style={styles.addButton} />
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
        gap: spacing["3"],
    },
    avatarsContainer: {
        position: "relative",
        width: 100,
        height: 100,
    },
    avatar: {
        position: "absolute",
        borderRadius: 9999,
        borderWidth: 2,
        borderColor: colors.system.white,
    },
    avatarLarge: {
        width: 62,
        height: 62,
        top: 0,
        left: 0,
    },
    avatarMedium: {
        width: 42,
        height: 42,
        top: 46,
        left: 33,
    },
    avatarSmall: {
        width: 33,
        height: 33,
        top: 70,
        left: 7,
    },
    textContainer: {
        flex: 1,
        gap: spacing["1"],
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
