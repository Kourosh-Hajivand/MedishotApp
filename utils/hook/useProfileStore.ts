import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { Practice } from "../service/models/ResponseModels";

interface ProfileStore {
    selectedProfile: "profile" | "practice" | null;
    selectedPractice: Practice | null;
    setSelectedProfile: (type: "profile" | "practice", practice?: Practice) => void;
    resetSelection: () => void;
    isLoaded: boolean;
}

const STORAGE_KEY = "profile_selection";

export const useProfileStore = create<ProfileStore>((set, get) => ({
    selectedProfile: null,
    selectedPractice: null,
    isLoaded: false,

    setSelectedProfile: async (type, practice) => {
        const newState = {
            selectedProfile: type,
            selectedPractice: type === "practice" ? practice || null : null,
        };

        set(newState);

        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
        } catch (error) {
            console.error("خطا در ذخیره انتخاب پروفایل:", error);
        }
    },

    resetSelection: async () => {
        const newState = {
            selectedProfile: null,
            selectedPractice: null,
        };

        set(newState);

        try {
            await AsyncStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error("خطا در حذف انتخاب پروفایل:", error);
        }
    },
}));

export const loadProfileSelection = async (practiceList?: any[]) => {
    try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            useProfileStore.setState({
                selectedProfile: parsed.selectedProfile,
                selectedPractice: parsed.selectedPractice,
                isLoaded: true,
            });
        } else {
            if (practiceList && practiceList.length > 0) {
                useProfileStore.setState({
                    selectedProfile: "practice",
                    selectedPractice: practiceList[0],
                    isLoaded: true,
                });
                await AsyncStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify({
                        selectedProfile: "practice",
                        selectedPractice: practiceList[0],
                    }),
                );
            } else {
                useProfileStore.setState({ isLoaded: true });
            }
        }
    } catch (error) {
        console.error("خطا در بارگذاری انتخاب پروفایل:", error);
        useProfileStore.setState({ isLoaded: true });
    }
};

export const validateAndSetDefaultSelection = async (practiceList?: any[]) => {
    const currentState = useProfileStore.getState();

    if (currentState.selectedProfile === "practice" && currentState.selectedPractice && practiceList) {
        const isValidPractice = practiceList.some((p) => p.id === currentState.selectedPractice?.id);

        if (!isValidPractice && practiceList.length > 0) {
            useProfileStore.setState({
                selectedProfile: "practice",
                selectedPractice: practiceList[0],
            });

            await AsyncStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    selectedProfile: "practice",
                    selectedPractice: practiceList[0],
                }),
            );
        }
    }
};
