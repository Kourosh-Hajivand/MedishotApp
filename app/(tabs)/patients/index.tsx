import { SearchGlyphIcon } from "@/assets/icons";
import { BaseText } from "@/components";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { spacing } from "@/styles/spaces";
import colors from "@/theme/colors.shared";
import { openCallForPatient, openMessageForPatient } from "@/utils/helper/communication";
import { useGetDoctorPatients, useGetPatients } from "@/utils/hook";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { Button, ContextMenu, Host, Submenu } from "@expo/ui/swift-ui";
import { foregroundStyle } from "@expo/ui/swift-ui/modifiers";
import { useHeaderHeight } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, SectionList, StyleSheet, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function PatientsScreen() {
    const { selectedPractice, viewMode } = useProfileStore();
    const insets = useSafeAreaInsets();
    const headerHeight = useHeaderHeight();
    const { q } = useLocalSearchParams<{ q?: string }>();

    const { data: patients, isLoading: isPatientsLoading } = useGetPatients(selectedPractice?.id, 1, 30);
    const { data: doctorPatients, isLoading: isDoctorPatientsLoading } = useGetDoctorPatients(1, 30);

    const currentPatients = viewMode === "doctor" ? doctorPatients?.data : patients?.data;
    const isLoading = viewMode === "doctor" ? isDoctorPatientsLoading : isPatientsLoading;

    const groupedPatients =
        currentPatients?.reduce(
            (acc: Record<string, { full_name: string; id: number }[]>, patient: any) => {
                const letter = patient.full_name[0].toUpperCase();
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

    const sections = Object.keys(filteredGroupedPatients)
        .sort()
        .map((letter) => ({
            title: letter,
            data: filteredGroupedPatients[letter],
        }));

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

    const onAlphabetContainerLayout = (event: any) => {
        const { y, height } = event.nativeEvent.layout;
        setAlphabetContainerLayout({ y, height });
    };

    // ✅ gesture ترکیبی Tap + Pan با Haptic Feedback
    const pan = Gesture.Pan()
        .onBegin((e) => {
            // بررسی اینکه touch در ناحیه الفبا هست یا نه
            if (alphabetContainerLayout.height === 0) return;

            // بررسی محدوده X برای جلوگیری از تداخل با لیست
            const relativeX = e.absoluteX - (alphabetContainerLayout.y > 0 ? 0 : 0); // placeholder
            const relativeY = e.absoluteY - alphabetContainerLayout.y;

            // اگر touch خارج از محدوده container الفبا بود، gesture رو cancel کن
            if (relativeY < 0 || relativeY > alphabetContainerLayout.height) {
                return;
            }

            runOnJS(setIsDragging)(true);
        })
        .onUpdate((e) => {
            const containerHeight = alphabetContainerLayout.height;
            if (containerHeight === 0) return;

            // بررسی اینکه touch در محدوده container الفبا هست
            const relativeY = e.absoluteY - alphabetContainerLayout.y;
            if (relativeY < 0 || relativeY > containerHeight) return;

            const itemHeight = containerHeight / alphabet.length;
            const index = Math.floor(relativeY / itemHeight);
            const clampedIndex = Math.max(0, Math.min(index, alphabet.length - 1));
            const letter = alphabet[clampedIndex];
            if (clampedIndex !== activeIndexSV.value) {
                activeIndexSV.value = clampedIndex;
                runOnJS(setActiveLetter)(letter);
                runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
                runOnJS(handleAlphabetPress)(letter, false);
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

        // بررسی اینکه touch در محدوده container الفبا هست
        const relativeY = e.absoluteY - alphabetContainerLayout.y;
        if (relativeY < 0 || relativeY > containerHeight) return;

        const itemHeight = containerHeight / alphabet.length;
        const index = Math.floor(relativeY / itemHeight);
        const clampedIndex = Math.max(0, Math.min(index, alphabet.length - 1));
        const letter = alphabet[clampedIndex];
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
        runOnJS(handleAlphabetPress)(letter, true);
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

                        // محاسبه offset با توجه به sections
                        for (let i = 0; i < sections.length; i++) {
                            const sectionLength = sections[i].data.length;
                            if (index < currentIndex + sectionLength) {
                                // این آیتم در section فعلی است
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

                        // fallback
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
                                        <Avatar haveRing name={item.full_name} size={36} />
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
                <View style={styles.noResults} className="py-[75%] items-center justify-center">
                    <SearchGlyphIcon width={40} height={40} strokeWidth={0} style={{ marginBottom: 10 }} />
                    <BaseText type="Body" lineBreakMode="tail" numberOfLines={1} color="labels.primary" weight={500}>
                        No results for "{search}"
                    </BaseText>
                    <BaseText type="Caption1" color="labels.secondary" weight={500}>
                        Check the spelling or try a new search.
                    </BaseText>
                </View>
            ) : (
                <View style={styles.noResults} className="py-[60%] items-center justify-center">
                    <IconSymbol name="person.2" color={colors.labels.secondary} size={40} />
                    <BaseText type="Body" lineBreakMode="tail" numberOfLines={1} color="labels.secondary" weight={500}>
                        No patients found
                    </BaseText>
                </View>
            )}

            {sections.length > 0 && (
                <View
                    className="absolute  right-0 top-1/2 -translate-y-1/2 items-center justify-center"
                    ref={alphabetContainerRef}
                    onLayout={onAlphabetContainerLayout}
                    style={{ zIndex: 1 }}
                    pointerEvents="box-none" // اجازه بده touch events به children برسه
                >
                    <GestureDetector gesture={composedGesture}>
                        <View style={styles.alphabetWrapper} pointerEvents="auto">
                            {alphabet.map((letter) => {
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
});
