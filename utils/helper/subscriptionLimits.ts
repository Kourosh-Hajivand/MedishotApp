import type { SubscriptionStatusResponse } from "@/utils/service/models/ResponseModels";

/**
 * Get patient_limit from subscription status.
 * Uses API limits when present; otherwise derives from current plan features (e.g. Free plan).
 */
export function getPatientLimitFromPlan(subscriptionData: SubscriptionStatusResponse | undefined): number | null {
    const limits = subscriptionData?.data?.limits;
    if (limits?.patient_limit != null) return limits.patient_limit;
    const plan = subscriptionData?.data?.current_plan ?? subscriptionData?.data?.plan ?? subscriptionData?.data?.current_subscription?.plan;
    const feature = plan?.features?.find((f) => f.feature_type === "patient_count");
    if (!feature?.feature_value) return null;
    const value = parseInt(feature.feature_value, 10);
    return Number.isNaN(value) ? null : value;
}
