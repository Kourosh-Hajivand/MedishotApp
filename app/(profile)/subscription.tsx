import { BaseButton, BaseText } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol.ios";
import { headerHeight } from "@/constants/theme";
import { spacing } from "@/styles/spaces";
import colors from "@/theme/colors";
import { useGetPlans, useGetSubscriptionStatus } from "@/utils/hook";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SubscriptionScreen() {
    const insets = useSafeAreaInsets();
    const { selectedPractice } = useProfileStore();
    const { data: plansData, isLoading: isLoadingPlans } = useGetPlans(!!selectedPractice?.id);
    const { data: subscriptionData, isLoading: isLoadingSubscription } = useGetSubscriptionStatus(selectedPractice?.id ?? 0, !!selectedPractice?.id);

    console.log("====================================");
    console.log(plansData);
    console.log("====================================");
    // Calculate days remaining
    const daysRemaining = useMemo(() => {
        if (!subscriptionData?.data?.ends_at) return null;
        const endDate = new Date(subscriptionData.data.ends_at);
        const today = new Date();
        const diffTime = endDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    }, [subscriptionData?.data?.ends_at]);

    // Get current plan
    const currentPlan = subscriptionData?.data?.plan;

    // Get plan color based on plan name
    const getPlanColor = (planName: string) => {
        const name = planName.toLowerCase();
        if (name.includes("basic")) return colors.system.blue;
        if (name.includes("pro")) return "#af52de"; // Purple
        return colors.system.blue;
    };

    // Format price - display exactly as received from API
    const formatPrice = (price: string | number, currency: string = "usd", billingInterval: string) => {
        const priceNum = typeof price === "string" ? parseFloat(price) : price;
        const symbol = currency.toLowerCase() === "usd" ? "$" : currency.toUpperCase();
        const interval = billingInterval?.toLowerCase();

        if (interval === "yearly" || interval === "year") {
            return `${symbol}${priceNum}`;
        }
        return `${symbol}${priceNum} / month`;
    };

    // Get annual price from plans - find yearly version of the plan
    const getAnnualPrice = (plan: any, allPlans: any[]) => {
        // Find yearly version of the same plan (by name/slug)
        const yearlyPlan = allPlans?.find((p) => p.name?.toLowerCase() === plan.name?.toLowerCase() && (p.billing_interval?.toLowerCase() === "yearly" || p.billing_interval?.toLowerCase() === "year"));
        if (yearlyPlan) {
            return typeof yearlyPlan.price === "string" ? parseFloat(yearlyPlan.price) : yearlyPlan.price;
        }
        return null;
    };

    // Get plan features text - use display_name if available, otherwise format based on feature_key
    const getPlanFeatures = (plan: any) => {
        const features: string[] = [];
        plan.features?.forEach((feature: any) => {
            // Use display_name if available
            if (feature.display_name) {
                features.push(feature.display_name);
                return;
            }

            // Otherwise, format based on feature_key and feature_type
            const featureKey = feature.feature_key?.toLowerCase();
            const featureType = feature.feature_type?.toLowerCase();
            const featureValue = feature.feature_value;

            if (featureType === "limit" || featureType?.includes("limit")) {
                if (featureKey?.includes("doctor")) {
                    features.push(`${featureValue} Doctors / Staff`);
                } else if (featureKey?.includes("practice")) {
                    features.push(`${featureValue} Practice${parseInt(featureValue) > 1 ? "s" : ""}`);
                } else if (featureKey?.includes("patient")) {
                    if (featureValue === "unlimited" || featureValue === "-1") {
                        features.push("Unlimited Patients");
                    } else {
                        features.push(`${featureValue} Patients`);
                    }
                } else if (featureKey?.includes("storage")) {
                    if (featureValue === "unlimited" || featureValue === "-1") {
                        features.push("Unlimited Cloud Storage");
                    } else {
                        features.push(`${featureValue} Cloud Storage`);
                    }
                } else {
                    // Generic limit feature
                    features.push(`${featureValue} ${featureKey?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()) || ""}`);
                }
            } else if (featureType === "boolean" && featureValue === "true") {
                features.push(feature.description || featureKey?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()) || "");
            } else if (feature.description) {
                features.push(feature.description);
            }
        });
        return features;
    };

    const handlePurchase = (planId: number) => {
        // TODO: Navigate to purchase screen or handle purchase
        console.log("Purchase plan:", planId);
    };

    if (isLoadingPlans || isLoadingSubscription) {
        return (
            <View style={[styles.container, { paddingTop: insets.top + headerHeight, justifyContent: "center", alignItems: "center" }]}>
                <ActivityIndicator size="large" color={colors.system.blue} />
            </View>
        );
    }

    // Get current plan price - use exactly as received from API
    const currentPlanPrice = currentPlan?.price || 0;
    const currentPlanBillingInterval = currentPlan?.billing_interval || "monthly";
    const currentPlanFeatures = currentPlan ? getPlanFeatures(currentPlan) : [];

    return (
        <ScrollView style={[styles.container, { paddingTop: insets.top + 40 }]} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
            {/* Current Subscription Section */}
            <View style={styles.currentPlanSection}>
                {/* Header Content */}
                <View style={styles.currentPlanHeaderContent}>
                    <BaseText type="Body" weight="400" color="labels.secondary" style={styles.currentPlanLabel}>
                        Your Subscription Plan:
                    </BaseText>
                    <BaseText
                        type="Title1"
                        weight="700"
                        style={[
                            styles.currentPlanName,
                            {
                                color: currentPlan ? getPlanColor(currentPlan.name) : colors.system.black,
                            },
                        ]}
                    >
                        {currentPlan?.name || "No Plan"}
                    </BaseText>
                    {daysRemaining !== null && daysRemaining > 0 && (
                        <BaseText type="Body" weight="400" color="labels.secondary" style={styles.daysRemaining}>
                            {daysRemaining} Days Remaining
                        </BaseText>
                    )}
                    <View style={styles.spacer} />
                </View>

                {/* Current Plan Card */}
                {currentPlan && (
                    <View style={styles.currentPlanCard}>
                        <View style={styles.currentPlanCardContent}>
                            {/* Plan Header with Gradient Background */}
                            <View style={styles.currentPlanCardHeader}>
                                <BaseText type="Title3" weight="600" color="labels.primary">
                                    {currentPlan.name}
                                </BaseText>
                            </View>

                            {/* Plan Features */}
                            <View style={styles.currentPlanFeatures}>
                                {currentPlanFeatures.map((feature, index) => (
                                    <BaseText key={index} type="Body" weight="400" color="labels.primary" style={styles.featureItem}>
                                        <BaseText type="Body" weight="400" color="labels.tertiary">
                                            􀅼
                                        </BaseText>
                                        {" " + feature}
                                    </BaseText>
                                ))}
                            </View>
                        </View>

                        {/* Footer with Time Left */}
                        <LinearGradient colors={["#ffffff", "#f9f9f9"]} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={styles.currentPlanFooter}>
                            <BaseText type="Body" weight="400" color="labels.primary">
                                Time left:
                            </BaseText>
                            <BaseText type="Body" weight="600" color="labels.primary">
                                {daysRemaining !== null && daysRemaining > 0 ? `${daysRemaining} Days Remaining` : "Expired"}
                            </BaseText>
                        </LinearGradient>
                    </View>
                )}

                {/* Chevron Circle */}
                <View style={styles.chevronContainer}>
                    <View style={styles.chevronCircle}>
                        <IconSymbol name="chevron.down" size={16} color={colors.system.black} />
                    </View>
                </View>
            </View>

            {/* Premium Plans Section */}
            <View style={styles.premiumSection}>
                <BaseText type="Body" weight="400" color="labels.primary" style={styles.premiumTitle}>
                    Access More With{" "}
                    <BaseText weight="600" style={{ color: "#af52de" }}>
                        Medishots Premium
                    </BaseText>
                </BaseText>

                {/* Plan Cards */}
                {plansData?.data?.map((plan) => {
                    const planColor = getPlanColor(plan.name);
                    const isCurrentPlan = currentPlan?.id === plan.id;
                    const features = getPlanFeatures(plan);
                    const planPrice = plan.price; // Use price exactly as received from API
                    const planBillingInterval = plan.billing_interval || "monthly";
                    const annualPrice = getAnnualPrice(plan, plansData?.data || []);

                    // Create gradient background for plan header
                    const gradientColors: [string, string, string, string, string] =
                        planColor === colors.system.blue
                            ? ["rgba(0, 122, 255, 0.08)", "rgba(199, 199, 199, 0.08)", "rgba(0, 122, 255, 0.08)", "rgba(165, 165, 165, 0.08)", "rgba(0, 122, 255, 0.08)"]
                            : ["rgba(175, 82, 222, 0.08)", "rgba(199, 199, 199, 0.08)", "rgba(175, 82, 222, 0.08)", "rgba(165, 165, 165, 0.08)", "rgba(175, 82, 222, 0.08)"];

                    return (
                        <View key={plan.id} style={styles.planCard}>
                            <View style={styles.planCardInner}>
                                {/* Plan Header */}
                                <View style={styles.planHeaderWrapper}>
                                    <View style={styles.planHeaderContent}>
                                        <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} locations={[0, 0.39696, 0.63453, 0.79751, 1]} style={styles.planHeaderGradient}>
                                            <BaseText type="Title3" weight="600" style={{ color: planColor, flex: 1 }} className="capitalize">
                                                {plan.name}
                                            </BaseText>
                                            <BaseText type="Title3" weight="600" style={{ color: planColor }}>
                                                {formatPrice(planPrice, plan.currency, planBillingInterval)}
                                            </BaseText>
                                        </LinearGradient>
                                        {annualPrice !== null && (
                                            <View style={styles.annualBadge}>
                                                <BaseText type="Footnote" weight="400" color="labels.primary">
                                                    Annual:
                                                </BaseText>
                                                <BaseText type="Callout" weight="400" color="labels.primary">
                                                    {formatPrice(annualPrice, plan.currency, "yearly")}
                                                </BaseText>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {/* Plan Features */}
                                <View style={styles.planFeatures}>
                                    {features.map((feature, index) => (
                                        <View key={index} style={styles.featureItemContainer}>
                                            <IconSymbol name="plus" size={16} color={colors.labels.tertiary} />
                                            <BaseText key={index} type="Body" weight="400" color="labels.primary" style={styles.featureItem}>
                                                {" " + feature}
                                            </BaseText>
                                        </View>
                                    ))}
                                </View>
                            </View>

                            {/* Purchase Button */}
                            <LinearGradient colors={["#ffffff", "#f9f9f9"]} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={styles.planFooter}>
                                <BaseButton label={isCurrentPlan ? "Current Plan" : "Purchase Now"} onPress={() => handlePurchase(plan.id)} disabled={isCurrentPlan} ButtonStyle="Filled" size="Medium" rounded style={styles.purchaseButton} />
                            </LinearGradient>
                        </View>
                    );
                })}
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
        paddingBottom: spacing["6"],
    },
    currentPlanSection: {
        backgroundColor: "#ffffff",
        borderBottomWidth: 3,
        borderBottomColor: "rgba(0, 0, 0, 0.08)",
        paddingTop: 0,
        paddingBottom: spacing["3"], // 12px
        paddingHorizontal: spacing["4"], // 16px
    },
    currentPlanHeaderContent: {
        alignItems: "center",
        paddingTop: spacing["6"], // 24px
        paddingBottom: spacing["3"], // 12px
        gap: 0,
    },
    currentPlanLabel: {
        fontSize: 17,
        lineHeight: 22,
        letterSpacing: -0.43,
        paddingTop: 3,
        paddingBottom: spacing["2"], // 8px
    },
    currentPlanName: {
        fontSize: 44,
        lineHeight: 41,
        letterSpacing: 0.4,
        paddingTop: 10,
        paddingBottom: spacing["2"], // 8px
    },
    daysRemaining: {
        fontSize: 17,
        lineHeight: 22,
        letterSpacing: -0.43,
        paddingTop: 3,
        paddingBottom: spacing["2"], // 8px
    },
    spacer: {
        height: 22,
        width: "100%",
    },
    currentPlanCard: {
        backgroundColor: "#ffffff",
        borderRadius: 12,
        overflow: "hidden",
        marginTop: spacing["2.5"], // 10px - gap between header and card
    },
    currentPlanCardContent: {
        padding: spacing["4"], // 16px
        gap: spacing["2.5"], // 10px
    },
    currentPlanCardHeader: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing["2"], // 8px
        paddingVertical: spacing["1"], // 4px
        borderRadius: 8,
        backgroundColor: "rgba(120, 120, 128, 0.08)",
    },
    currentPlanFeatures: {
        gap: 0,
    },
    featureItem: {
        fontSize: 17,
        lineHeight: 28,
        letterSpacing: -0.43,
        marginBottom: 0,
    },
    featureItemContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing["1"], // 10px
    },
    currentPlanFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: spacing["4"], // 16px
    },
    chevronContainer: {
        position: "absolute",
        bottom: -16.5,
        left: "50%",
        marginLeft: -16.5,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
    },
    chevronCircle: {
        width: 33,
        height: 33,
        borderRadius: 9999,
        backgroundColor: "#ffffff",
        borderWidth: 3,
        borderColor: "#d8d8d8",
        alignItems: "center",
        justifyContent: "center",
    },
    premiumSection: {
        backgroundColor: "#f9f9f9",
        padding: spacing["4"], // 16px
        gap: spacing["2.5"], // 10px
    },
    premiumTitle: {
        fontSize: 17,
        lineHeight: 22,
        letterSpacing: -0.43,
    },
    planCard: {
        backgroundColor: "#ffffff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#f2f2f7",
        overflow: "hidden",
    },
    planCardInner: {
        padding: spacing["4"], // 16px
        gap: spacing["2.5"], // 10px
    },
    planHeaderWrapper: {
        gap: spacing["3"], // 12px - gap between header gradient and annual badge
    },
    planHeaderContent: {
        position: "relative",
    },
    planHeaderGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacing["2"], // 8px
        paddingVertical: spacing["1"], // 4px
        borderRadius: 8,
        minHeight: 33,
    },
    annualBadge: {
        position: "absolute",
        right: 0,
        top: 45,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing["2.5"], // 10px
        backgroundColor: "#FFCC00",
        paddingHorizontal: spacing["2"], // 8px
        paddingVertical: spacing["1"], // 4px
        borderRadius: 8,
    },
    planFeatures: {
        paddingTop: 0, // Features start immediately after header
        gap: 0,
    },
    planFooter: {
        padding: spacing["4"], // 16px
    },
    purchaseButton: {
        width: "100%",
    },
});
