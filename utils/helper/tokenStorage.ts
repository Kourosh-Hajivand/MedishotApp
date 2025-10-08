import * as SecureStore from "expo-secure-store";
import { StorageKeys } from "../../models/enums";

/**
 * Store Access and Refresh Tokens securely
 */
export const storeTokens = async (
    accessToken: string,
    // refreshToken?: string
): Promise<void> => {
    try {
        await SecureStore.setItemAsync(StorageKeys.token, accessToken);
        // if (refreshToken) {
        //   await SecureStore.setItemAsync(StorageKeys.refreshToken, refreshToken);
        // }
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
    // refreshToken: string | null;
}> => {
    try {
        const accessToken = await SecureStore.getItemAsync(StorageKeys.token);
        // const refreshToken = await SecureStore.getItemAsync(StorageKeys.refreshToken);
        return {
            accessToken,
            // refreshToken,
        };
    } catch (error) {
        console.error("Error retrieving tokens:", error);
        return { accessToken: null };
    }
};

/**
 * Remove stored tokens
 */
export const removeTokens = async (): Promise<void> => {
    try {
        await SecureStore.deleteItemAsync(StorageKeys.token);
        // await SecureStore.deleteItemAsync(StorageKeys.refreshToken);
    } catch (error) {
        console.error("Error removing tokens:", error);
        throw new Error("Failed to remove tokens");
    }
};
