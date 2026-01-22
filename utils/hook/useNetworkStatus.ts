import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

export interface NetworkStatus {
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    type: string | null;
}

export const useNetworkStatus = () => {
    const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
        isConnected: null,
        isInternetReachable: null,
        type: null,
    });

    useEffect(() => {
        // Get initial network state
        const unsubscribe = NetInfo.addEventListener((state) => {
            setNetworkStatus({
                isConnected: state.isConnected,
                isInternetReachable: state.isInternetReachable,
                type: state.type,
            });
        });

        // Also check immediately
        NetInfo.fetch().then((state) => {
            setNetworkStatus({
                isConnected: state.isConnected,
                isInternetReachable: state.isInternetReachable,
                type: state.type,
            });
        });

        return () => {
            unsubscribe();
        };
    }, []);

    return {
        ...networkStatus,
        isOffline: networkStatus.isConnected === false || networkStatus.isInternetReachable === false,
    };
};
