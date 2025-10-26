import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { Practice } from "../service/models/ResponseModels";

interface ProfileStore {
    selectedPractice: Practice | null;
    viewMode: "doctor" | "owner";
    setSelectedPractice: (practice: Practice) => void;
    setViewMode: (mode: "doctor" | "owner") => void;
    resetSelection: () => void;
    isLoaded: boolean;
    isLoading: boolean;
}

const STORAGE_KEY = "profile_selection";

export const useProfileStore = create<ProfileStore>((set, get) => ({
    selectedPractice: null,
    viewMode: "doctor",
    isLoaded: false,
    isLoading: false,

    setSelectedPractice: async (practice) => {
        const newState = {
            selectedPractice: practice,
        };

        set(newState);

        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
        } catch (error) {
            console.error("خطا در ذخیره انتخاب practice:", error);
        }
    },

    setViewMode: async (mode) => {
        const newState = {
            viewMode: mode,
        };

        set(newState);

        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
        } catch (error) {
            console.error("خطا در ذخیره view mode:", error);
        }
    },

    resetSelection: async () => {
        const newState = {
            selectedPractice: null,
            viewMode: "doctor" as const,
        };

        set(newState);

        try {
            await AsyncStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error("خطا در حذف انتخاب practice:", error);
        }
    },
}));

export const loadProfileSelection = async (practiceList?: any[]) => {
    const currentState = useProfileStore.getState();

    // اگر در حال لود است، از فراخوانی مکرر جلوگیری کن
    if (currentState.isLoading) {
        return;
    }

    // اگر قبلاً لود شده و selectedPractice وجود دارد، از فراخوانی مکرر جلوگیری کن
    if (currentState.isLoaded && currentState.selectedPractice) {
        return;
    }

    // اگر isLoaded است اما selectedPractice وجود ندارد، isLoaded را reset کن
    if (currentState.isLoaded && !currentState.selectedPractice) {
        console.log("Resetting isLoaded because selectedPractice is null");
        useProfileStore.setState({ isLoaded: false });
    }

    try {
        console.log("loadProfileSelection called with:", practiceList);
        useProfileStore.setState({ isLoading: true });

        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        console.log("stored data:", stored);

        if (stored) {
            const parsed = JSON.parse(stored);

            // اگر ساختار قدیمی است، آن را نادیده بگیر و داده جدید ایجاد کن
            if (parsed.selectedProfile || !parsed.viewMode) {
                console.log("Old data structure detected, ignoring and creating new data");
                await AsyncStorage.removeItem(STORAGE_KEY);

                if (practiceList && practiceList.length > 0) {
                    const ownerPractice = practiceList.find((practice) => practice.role === "owner");
                    const defaultPractice = ownerPractice || practiceList[0];
                    const defaultViewMode = ownerPractice ? "owner" : "doctor";

                    console.log("Setting default practice:", defaultPractice);
                    console.log("Setting default view mode:", defaultViewMode);

                    useProfileStore.setState({
                        selectedPractice: defaultPractice,
                        viewMode: defaultViewMode,
                        isLoaded: true,
                        isLoading: false,
                    });
                    await AsyncStorage.setItem(
                        STORAGE_KEY,
                        JSON.stringify({
                            selectedPractice: defaultPractice,
                            viewMode: defaultViewMode,
                        }),
                    );
                } else {
                    useProfileStore.setState({
                        isLoaded: true,
                        isLoading: false,
                    });
                }
            } else {
                // ساختار جدید
                useProfileStore.setState({
                    selectedPractice: parsed.selectedPractice,
                    viewMode: parsed.viewMode || "doctor",
                    isLoaded: true,
                    isLoading: false,
                });
            }
        } else {
            if (practiceList && practiceList.length > 0) {
                const ownerPractice = practiceList.find((practice) => practice.role === "owner");
                const defaultPractice = ownerPractice || practiceList[0];
                const defaultViewMode = ownerPractice ? "owner" : "doctor";

                console.log("Setting default practice:", defaultPractice);
                console.log("Setting default view mode:", defaultViewMode);

                useProfileStore.setState({
                    selectedPractice: defaultPractice,
                    viewMode: defaultViewMode,
                    isLoaded: true,
                    isLoading: false,
                });
                await AsyncStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify({
                        selectedPractice: defaultPractice,
                        viewMode: defaultViewMode,
                    }),
                );
            } else {
                useProfileStore.setState({
                    isLoaded: true,
                    isLoading: false,
                });
            }
        }
    } catch (error) {
        console.error("خطا در بارگذاری انتخاب practice:", error);
        useProfileStore.setState({
            isLoaded: true,
            isLoading: false,
        });
    }
};

export const validateAndSetDefaultSelection = async (practiceList?: any[]) => {
    const currentState = useProfileStore.getState();

    if (currentState.selectedPractice && practiceList) {
        const isValidPractice = practiceList.some((p) => p.id === currentState.selectedPractice?.id);

        if (!isValidPractice && practiceList.length > 0) {
            useProfileStore.setState({
                selectedPractice: practiceList[0],
            });

            await AsyncStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    selectedPractice: practiceList[0],
                    viewMode: currentState.viewMode,
                }),
            );
        }
    }
};
