import { SearchGlyphIcon } from "@/assets/icons";
import { BaseText, PatientSkeleton } from "@/components";
import Avatar from "@/components/avatar";
import BaseButton from "@/components/button/BaseButton";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { spacing } from "@/styles/spaces";
import colors from "@/theme/colors.shared";
import { e164ToDisplay } from "@/utils/helper/phoneUtils";
import { getPatientLimitFromPlan } from "@/utils/helper/subscriptionLimits";
import { useArchivePatient, useGetPatients, useGetPracticeList, useGetPracticeMembers, useGetSubscriptionStatus } from "@/utils/hook";
import { useAuth } from "@/utils/hook/useAuth";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { Patient } from "@/utils/service/models/ResponseModels";
import { Button, ContextMenu, Host, Submenu } from "@expo/ui/swift-ui";
import { foregroundStyle } from "@expo/ui/swift-ui/modifiers";
import { useHeaderHeight } from "@react-navigation/elements";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, SectionList, StyleSheet, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const USE_MOCK_PATIENTS = false;

// Layout constants for SectionList - must match actual rendered sizes
const ITEM_HEIGHT = 48; // Height of PatientListItem (Host height)
const SECTION_HEADER_HEIGHT = 22; // Height of section header (Footnote line-height + padding)
const MIN_PATIENTS_FOR_ALPHABET_SIDEBAR = 30; // Minimum patients to show alphabet sidebar

// Memoized Patient List Item with SwiftUI ContextMenu
interface PatientListItemProps {
    item: Patient;
    isLastItem: boolean;
    onArchive: (id: number) => void;
}

