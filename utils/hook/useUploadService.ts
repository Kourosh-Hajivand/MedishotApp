import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { UploadService } from "../service/UploadService";
import { TempUploadResponse } from "../service/models/ResponseModels";

export const useTempUpload = (onSuccess?: (data: TempUploadResponse) => void, onError?: (error: Error) => void): UseMutationResult<TempUploadResponse, Error, File> => {
    return useMutation({
        mutationFn: (file: File) => UploadService.tempUpload(file),
        onSuccess: (data) => {
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};
