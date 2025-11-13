import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { StorageKeys } from "../../models/enums";

const setItemWithFallback = async (key: string, value: string) => {
    const isSecureStoreAvailable = await SecureStore.isAvailableAsync();

    if (isSecureStoreAvailable) {
        try {
            await SecureStore.setItemAsync(key, value);
            return;
        } catch (secureError) {
            console.warn("SecureStore setItemAsync failed, falling back to AsyncStorage", secureError);
        }
    }

    try {
        await AsyncStorage.setItem(key, value);
    } catch (asyncStorageError) {
        console.error("AsyncStorage setItem failed", asyncStorageError);
        throw asyncStorageError;
    }
};

const getItemWithFallback = async (key: string) => {
    const isSecureStoreAvailable = await SecureStore.isAvailableAsync();

    if (isSecureStoreAvailable) {
        try {
            const value = await SecureStore.getItemAsync(key);
            if (value !== null) {
                return value;
            }
        } catch (secureError) {
            console.warn("SecureStore getItemAsync failed, falling back to AsyncStorage", secureError);
        }
    }

    try {
        return await AsyncStorage.getItem(key);
    } catch (asyncStorageError) {
        console.error("AsyncStorage getItem failed", asyncStorageError);
        return null;
    }
};

const removeItemWithFallback = async (key: string) => {
    const isSecureStoreAvailable = await SecureStore.isAvailableAsync();

    if (isSecureStoreAvailable) {
        try {
            await SecureStore.deleteItemAsync(key);
            return;
        } catch (secureError) {
            console.warn("SecureStore deleteItemAsync failed, falling back to AsyncStorage", secureError);
        }
    }

    try {
        await AsyncStorage.removeItem(key);
    } catch (asyncStorageError) {
        console.error("AsyncStorage removeItem failed", asyncStorageError);
        throw asyncStorageError;
    }
};

/**
 * Store Access and Refresh Tokens securely
 */
export const storeTokens = async (accessToken: string, refreshToken?: string): Promise<void> => {
    try {
        await setItemWithFallback(StorageKeys.token, accessToken);
        if (refreshToken) {
            await setItemWithFallback(StorageKeys.refreshToken, refreshToken);
        }
    } catch (error) {
        console.error("Error storing tokens:", error);
        throw new Error("Failed to store tokens");
    }
};

/**
 * Retrieve Access and Refresh Tokens
 */
export const getTokens = async (): Promise<{
    accessToken: string | null;
    refreshToken: string | null;
}> => {
    try {
        const accessToken = await getItemWithFallback(StorageKeys.token);
        const refreshToken = await getItemWithFallback(StorageKeys.refreshToken);
        return {
            accessToken,
            refreshToken,
        };
    } catch (error) {
        console.error("Error retrieving tokens:", error);
        return { accessToken: null, refreshToken: null };
    }
};

/**
 * Remove stored tokens
 */
export const removeTokens = async (): Promise<void> => {
    try {
        await removeItemWithFallback(StorageKeys.token);
        await removeItemWithFallback(StorageKeys.refreshToken);
    } catch (error) {
        console.error("Error removing tokens:", error);
        throw new Error("Failed to remove tokens");
    }
};