const PatientListItem = React.memo(
    ({ item, isLastItem, onArchive }: PatientListItemProps) => {
        const chartNumber = item.chart_number;
        const hasChartNumber = chartNumber !== null && chartNumber !== undefined && (typeof chartNumber === "number" || (typeof chartNumber === "string" && chartNumber.trim() !== ""));

        const handleNavigate = useCallback(() => {
            router.push(`/patients/${item.id}`);
        }, [item.id]);

        const handleAddId = useCallback(() => {
            router.push({
                pathname: `/patients/${item.id}` as any,
                params: { action: "addId" },
            });
        }, [item.id]);

        const handleTakePhoto = useCallback(() => {
            router.push({
                pathname: `/patients/${item.id}` as any,
                params: { action: "takePhoto" },
            });
        }, [item.id]);

        const handleFillConsent = useCallback(() => {
            router.push({
                pathname: `/patients/${item.id}` as any,
                params: { action: "fillConsent" },
            });
        }, [item.id]);

        const handleArchive = useCallback(() => {
            Alert.alert("Archive Patient", `Are you sure you want to archive ${item.first_name} ${item.last_name}?`, [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Archive",
                    style: "destructive",
                    onPress: () => onArchive(item.id),
                },
            ]);
        }, [item.id, item.first_name, item.last_name, onArchive]);

        return (
            <Host style={{ width: "100%", height: 48 }}>
                <ContextMenu activationMethod="longPress" modifiers={[foregroundStyle("labels.primary")]}>
                    <ContextMenu.Items>
                        {hasChartNumber && (
                            <Button systemImage="number" disabled>
                                {String(chartNumber)}
                            </Button>
                        )}
                        <Button systemImage="creditcard" onPress={handleAddId}>
                            Add ID
                        </Button>
                        <Button systemImage="camera" onPress={handleTakePhoto}>
                            Take Photo
                        </Button>
                        <Button systemImage="text.document" onPress={handleFillConsent}>
                            Fill Consent
                        </Button>
                        {item.numbers && item.numbers.length > 0 && (
                            <Submenu button={<Button systemImage="message">Message</Button>}>
                                {item.numbers.map((number: any, idx: number) => {
                                    const phoneNumberRaw = typeof number === "string" ? number : number?.value || number?.number || String(number);
                                    const phoneType = typeof number === "object" ? number?.type || "phone" : "phone";
                                    const phoneNumberDisplay = e164ToDisplay(phoneNumberRaw) || phoneNumberRaw;
                                    return (
                                        <Button
                                            key={`message-${item.id}-${idx}`}
                                            systemImage="message"
                                            onPress={() => {
                                                router.push({
                                                    pathname: `/patients/${item.id}` as any,
                                                    params: { action: "message", phoneIndex: idx.toString() },
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
                                {item.numbers.map((number: any, idx: number) => {
                                    const phoneNumberRaw = typeof number === "string" ? number : number?.value || number?.number || String(number);
                                    const phoneType = typeof number === "object" ? number?.type || "phone" : "phone";
                                    const phoneNumberDisplay = e164ToDisplay(phoneNumberRaw) || phoneNumberRaw;
                                    return (
                                        <Button
                                            key={`call-${item.id}-${idx}`}
                                            systemImage="phone"
                                            onPress={() => {
                                                router.push({
                                                    pathname: `/patients/${item.id}` as any,
                                                    params: { action: "call", phoneIndex: idx.toString() },
                                                });
                                            }}
                                        >
                                            {phoneType}: {phoneNumberDisplay}
                                        </Button>
                                    );
                                })}
                            </Submenu>
                        )}
                        <Button systemImage="archivebox" role="destructive" onPress={handleArchive}>
                            Archive Patient
                        </Button>
                    </ContextMenu.Items>
                    <ContextMenu.Trigger>
                        <View style={{ width: "100%", height: 48 }}>
                            <TouchableOpacity onPress={handleNavigate} style={[styles.listItem, styles.listItemPadding, !isLastItem && styles.listItemBorder]}>
                                <View style={{ width: 36, height: 36 }}>
                                    <Avatar haveRing name={item.full_name} size={36} imageUrl={item.profile_image?.url || undefined} color={item.doctor?.color} />
                                </View>
                                <BaseText type="Callout" weight={500} color="labels.primary">
                                    {item.full_name}
                                </BaseText>
                            </TouchableOpacity>
                        </View>
                    </ContextMenu.Trigger>
                </ContextMenu>
            </Host>
        );
    },
    (prevProps, nextProps) => {
        // Custom comparison to prevent unnecessary re-renders
        return (
            prevProps.item.id === nextProps.item.id &&
            prevProps.item.full_name === nextProps.item.full_name &&
            prevProps.item.chart_number === nextProps.item.chart_number &&
            prevProps.item.profile_image?.url === nextProps.item.profile_image?.url &&
            prevProps.item.doctor?.color === nextProps.item.doctor?.color &&
            prevProps.isLastItem === nextProps.isLastItem &&
            JSON.stringify(prevProps.item.numbers) === JSON.stringify(nextProps.item.numbers)
        );
    },
);

export default function PatientsScreen() {
    const { selectedPractice, viewMode, selectedDoctor } = useProfileStore();
    const { profile, isAuthenticated, isProfileLoading } = useAuth();
    const queryClient = useQueryClient();
    const { data: practiceList, isLoading: isPracticeListLoading } = useGetPracticeList(isAuthenticated === true);
    const { data: practiceMembers, error: practiceMembersError, isError: isPracticeMembersError } = useGetPracticeMembers(selectedPractice?.id ?? 0, isAuthenticated === true && !!selectedPractice?.id);
    const { data: subscriptionData } = useGetSubscriptionStatus(selectedPractice?.id ?? 0, !!selectedPractice?.id);
    const needFallbackCount = !!subscriptionData && subscriptionData?.data?.limits?.current_patient_count === undefined;
    const { data: allPatientsForLimit } = useGetPatients(selectedPractice?.id);
    const insets = useSafeAreaInsets();

    const limits = subscriptionData?.data?.limits;
    const patientLimit = useMemo(() => getPatientLimitFromPlan(subscriptionData), [subscriptionData]);
    const currentPatientCount = typeof limits?.current_patient_count === "number" ? limits.current_patient_count : needFallbackCount ? (allPatientsForLimit?.data?.length ?? 0) : 0;
    const remainingPatientSlots = typeof limits?.remaining_patient_slots === "number" ? limits.remaining_patient_slots : patientLimit != null ? Math.max(0, patientLimit - currentPatientCount) : null;
    const isPatientLimitReached = patientLimit != null && ((remainingPatientSlots !== null && remainingPatientSlots === 0) || (remainingPatientSlots == null && currentPatientCount >= patientLimit));
    const headerHeight = useHeaderHeight();
    const { q, sortBy, nameOrder } = useLocalSearchParams<{ q?: string; sortBy?: string; nameOrder?: string }>();

    const hasIncompleteProfile = !!profile && (!profile.first_name || !profile.last_name) && !isProfileLoading;
    const hasNoPractice = !practiceList?.data?.length && !isPracticeListLoading;

    // Get current user's role in the selected practice
    const currentUserRole = useMemo(() => {
        if (!selectedPractice) return undefined;
        if (!practiceMembers?.data || !profile?.email) {
            return selectedPractice.role; // Fallback to practice role
        }

        // Find current user in practice members by email
        const currentMember = practiceMembers.data.find((member) => member.email === profile.email);
        return currentMember?.role || selectedPractice.role;
    }, [selectedPractice?.id, selectedPractice?.role, practiceMembers?.data, profile?.email]);

    // Check if user can see doctor filter (only owner or admin)
    const canSeeDoctorFilter = useMemo(() => {
        return selectedPractice?.role === "owner" || selectedPractice?.role === "staff";
    }, [selectedPractice?.role]);

    const availableDoctors = useMemo(() => {
        if (!practiceMembers?.data?.length) return [];
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

    const { data: patients, isLoading: isPatientsLoading, error: patientsError, isError: isPatientsError, refetch: refetchPatients } = useGetPatients(selectedPractice?.id, { doctor_id: doctorId });

    const mockPatients = useMemo(() => {
        if (!USE_MOCK_PATIENTS) return null;
        const now = new Date().toISOString();
        const items: Patient[] = [];
        alphabet.forEach((letter) => {
            for (let i = 1; i <= 5; i += 1) {
                items.push({
                    id: parseInt(`${letter.charCodeAt(0)}${i}`),
                    chart_number: null,
                    first_name: `${letter}`,
                    last_name: `Test ${i}`,
                    full_name: `${letter} Test ${i}`,
                    birth_date: null,
                    gender: null,
                    email: [],
                    numbers: [],
                    addresses: [],
                    links: [],
                    doctor: undefined,
                    profile_image: null,
                    id_card: null,
                    created_at: now,
                    updated_at: now,
                });
            }
        });
        return items;
    }, []);

    const rawPatients = USE_MOCK_PATIENTS ? mockPatients : patients?.data;
    const isLoading = isPatientsLoading;

    // Apply sorting based on sortBy and nameOrder params
    const currentPatients = useMemo(() => {
        if (!rawPatients || rawPatients.length === 0) return rawPatients;

        const sorted = [...rawPatients];

        // Sort by Name or Date
        if (sortBy === "date") {
            // Sort by created_at (newest first by default, or oldest first if nameOrder is "asc")
            sorted.sort((a, b) => {
                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                // If nameOrder is "asc", show oldest first; otherwise show newest first
                return nameOrder === "asc" ? dateA - dateB : dateB - dateA;
            });
        } else {
            // Sort by Name (default)
            sorted.sort((a, b) => {
                const nameA = (a.full_name || "").toLowerCase();
                const nameB = (b.full_name || "").toLowerCase();
                // If nameOrder is "desc", sort Z → A; otherwise sort A → Z
                if (nameOrder === "desc") {
                    return nameB.localeCompare(nameA);
                } else {
                    return nameA.localeCompare(nameB);
                }
            });
        }

        return sorted;
    }, [rawPatients, sortBy, nameOrder]);

    const archivePatientMutation = useArchivePatient(
        () => {
            refetchPatients();
            queryClient.invalidateQueries({ queryKey: ["GetArchivedPatients"] });
        },
        (error) => {
            Alert.alert("Error", error.message || "Failed to archive patient");
        },
    );

    // Stable callback for archiving patients - prevents re-render of memoized items
    const handleArchivePatient = useCallback(
        (patientId: number) => {
            archivePatientMutation.mutate(patientId);
        },
        [archivePatientMutation],
    );

    // Stable renderItem callback to prevent unnecessary re-renders
    const renderPatientItem = useCallback(({ item, index, section }: { item: Patient; index: number; section: { data: readonly Patient[] } }) => <PatientListItem item={item} isLastItem={index === section.data.length - 1} onArchive={handleArchivePatient} />, [handleArchivePatient]);

    // Stable renderSectionHeader callback
    const renderSectionHeader = useCallback(
        (info: { section: { title: string; data: readonly Patient[] } }) => {
            const { title } = info.section;
            // Hide header when sorting by date (title is "All")
            if (sortBy === "date" && title === "All") {
                return null;
            }
            return (
                <View style={styles.sectionHeader}>
                    <BaseText type="Footnote" color="labels.tertiary" weight={"600"}>
                        {title}
                    </BaseText>
                </View>
            );
        },
        [sortBy],
    ) as (info: { section: { title?: string; data: readonly Patient[] } }) => React.JSX.Element | null;

    // Group patients based on sortBy: if sorting by date, use a single section; otherwise group by first letter
    const groupedPatients = useMemo(() => {
        if (!currentPatients || currentPatients.length === 0) return {};

        if (sortBy === "date") {
            // When sorting by date, use a single section with all patients
            return { All: currentPatients };
        } else {
            // When sorting by name, group by first letter
            return currentPatients.reduce(
                (acc: Record<string, Patient[]>, patient: Patient) => {
                    const firstChar = patient.full_name?.[0]?.toUpperCase();
                    // اگر حرف اول وجود نداشته باشد یا در A-Z نباشد، آن را به بخش "#" اضافه کن
                    const letter = firstChar && alphabet.includes(firstChar) ? firstChar : "#";
                    if (!acc[letter]) acc[letter] = [];
                    acc[letter].push(patient);
                    return acc;
                },
                {} as Record<string, Patient[]>,
            );
        }
    }, [currentPatients, sortBy]);

    const [search, setSearch] = useState("");
    useEffect(() => {
        if (q !== undefined) setSearch(q);
    }, [q]);

    const [stickyEnabled, setStickyEnabled] = useState(true);
    const scrollViewRef = useRef<SectionList>(null);
    const [isDragging, setIsDragging] = useState(false);
    const alphabetContainerRef = useRef<View>(null);
    const alphabetWrapperRef = useRef<View>(null);
    const [alphabetContainerLayout, setAlphabetContainerLayout] = useState({ y: 0, height: 0 });
    const [activeLetter, setActiveLetter] = useState<string | null>(null);
    const activeIndexSV = useSharedValue(-1);

    const filteredGroupedPatients = useMemo(() => {
        if (!groupedPatients || Object.keys(groupedPatients).length === 0) return {};
        if (!search.trim()) return groupedPatients;

        const searchLower = search.toLowerCase();
        return Object.keys(groupedPatients).reduce(
            (acc, letter) => {
                const items = groupedPatients[letter]?.filter((p: Patient) => p.full_name?.toLowerCase().includes(searchLower)) || [];
                if (items.length > 0) acc[letter] = items;
                return acc;
            },
            {} as Record<string, Patient[]>,
        );
    }, [groupedPatients, search]);

    const sections = useMemo(() => {
        const keys = Object.keys(filteredGroupedPatients);

        // If sorting by date, return single section
        if (sortBy === "date") {
            return keys.map((key) => ({
                title: key,
                data: filteredGroupedPatients[key],
            }));
        }

        // Otherwise, sort alphabetically
        const hashSection = keys.find((key) => key === "#");
        const otherKeys = keys.filter((key) => key !== "#").sort();
        const sortedKeys = hashSection ? [...otherKeys, hashSection] : otherKeys;
        return sortedKeys.map((letter) => ({
            title: letter,
            data: filteredGroupedPatients[letter],
        }));
    }, [filteredGroupedPatients, sortBy]);

    const alphabetWithHash = useMemo(() => {
        // Hide alphabet sidebar when sorting by date
        if (sortBy === "date") return [];
        return sections.some((s) => s.title === "#") ? [...alphabet, "#"] : alphabet;
    }, [sections, sortBy]);

    const alphabetWithHashRef = useRef<string[]>(alphabetWithHash);
    useEffect(() => {
        alphabetWithHashRef.current = alphabetWithHash;
    }, [alphabetWithHash]);

    const alphabetLengthSV = useSharedValue(alphabetWithHash.length);

    useEffect(() => {
        alphabetLengthSV.value = alphabetWithHash.length;
    }, [alphabetWithHash.length, alphabetLengthSV]);

    const handleAlphabetPress = (letter: string, animated = true) => {
        // Don't scroll if there are too few patients (avoid scroll bugs with short lists)
        if ((currentPatients?.length ?? 0) < MIN_PATIENTS_FOR_ALPHABET_SIDEBAR) {
            return;
        }

        const sectionIndex = sections.findIndex((sec) => sec.title === letter);
        if (sectionIndex === -1 || !scrollViewRef.current) {
            return;
        }

        const scrollResponder = (scrollViewRef.current as any)?.getScrollResponder?.();

        // For first section, just scroll to top
        if (sectionIndex === 0) {
            if (scrollResponder) {
                scrollResponder.scrollTo({ y: 0, animated });
            }
            return;
        }

        // Calculate offset for other sections
        let offset = 0;
        for (let i = 0; i < sectionIndex; i++) {
            offset += SECTION_HEADER_HEIGHT + sections[i].data.length * ITEM_HEIGHT;
        }

        // Subtract header height so content appears below navigation header
        const adjustedOffset = Math.max(0, offset - (headerHeight || 0));

        if (scrollResponder) {
            scrollResponder.scrollTo({ y: adjustedOffset, animated });
        }
    };

    const handleGestureUpdate = (index: number) => {
        const letter = alphabetWithHashRef.current[index] || "";
        setActiveLetter(letter);
        const hasSection = sections.some((s) => s.title === letter);
        if (!hasSection) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        handleAlphabetPress(letter, false);
    };

    const handleGestureTap = (index: number) => {
        const letter = alphabetWithHashRef.current[index] || "";
        const hasSection = sections.some((s) => s.title === letter);
        if (!hasSection) return;
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

            const relativeY = e.y;
            if (relativeY < 0 || relativeY > alphabetContainerLayout.height) {
                return;
            }

            runOnJS(setIsDragging)(true);
        })
        .onUpdate((e) => {
            const containerHeight = alphabetContainerLayout.height;
            if (containerHeight === 0) return;

            const relativeY = e.y;
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

        const relativeY = e.y;
        if (relativeY < 0 || relativeY > containerHeight) return;

        const alphabetLength = alphabetLengthSV.value;
        const itemHeight = containerHeight / alphabetLength;
        const index = Math.floor(relativeY / itemHeight);
        const clampedIndex = Math.max(0, Math.min(index, alphabetLength - 1));
        runOnJS(handleGestureTap)(clampedIndex);
    });

    const composedGesture = Gesture.Race(pan, tap);

    // Create skeleton sections for loading state
    const skeletonSections = useMemo(() => {
        if (!isLoading) return [];
        // Create sections similar to real data structure - 10 items total
        const letters = ["A", "B", "C", "D", "E"];
        return letters.map((letter) => ({
            title: letter,
            data: Array.from({ length: 2 }), // 2 items per section = 10 total
        }));
    }, [isLoading]);

    // Empty state when profile incomplete (modal is pushed by layout; this is the home background)
    if (hasIncompleteProfile) {
        return (
            <View style={[styles.errorContainer, { paddingTop: headerHeight + spacing["5"] }]}>
                <BaseText type="Title3" color="labels.primary" weight="600" style={{ marginBottom: spacing["2"], textAlign: "center" }}>
                    Complete your profile
                </BaseText>
                <BaseText type="Footnote" color="labels.secondary" style={{ marginBottom: spacing["4"], textAlign: "center" }}>
                    Complete the steps in the modal to get started.
                </BaseText>
                <BaseButton label="Complete profile" ButtonStyle="Filled" size="Large" rounded={true} onPress={() => router.push({ pathname: "/(auth)/completeProfile", params: { requireCompleteProfile: "1" } })} leftIcon={<IconSymbol name="person.crop.circle.badge.plus" size={20} color={colors.system.white} />} />
            </View>
        );
    }

    // Empty state when no practice (modal is pushed by layout; this is the home background)
    if (hasNoPractice) {
        return (
            <View style={[styles.errorContainer, { paddingTop: headerHeight + spacing["5"] }]}>
                <BaseText type="Title3" color="labels.primary" weight="600" style={{ marginBottom: spacing["2"], textAlign: "center" }}>
                    Set up your practice
                </BaseText>
                <BaseText type="Footnote" color="labels.secondary" style={{ marginBottom: spacing["4"], textAlign: "center" }}>
                    Complete the steps in the modal to get started.
                </BaseText>
                <BaseButton label="Set up practice" ButtonStyle="Filled" size="Large" rounded={true} onPress={() => router.push({ pathname: "/(auth)/select-role", params: { requirePractice: "1" } })} leftIcon={<IconSymbol name="building.2" size={20} color={colors.system.white} />} />
            </View>
        );
    }

    // Show error state if there's an error
    if (isPatientsError || isPracticeMembersError) {
        const errorMessage = (patientsError as any)?.message || (practiceMembersError as any)?.message || "Failed to load data. Please try again.";
        return (
            <View style={[styles.errorContainer, { paddingTop: headerHeight + spacing["5"] }]}>
                <IconSymbol name="exclamationmark.triangle.fill" size={48} color={colors.system.red} />
                <BaseText type="Body" color="labels.primary" weight="600" style={{ marginTop: spacing["3"], marginBottom: spacing["1"] }}>
                    Something went wrong
                </BaseText>
                <BaseText type="Footnote" color="labels.secondary" style={{ marginBottom: spacing["4"], textAlign: "center" }}>
                    {errorMessage}
                </BaseText>
                <BaseButton
                    label="Try Again"
                    ButtonStyle="Tinted"
                    size="Medium"
                    rounded={true}
                    onPress={() => {
                        refetchPatients();
                    }}
                    leftIcon={<IconSymbol name="arrow.clockwise" size={20} color={colors.system.blue} />}
                />
            </View>
        );
    }

    return (
        <>
            {isLoading ? (
                <SectionList
                    style={{ flex: 1, backgroundColor: "white" }}
                    sections={skeletonSections}
                    keyExtractor={(_, index) => `skeleton-${index}`}
                    stickySectionHeadersEnabled={false}
                    showsVerticalScrollIndicator={false}
                    contentInsetAdjustmentBehavior="automatic"
                    contentContainerStyle={{ paddingEnd: spacing["5"], backgroundColor: "white" }}
                    renderItem={({ index }) => <PatientSkeleton haveRing={index % 3 === 0} />}
                    renderSectionHeader={({ section: { title } }) => (
                        <View style={styles.sectionHeader}>
                            <BaseText type="Footnote" color="labels.tertiary" weight={"600"}>
                                {title}
                            </BaseText>
                        </View>
                    )}
                />
            ) : currentPatients && currentPatients.length > 0 ? (
                <SectionList
                    ref={scrollViewRef}
                    style={{ flex: 1, backgroundColor: "white" }}
                    sections={sections}
                    keyExtractor={(item) => `patient-${item.id}`}
                    stickySectionHeadersEnabled={stickyEnabled}
                    showsVerticalScrollIndicator={false}
                    scrollEventThrottle={16}
                    contentInsetAdjustmentBehavior="automatic"
                    contentContainerStyle={{ paddingEnd: spacing["5"], backgroundColor: "white" }}
                    removeClippedSubviews={false}
                    initialNumToRender={20}
                    maxToRenderPerBatch={10}
                    windowSize={21}
                    getItemLayout={(data, index) => {
                        // Uses ITEM_HEIGHT and SECTION_HEADER_HEIGHT constants from top of file
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
                    renderItem={renderPatientItem}
                    renderSectionHeader={renderSectionHeader}
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
                                            if (isPatientLimitReached) {
                                                Alert.alert("Plan Limit Reached", "You have reached the maximum number of patients allowed in your current plan. Please upgrade your plan to add more patients.", [
                                                    { text: "Cancel", style: "cancel" },
                                                    { text: "Upgrade Plan", onPress: () => router.push("/(profile)/subscription") },
                                                ]);
                                                return;
                                            }
                                            if (currentUserRole === "staff" || currentUserRole === "owner") {
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
                                                    router.push("/(modals)/add-patient/select-doctor");
                                                }
                                            } else {
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
                <View className="absolute  right-0 top-1/2 -translate-y-1/2 items-center justify-center" ref={alphabetContainerRef} style={{ zIndex: 1 }} pointerEvents="box-none">
                    <GestureDetector gesture={composedGesture}>
                        <View ref={alphabetWrapperRef} style={styles.alphabetWrapper} pointerEvents="auto" onLayout={onAlphabetContainerLayout}>
                            {alphabetWithHash.map((letter) => {
                                const hasSection = sections.some((s) => s.title === letter);
                                const isActive = isDragging && activeLetter === letter;
                                return (
                                    <View key={letter} style={[styles.alphabetItem, isActive && styles.activeAlphabetItem]}>
                                        <BaseText type="Caption1" color="system.blue" weight={600}>
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
    listItem: { flexDirection: "row", alignItems: "center", gap: spacing["2"], backgroundColor: colors.system.white },
    listItemPadding: { paddingHorizontal: spacing["4"], paddingVertical: spacing["2"] },
    listItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.system.gray5 },
    sectionHeader: { backgroundColor: colors.background, paddingHorizontal: spacing["4"], height: SECTION_HEADER_HEIGHT, justifyContent: "center" },
    alphabetWrapper: { alignItems: "center", justifyContent: "center" },
    alphabetItem: { paddingHorizontal: spacing["0.5"], marginVertical: 0 },
    activeAlphabetItem: { backgroundColor: "rgba(0, 122, 255, 0.1)", borderRadius: 4 },
    noResults: { alignItems: "center", justifyContent: "center", gap: spacing["1"] },
    errorContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacing["5"],
        backgroundColor: "white",
    },
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
