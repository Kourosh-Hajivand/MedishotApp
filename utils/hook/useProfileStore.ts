import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { People, Practice } from "../service/models/ResponseModels";

type ViewMode = "doctor" | "owner";

export type SettingView = { type: "profile"; profile: People | null } | { type: "practice"; practice: Practice };

interface StoredProfileSelection {
    selectedPractice: Practice | null;
    viewMode: ViewMode;
    settingView: SettingView;
}

interface ProfileStore {
    selectedPractice: Practice | null;
    viewMode: ViewMode;
    settingView: SettingView;
    setSelectedPractice: (practice: Practice) => Promise<void>;
    setViewMode: (mode: ViewMode) => Promise<void>;
    setSettingView: (view: SettingView) => Promise<void>;
    resetSelection: () => Promise<void>;
    isLoaded: boolean;
    isLoading: boolean;
}

const STORAGE_KEY = "profile_selection";
const DEFAULT_VIEW_MODE: ViewMode = "doctor";
const DEFAULT_SETTING_VIEW: SettingView = { type: "profile", profile: null };

const buildSettingViewFromPractice = (practice?: Practice | null): SettingView => {
    if (practice) {
        return { type: "practice", practice };
    }

    return DEFAULT_SETTING_VIEW;
};

const selectDefaultPractice = (practiceList?: Practice[]) => {
    if (!practiceList || practiceList.length === 0) {
        return null;
    }

    return practiceList.find((practice) => practice.role === "owner") ?? practiceList[0];
};

const determineDefaultViewMode = (practice: Practice | null): ViewMode => {
    if (practice?.role === "owner") {
        return "owner";
    }

    return DEFAULT_VIEW_MODE;
};

const normalizeSettingView = (rawView: SettingView | null | undefined, selectedPractice: Practice | null): SettingView => {
    if (rawView?.type === "profile") {
        return DEFAULT_SETTING_VIEW;
    }

    if (rawView?.type === "practice" && rawView.practice) {
        if (selectedPractice && rawView.practice.id !== selectedPractice.id) {
            return { type: "practice", practice: selectedPractice };
        }

        return { type: "practice", practice: rawView.practice };
    }

    return buildSettingViewFromPractice(selectedPractice);
};

async function persistProfileSelection() {
    try {
        const { selectedPractice, viewMode, settingView } = useProfileStore.getState();
        const payload: StoredProfileSelection = {
            selectedPractice,
            viewMode,
            settingView,
        };

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
        console.error("خطا در ذخیره انتخاب profile:", error);
    }
}

async function initializeDefaultSelection(practiceList?: Practice[]) {
    const defaultPractice = selectDefaultPractice(practiceList) ?? null;
    const defaultViewMode = determineDefaultViewMode(defaultPractice);
    const defaultSettingView = buildSettingViewFromPractice(defaultPractice);

    useProfileStore.setState({
        selectedPractice: defaultPractice,
        viewMode: defaultViewMode,
        settingView: defaultSettingView,
        isLoaded: true,
        isLoading: false,
    });

    try {
        await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                selectedPractice: defaultPractice,
                viewMode: defaultViewMode,
                settingView: defaultSettingView,
            }),
        );
    } catch (error) {
        console.error("خطا در ذخیره وضعیت پیش‌فرض profile:", error);
    }
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
    selectedPractice: null,
    viewMode: DEFAULT_VIEW_MODE,
    settingView: DEFAULT_SETTING_VIEW,
    isLoaded: false,
    isLoading: false,

    setSelectedPractice: async (practice) => {
        set({
            selectedPractice: practice,
        });

        if (get().settingView.type === "practice") {
            set({
                settingView: { type: "practice", practice },
            });
        }

        await persistProfileSelection();
    },

    setViewMode: async (mode) => {
        set({
            viewMode: mode,
        });

        await persistProfileSelection();
    },

    setSettingView: async (view) => {
        if (view.type === "practice") {
            set({
                selectedPractice: view.practice,
                settingView: { type: "practice", practice: view.practice },
            });
        } else {
            set({
                settingView: DEFAULT_SETTING_VIEW,
            });
        }

        await persistProfileSelection();
    },

    resetSelection: async () => {
        set({
            selectedPractice: null,
            viewMode: DEFAULT_VIEW_MODE,
            settingView: DEFAULT_SETTING_VIEW,
        });

        try {
            await AsyncStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error("خطا در حذف انتخاب practice:", error);
        }
    },
}));

