import { magicGenerate } from "@/utils/service/MagicService";
import { useMutation, UseMutationResult } from "@tanstack/react-query";

export interface MagicGenerateMutationVariables {
    imageBase64: string;
    signal?: AbortSignal;
}

/**
 * Mutation to send image to Magic API and receive processed images.
 * Request can be cancelled via signal (e.g. AbortController).
 * Returns: Record<string, string> (data.images)
 */
export function useMagicGenerateMutation(): UseMutationResult<
    Record<string, string>,
    Error,
    MagicGenerateMutationVariables
> {
    return useMutation({
        mutationFn: ({ imageBase64, signal }: MagicGenerateMutationVariables) => magicGenerate(imageBase64, signal),
    });
}
