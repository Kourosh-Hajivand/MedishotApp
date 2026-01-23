import AsyncStorage from "@react-native-async-storage/async-storage";

const FAILED_REQUEST_KEY = "failed_request_500";

export interface FailedRequest {
    url: string;
    method: string;
    baseURL?: string;
    data?: unknown;
    params?: unknown;
    headers?: Record<string, string>;
}

/**
 * Store failed request information for retry
 */
export const storeFailedRequest = async (request: FailedRequest): Promise<void> => {
    try {
        await AsyncStorage.setItem(FAILED_REQUEST_KEY, JSON.stringify(request));
    } catch (error) {
        // Error handled silently
    }
};

/**
 * Get stored failed request
 */
export const getFailedRequest = async (): Promise<FailedRequest | null> => {
    try {
        const stored = await AsyncStorage.getItem(FAILED_REQUEST_KEY);
        if (stored) {
            return JSON.parse(stored) as FailedRequest;
        }
        return null;
    } catch (error) {
        return null;
    }
};

/**
 * Clear stored failed request
 */
export const clearFailedRequest = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(FAILED_REQUEST_KEY);
    } catch (error) {
        // Error handled silently
    }
};