export const loadProfileSelection = async (practiceList?: Practice[]) => {
    const currentState = useProfileStore.getState();

    // اگر در حال لود است، از فراخوانی مکرر جلوگیری کن
    if (currentState.isLoading) {
        console.log("Already loading, skipping...");
        return;
    }

    // اگر قبلاً لود شده و selectedPractice وجود دارد، از فراخوانی مکرر جلوگیری کن
    if (currentState.isLoaded && currentState.selectedPractice) {
        console.log("Already loaded with practice, skipping...");
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
            const parsed = JSON.parse(stored) as Partial<StoredProfileSelection> & { selectedProfile?: unknown };

            if (parsed.selectedProfile !== undefined || !parsed.viewMode) {
                console.log("Old data structure detected, recreating default state");
                await AsyncStorage.removeItem(STORAGE_KEY);
                await initializeDefaultSelection(practiceList);
            } else {
                let selectedPractice = parsed.selectedPractice ?? null;
                let viewMode = parsed.viewMode ?? DEFAULT_VIEW_MODE;
                let settingViewInput = parsed.settingView;
                let needsPersistence = false;

                if (!selectedPractice && practiceList && practiceList.length > 0) {
                    selectedPractice = selectDefaultPractice(practiceList) ?? practiceList[0];
                    viewMode = determineDefaultViewMode(selectedPractice);
                    settingViewInput = { type: "practice", practice: selectedPractice };
                    needsPersistence = true;
                }

                const settingView = normalizeSettingView(settingViewInput, selectedPractice);

                useProfileStore.setState({
                    selectedPractice,
                    viewMode,
                    settingView,
                    isLoaded: true,
                    isLoading: false,
                });

                if (!parsed.settingView || needsPersistence) {
                    await AsyncStorage.setItem(
                        STORAGE_KEY,
                        JSON.stringify({
                            selectedPractice,
                            viewMode,
                            settingView,
                        }),
                    );
                }
            }
        } else {
            await initializeDefaultSelection(practiceList);
        }
    } catch (error) {
        console.error("خطا در بارگذاری انتخاب practice:", error);
        useProfileStore.setState({
            isLoaded: true,
            isLoading: false,
        });
    }
};

export const validateAndSetDefaultSelection = async (practiceList?: Practice[]) => {
    const currentState = useProfileStore.getState();

    if (currentState.selectedPractice && practiceList) {
        const isValidPractice = practiceList.some((p) => p.id === currentState.selectedPractice?.id);

        if (!isValidPractice && practiceList.length > 0) {
            const fallbackPractice = selectDefaultPractice(practiceList) ?? practiceList[0];
            useProfileStore.setState({
                selectedPractice: fallbackPractice,
                settingView: currentState.settingView.type === "practice" ? { type: "practice", practice: fallbackPractice } : currentState.settingView,
            });

            await persistProfileSelection();
        }
    }
};

export const forceReloadProfileSelection = async (practiceList?: Practice[]) => {
    console.log("Force reloading profile selection...");

    // Reset the store state
    useProfileStore.setState({
        selectedPractice: null,
        viewMode: DEFAULT_VIEW_MODE,
        settingView: DEFAULT_SETTING_VIEW,
        isLoaded: false,
        isLoading: false,
    });

    // Clear stored data
    try {
        await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error("خطا در حذف داده‌های ذخیره شده:", error);
    }

    // Load fresh selection
    if (practiceList && practiceList.length > 0) {
        await loadProfileSelection(practiceList);
    }
};
