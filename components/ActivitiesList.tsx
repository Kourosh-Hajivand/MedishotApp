import { ActivityItem, BaseText, ErrorState } from "@/components";
import { ActivitySkeleton } from "@/components/skeleton/ActivitySkeleton";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { ActivityLog } from "@/utils/service/models/ResponseModels";
import dayjs from "dayjs";
import { LinearGradient } from "expo-linear-gradient";
import React, { Fragment, useCallback, useMemo } from "react";
import { SectionList, StyleSheet, View, type ListRenderItemInfo, type StyleProp, type ViewStyle } from "react-native";

export type ActivitySection = {
    date: string;
    data: ActivityLog[];
};

export interface ActivitiesListProps {
    activities: ActivityLog[];
    isLoading: boolean;
    error?: Error | null;
    isError?: boolean;
    onRetry?: () => void;
    emptyTitle?: string;
    emptyDescription?: string;
    /** "list" = SectionList (self-scrolling). "flat" = View (for use inside ScrollView) */
    variant?: "list" | "flat";
    style?: StyleProp<ViewStyle>;
    contentContainerStyle?: StyleProp<ViewStyle>;
    /** Optional bottom padding for list variant (e.g. insets.bottom) */
    listPaddingBottom?: number;
}

function SectionHeader({ date }: { date: string }) {
    const dateLabel = dayjs(date).format("MMMM D, YYYY");
    const isToday = dayjs(date).isSame(dayjs(), "day");
    const isYesterday = dayjs(date).isSame(dayjs().subtract(1, "day"), "day");
    let displayDate = dateLabel;
    if (isToday) displayDate = "Today";
    else if (isYesterday) displayDate = "Yesterday";
    else if (dayjs(date).isSame(dayjs(), "year")) {
        displayDate = dayjs(date).format("MMMM D");
    }
    return (
        <LinearGradient colors={["rgba(255, 255, 255, 0.08)", "rgba(120, 120, 128, 0.08)"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={sectionHeaderStyles.header} className="w-full">
            <BaseText type="Footnote" weight="600" color="labels.tertiary">
                {displayDate}
            </BaseText>
        </LinearGradient>
    );
}

const sectionHeaderStyles = StyleSheet.create({
    header: { paddingHorizontal: 16, paddingVertical: 4, zIndex: 0 },
});

export const ActivitiesList: React.FC<ActivitiesListProps> = React.memo(({ activities, isLoading, error, isError, onRetry, emptyTitle = "No Activities", emptyDescription = "No activities yet.", variant = "list", style, contentContainerStyle, listPaddingBottom = 0 }) => {
    const groupedSections = useMemo<ActivitySection[]>(() => {
        if (!activities?.length) return [];

        const grouped: Record<string, ActivityLog[]> = {};
        activities.forEach((a) => {
            const dateKey = dayjs(a.created_at || a.updated_at).format("YYYY-MM-DD");
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(a);
        });

        return Object.keys(grouped)
            .sort((a, b) => dayjs(b).valueOf() - dayjs(a).valueOf())
            .map((dateKey) => ({
                date: dateKey,
                data: grouped[dateKey].sort((a, b) => {
                    const tA = dayjs(a.created_at || a.updated_at).valueOf();
                    const tB = dayjs(b.created_at || b.updated_at).valueOf();
                    return tB - tA;
                }),
            }));
    }, [activities]);

    const renderSectionHeader = useCallback(({ section }: { section: ActivitySection }) => <SectionHeader date={section.date} />, []);

    const renderItem = useCallback(({ item, index, section }: ListRenderItemInfo<ActivityLog> & { section: ActivitySection }) => {
        const isLast = index === section.data.length - 1;
        return (
            <Fragment>
                <ActivityItem activity={item} showBorder={false} showDateHeader={false} />
                {!isLast && <View style={styles.divider} />}
            </Fragment>
        );
    }, []);

    const keyExtractor = useCallback((item: ActivityLog) => item.id.toString(), []);

    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, style]}>
                {Array.from({ length: 5 }).map((_, i) => (
                    <ActivitySkeleton key={`skeleton-${i}`} showDate={i === 0 || i === 2} showBorder={i < 4} />
                ))}
            </View>
        );
    }

    if (isError) {
        return <ErrorState message={(error as any)?.message ?? "Failed to load activities"} onRetry={onRetry} title="Failed to load activities" />;
    }

    if (!activities?.length) {
        return (
            <View style={[styles.emptyContainer, style]}>
                <IconSymbol name="clock" color={colors.labels.tertiary} size={64} />
                <BaseText type="Title2" weight="600" color="labels.secondary" style={styles.emptyTitle}>
                    {emptyTitle}
                </BaseText>
                {emptyDescription ? (
                    <BaseText type="Body" color="labels.tertiary" style={styles.emptyDescription}>
                        {emptyDescription}
                    </BaseText>
                ) : null}
            </View>
        );
    }

    if (variant === "flat") {
        return (
            <View style={[styles.flatContainer, style]}>
                {groupedSections.map((section) => (
                    <View key={section.date}>
                        <SectionHeader date={section.date} />
                        {section.data.map((item, index) => {
                            const isLast = index === section.data.length - 1;
                            return (
                                <Fragment key={item.id}>
                                    <ActivityItem activity={item} showBorder={false} showDateHeader={false} />
                                    {!isLast && <View style={styles.divider} />}
                                </Fragment>
                            );
                        })}
                    </View>
                ))}
            </View>
        );
    }

    return (
        <SectionList<ActivityLog, ActivitySection>
            sections={groupedSections}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            keyExtractor={keyExtractor}
            contentContainerStyle={[styles.listContent, contentContainerStyle, listPaddingBottom ? { paddingBottom: listPaddingBottom } : undefined]}
            style={style}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
        />
    );
});

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        width: "100%",
        backgroundColor: colors.system.white,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
        paddingVertical: 64,
    },
    emptyTitle: { marginTop: 16, marginBottom: 8 },
    emptyDescription: { textAlign: "center" },
    listContent: { paddingVertical: 8 },
    flatContainer: { paddingVertical: 8 },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginHorizontal: 16,
    },
});
