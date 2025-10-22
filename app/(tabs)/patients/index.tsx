import { SearchGlyphIcon } from "@/assets/icons/index";
import { BaseText, SearchBox } from "@/components";
import Avatar from "@/components/avatar";
import HeaderWithMenu from "@/components/ui/HeaderWithMenu";
import { spacing } from "@/styles/spaces";
import colors from "@/theme/colors.shared";
import { openCallForPatient, openMessageForPatient } from "@/utils/helper/communication";
import { useGetDoctorPatients, useGetPatients } from "@/utils/hook";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { Button, ContextMenu, Host, Submenu } from "@expo/ui/swift-ui";
import { foregroundStyle } from "@expo/ui/swift-ui/modifiers";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import { ActivityIndicator, Animated, SectionList, StyleSheet, TouchableOpacity, View } from "react-native";
import { GestureEvent, PanGestureHandler, PanGestureHandlerEventPayload, State } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function PatientsScreen() {
    const { selectedPractice, selectedProfile } = useProfileStore();

    const { data: patients, isLoading: isPatientsLoading } = useGetPatients(selectedPractice?.id, 1, 30);
    const { data: doctorPatients, isLoading: isDoctorPatientsLoading } = useGetDoctorPatients(1, 30);

    const currentPatients = selectedProfile === "profile" ? doctorPatients?.data : patients?.data;
    const isLoading = selectedProfile === "profile" ? isDoctorPatientsLoading : isPatientsLoading;

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
    const [stickyEnabled, setStickyEnabled] = useState(true);
    const scrollViewRef = useRef<SectionList>(null);
    const animatedValue = useRef(new Animated.Value(0)).current;
    const [isDragging, setIsDragging] = useState(false);
    const alphabetContainerRef = useRef<View>(null);
    const [alphabetContainerLayout, setAlphabetContainerLayout] = useState({
        y: 0,
        height: 0,
    });
    const [activeLetter, setActiveLetter] = useState<string | null>(null);
    const [gestureStartY, setGestureStartY] = useState(0);
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

    const handleFocus = () => {
        Animated.timing(animatedValue, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
        }).start();
    };

    const handleBlur = () => {
        Animated.timing(animatedValue, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
        }).start();
    };

    const headerTranslateY = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -50],
    });

    const headerOpacity = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
    });

    const searchBoxTranslateY = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -100],
    });

    const scrollViewTranslateY = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -110],
    });

    const handleAlphabetGesture = (event: GestureEvent<PanGestureHandlerEventPayload>) => {
        const { translationY, absoluteY, state } = event.nativeEvent;

        if (state === State.BEGAN) {
            setIsDragging(true);
            setGestureStartY(absoluteY);
        }

        if (state === State.ACTIVE) {
            const containerHeight = alphabetContainerLayout.height;
            const itemHeight = containerHeight / alphabet.length;

            const currentY = gestureStartY + translationY;
            const containerY = alphabetContainerLayout.y;
            const relativeY = currentY - containerY;
            const letterIndex = Math.floor(relativeY / itemHeight);
            const clampedIndex = Math.max(0, Math.min(letterIndex, alphabet.length - 1));

            const letter = alphabet[clampedIndex];
            setActiveLetter(letter);

            const sectionIndex = sections.findIndex((sec) => sec.title === letter);

            if (sectionIndex !== -1 && scrollViewRef.current) {
                setStickyEnabled(false);
                scrollViewRef.current.scrollToLocation({
                    sectionIndex,
                    itemIndex: 0,
                    animated: false,
                    viewOffset: 0,
                });
            }
        }

        if (state === State.END) {
            if (activeLetter) {
                handleAlphabetPress(activeLetter);
            }
            setIsDragging(false);
            setActiveLetter(null);
            setGestureStartY(0);
            setStickyEnabled(true);
        }
    };

    const onAlphabetContainerLayout = (event: any) => {
        const { y, height } = event.nativeEvent.layout;
        setAlphabetContainerLayout({ y, height });
    };

    const handleAlphabetPress = (letter: string) => {
        const sectionIndex = sections.findIndex((sec) => sec.title === letter);
        if (sectionIndex !== -1 && scrollViewRef.current) {
            setStickyEnabled(false);

            setTimeout(() => {
                scrollViewRef.current?.scrollToLocation({
                    sectionIndex,
                    itemIndex: 0,
                    animated: true,
                    viewOffset: 0,
                });

                setTimeout(() => {
                    setStickyEnabled(true);
                }, 500);
            }, 50);
        }
    };

    return (
        <SafeAreaView edges={["top"]} style={styles.container} className="flex-1 bg-red-500">
            <View style={styles.content} className="flex-1">
                <Animated.View
                    style={[
                        styles.header,
                        {
                            transform: [{ translateY: headerTranslateY }],
                            opacity: headerOpacity,
                        },
                    ]}
                    className="gap-4"
                >
                    <View style={styles.headerTop} className="flex-row items-center justify-between bg px-4">
                        <HeaderWithMenu />
                    </View>
                    <View style={styles.titleContainer} className="gap-3 px-4 pb-4">
                        <BaseText type="LargeTitle" weight={700} color="labels.primary">
                            {selectedProfile === "profile" ? "My Patients" : "Patients"}
                        </BaseText>
                    </View>
                </Animated.View>

                <Animated.View style={[styles.searchContainer, { transform: [{ translateY: searchBoxTranslateY }] }]} className="bg-white pb-3">
                    <SearchBox value={search} onChangeText={setSearch} onClearPress={() => setSearch("")} onFocus={handleFocus} onBlur={handleBlur} />
                </Animated.View>

                <View style={styles.listContainer} className="flex-1 flex-row">
                    <Animated.View style={[styles.scrollContainer, { transform: [{ translateY: scrollViewTranslateY }] }]}>
                        {isLoading ? (
                            <View style={styles.loadingContainer} className="flex-1 items-center justify-center">
                                <ActivityIndicator size="large" color="#007AFF" />
                                <BaseText type="Body" color="labels.secondary" weight={500} style={{ marginTop: 8 }}>
                                    Loading patients...
                                </BaseText>
                            </View>
                        ) : currentPatients && currentPatients.length > 0 ? (
                            <SectionList
                                ref={scrollViewRef}
                                sections={sections}
                                keyExtractor={(item, index) => item.full_name + index}
                                stickySectionHeadersEnabled={stickyEnabled}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.sectionListContent}
                                renderItem={({ item, index, section }) => (
                                    <Host style={{ flex: 1 }}>
                                        <ContextMenu activationMethod="longPress" modifiers={[foregroundStyle("labels.primary")]}>
                                            <ContextMenu.Items>
                                                {/* Submenu 1: Sort By */}
                                                <Button systemImage="creditcard">Add ID</Button>
                                                <Button systemImage="camera">Take Photo</Button>
                                                <Button systemImage="text.document">Fill Consent</Button>
                                                {item.numbers && item.numbers.length > 0 ? (
                                                    <Submenu button={<Button systemImage="message">Message</Button>}>
                                                        {item.numbers.map((number: any, index: number) => {
                                                            // Handle both string and object formats
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
                                                            // Handle both string and object formats
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
                                                    onPress={() => router.push(`/(tabs)/patients/${item.id}`)}
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
                                    <View style={styles.sectionHeader} className="bg-white px-0">
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
                            <View style={styles.noResults} className="flex-1 items-center justify-center">
                                <BaseText type="Body" lineBreakMode="tail" numberOfLines={1} color="labels.secondary" weight={500}>
                                    No patients found
                                </BaseText>
                            </View>
                        )}
                    </Animated.View>

                    {sections.length > 0 && (
                        <View style={styles.alphabetContainer} className="absolute bottom-10 right-1 top-10 items-center justify-center" ref={alphabetContainerRef} onLayout={onAlphabetContainerLayout}>
                            <PanGestureHandler onGestureEvent={handleAlphabetGesture as any}>
                                <View style={styles.alphabetWrapper}>
                                    {alphabet.map((letter) => {
                                        const sectionIndex = sections.findIndex((sec) => sec.title === letter);
                                        const hasSection = sectionIndex !== -1;
                                        const isActive = isDragging && activeLetter === letter;

                                        return (
                                            <TouchableOpacity key={letter} onPress={() => handleAlphabetPress(letter)} style={[styles.alphabetItem, isActive && styles.activeAlphabetItem]} className="px-1">
                                                <BaseText type="Caption1" color={isActive ? "system.blue" : hasSection ? "system.blue" : "labels.tertiary"} weight={isActive ? "700" : "500"}>
                                                    {letter}
                                                </BaseText>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </PanGestureHandler>
                        </View>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
    },
    header: {
        gap: spacing["4"],
    },
    headerTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacing["4"],
    },
    userContainer: {
        backgroundColor: "rgba(120, 120, 128, 0.12)",
        flexDirection: "row",
        alignItems: "center",
        gap: spacing["2"],
        paddingHorizontal: spacing["1"],
        paddingVertical: spacing["1"],
        paddingRight: spacing["4"],
        borderRadius: 999,
        alignSelf: "flex-start",
    },
    menuButton: {
        backgroundColor: "rgba(120, 120, 128, 0.12)",
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    titleContainer: {
        gap: spacing["3"],
        paddingBottom: spacing["4"],
        paddingHorizontal: spacing["4"],
    },
    searchContainer: {
        backgroundColor: colors.background,
        paddingBottom: spacing["3"],
        zIndex: 10,
        marginBottom: 8,
        paddingHorizontal: 16,
    },
    listContainer: {
        flex: 1,
        flexDirection: "row",
    },
    scrollContainer: {
        flex: 1,
        // paddingHorizontal: spacing["4"],
    },
    sectionListContent: {
        flexGrow: 1,
        paddingHorizontal: spacing["2"],
        paddingBottom: 120,
    },
    listItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing["3"],
        paddingVertical: spacing["2"],
    },
    listItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: colors.system.gray5,
    },
    sectionHeader: {
        backgroundColor: colors.background,
        paddingHorizontal: 0,
    },
    alphabetContainer: {
        position: "absolute",
        right: 4,
        top: 40,
        bottom: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    alphabetWrapper: {
        alignItems: "center",
        justifyContent: "center",
    },
    alphabetItem: {
        paddingHorizontal: spacing["1"],
    },
    activeAlphabetItem: {
        backgroundColor: "rgba(0, 122, 255, 0.1)",
        borderRadius: 4,
    },
    noResults: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: spacing["1"],
    },
    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: spacing["2"],
    },
});
