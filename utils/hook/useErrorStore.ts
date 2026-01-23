import { create } from "zustand";
import { FailedRequest } from "../helper/failedRequestStorage";

interface ErrorState {
    serverError: {
        show: boolean;
        failedRequest: FailedRequest | null;
    };
    setServerError: (show: boolean, failedRequest?: FailedRequest | null) => void;
    clearServerError: () => void;
}

export const useErrorStore = create<ErrorState>((set) => ({
    serverError: {
        show: false,
        failedRequest: null,
    },
    setServerError: (show: boolean, failedRequest?: FailedRequest | null) =>
        set({
            serverError: {
                show,
                failedRequest: failedRequest || null,
            },
        }),
    clearServerError: () =>
        set({
            serverError: {
                show: false,
                failedRequest: null,
            },
        }),
}));
