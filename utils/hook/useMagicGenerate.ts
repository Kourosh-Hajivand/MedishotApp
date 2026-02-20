import { MAGIC_API_SETTINGS } from "@/components/ImageEditor/ToolMagic";
import { magicGenerate } from "@/utils/service/MagicService";
import { useMutation, UseMutationResult } from "@tanstack/react-query";

/**
 * Mutation برای ارسال تصویر به API Magic و دریافت تصاویر پردازش‌شده.
 * ورودی: imageBase64 (string)
 * خروجی: Record<string, string> (data.images)
 */
export function useMagicGenerateMutation(): UseMutationResult<
    Record<string, string>,
    Error,
    string
> {
    return useMutation({
        mutationFn: (imageBase64: string) =>
            magicGenerate(imageBase64, MAGIC_API_SETTINGS),
    });
}
