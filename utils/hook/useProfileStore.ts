import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { Practice } from "../service/models/ResponseModels";
import { PracticeService } from "../service/PracticeService";

type ViewMode = "doctor" | "owner";

interface StoredProfileSelection {
    selectedPractice: Practice | null;
    viewMode: ViewMode;
}

interface ProfileStore {
    selectedPractice: Practice | null;
    viewMode: ViewMode;
    selectedDoctor: string | null; // null means "all", otherwise doctor id
    setSelectedPractice: (practice: Practice) => Promise<void>;
    setViewMode: (mode: ViewMode) => Promise<void>;
    setSelectedDoctor: (doctorId: string | null) => void;
    resetSelection: () => Promise<void>;
    isLoaded: boolean;
    isLoading: boolean;
}

const STORAGE_KEY = "profile_selection";
const DEFAULT_VIEW_MODE: ViewMode = "doctor";

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

export async function persistProfileSelection() {
    try {
        const { selectedPractice, viewMode } = useProfileStore.getState();
        const payload: StoredProfileSelection = {
            selectedPractice,
            viewMode,
        };

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
        console.error("خطا در ذخیره انتخاب profile:", error);
    }
}

async function initializeDefaultSelection(practiceList?: Practice[]) {
    const defaultPractice = selectDefaultPractice(practiceList) ?? null;
    const defaultViewMode = determineDefaultViewMode(defaultPractice);

    useProfileStore.setState({
        selectedPractice: defaultPractice,
        viewMode: defaultViewMode,
        selectedDoctor: null, // Reset doctor to "all" when initializing
        isLoaded: true,
        isLoading: false,
    });

    try {
        await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                selectedPractice: defaultPractice,
                viewMode: defaultViewMode,
            }),
        );
    } catch (error) {
        console.error("خطا در ذخیره وضعیت پیش‌فرض profile:", error);
    }
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
    selectedPractice: null,
    viewMode: DEFAULT_VIEW_MODE,
    selectedDoctor: null,
    isLoaded: false,
    isLoading: false,

    setSelectedPractice: async (practice) => {
        // همیشه وقتی practice عوض می‌شود، doctor را reset کن (null = all)
        // چون هر practice دکترهای خودش را دارد و نباید تداخل داشته باشند
        const previousPracticeId = get().selectedPractice?.id;
        const isPracticeChanged = previousPracticeId !== practice.id;

        // Set practice immediately for UI responsiveness
        set({
            selectedPractice: practice,
            // اگر practice عوض شده، doctor را reset کن
            selectedDoctor: isPracticeChanged ? null : get().selectedDoctor,
        });

        await persistProfileSelection();

        // Fetch full practice data from API and update store
        try {
            const fullPracticeData = await PracticeService.getPracticeById(practice.id);

            if (fullPracticeData?.data) {
                set({
                    selectedPractice: fullPracticeData.data,
                    // مطمئن شو که doctor reset شده است
                    selectedDoctor: isPracticeChanged ? null : get().selectedDoctor,
                });
                await persistProfileSelection();
            }
        } catch (error) {
            console.error("خطا در دریافت اطلاعات کامل practice:", error);
            // If fetch fails, keep the practice data we already have
        }
    },

    setSelectedDoctor: (doctorId: string | null) => {
        set({
            selectedDoctor: doctorId,
        });
    },

    setViewMode: async (mode) => {
        set({
            viewMode: mode,
        });

        await persistProfileSelection();
    },

    resetSelection: async () => {
        set({
            selectedPractice: null,
            viewMode: DEFAULT_VIEW_MODE,
            selectedDoctor: null,
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

    // اگر practiceList وجود ندارد، صبر کن تا لود شود
    if (!practiceList || practiceList.length === 0) {
        console.log("Practice list not available yet, skipping...");
        return;
    }

    // اگر قبلاً لود شده و selectedPractice وجود دارد، بررسی کن که آیا هنوز معتبر است
    // اما اگر practice در store وجود دارد و معتبر است، آن را نگه دار (کاربر قبلاً انتخاب کرده)
    if (currentState.isLoaded && currentState.selectedPractice) {
        const isValidPractice = practiceList.some((p) => p.id === currentState.selectedPractice?.id);
        if (isValidPractice) {
            console.log("Already loaded with valid practice, keeping it...");
            // Practice معتبر است، آن را نگه دار
            // Doctor را reset نکن چون practice عوض نشده است
            return;
        } else {
            console.log("Stored practice is no longer valid, reloading...");
            useProfileStore.setState({ isLoaded: false });
        }
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
            const parsed = JSON.parse(stored) as Partial<StoredProfileSelection> & { selectedProfile?: unknown; settingView?: unknown };

            if (parsed.selectedProfile !== undefined || parsed.settingView !== undefined || !parsed.viewMode) {
                console.log("Old data structure detected, recreating default state");
                await AsyncStorage.removeItem(STORAGE_KEY);
                await initializeDefaultSelection(practiceList);
            } else {
                let selectedPractice = parsed.selectedPractice ?? null;
                let viewMode = parsed.viewMode ?? DEFAULT_VIEW_MODE;
                let needsPersistence = false;

                // بررسی اینکه آیا selectedPractice هنوز در لیست practiceList موجود است
                if (selectedPractice) {
                    const isValidPractice = practiceList.some((p) => p.id === selectedPractice?.id);
                    if (!isValidPractice) {
                        console.log("Stored practice is no longer valid, selecting default");
                        selectedPractice = selectDefaultPractice(practiceList) ?? practiceList[0];
                        viewMode = determineDefaultViewMode(selectedPractice);
                        needsPersistence = true;
                    }
                    // اگر پرکتیس معتبر است و در store وجود دارد، آن را نگه دار (کاربر قبلاً انتخاب کرده)
                    // دیگر اولین آیتم را ست نکن
                } else {
                    // فقط اگر هیچ پرکتیسی در store نبود (کاربر تازه وارد شده)، اولین پرکتیس را انتخاب کن
                    if (practiceList && practiceList.length > 0) {
                        console.log("No stored practice found, selecting first practice");
                    selectedPractice = selectDefaultPractice(practiceList) ?? practiceList[0];
                    viewMode = determineDefaultViewMode(selectedPractice);
                    needsPersistence = true;
                    }
                }

                // Reset selectedDoctor to "all" (null) when loading practice
                useProfileStore.setState({
                    selectedPractice,
                    viewMode,
                    selectedDoctor: null, // Reset doctor to "all"
                    isLoaded: true,
                    isLoading: false,
                });

                if (needsPersistence) {
                    await AsyncStorage.setItem(
                        STORAGE_KEY,
                        JSON.stringify({
                            selectedPractice,
                            viewMode,
                        }),
                    );
                }
            }
        } else {
            // اگر هیچ داده‌ای در store نبود، اولین پرکتیس را انتخاب کن
            await initializeDefaultSelection(practiceList);
        }
    } catch (error) {
        console.error("خطا در بارگذاری انتخاب practice:", error);
        // در صورت خطا، اولین پرکتیس را انتخاب کن
        if (practiceList && practiceList.length > 0) {
            const defaultPractice = selectDefaultPractice(practiceList) ?? practiceList[0];
            const defaultViewMode = determineDefaultViewMode(defaultPractice);
            useProfileStore.setState({
                selectedPractice: defaultPractice,
                viewMode: defaultViewMode,
                selectedDoctor: null, // Reset doctor to "all"
                isLoaded: true,
                isLoading: false,
            });
            await persistProfileSelection();
        } else {
            useProfileStore.setState({
                isLoaded: true,
                isLoading: false,
            });
        }
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
