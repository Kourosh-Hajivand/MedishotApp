import { parseEditorStateFromMediaData } from "@/components/ImageEditor";
import React from "react";
import type { ViewerActionsConfig } from "../GalleryWithMenu";

interface MediaItem {
    url: string;
    mediaId?: number | string;
    isBookmarked?: boolean;
    createdAt?: string;
}

// Raw media data structure from API (with template and images)
interface RawMediaData {
    id: number | string;
    template?: {
        id: number | string;
        [key: string]: any;
    } | null;
    original_media?: {
        url: string;
        [key: string]: any;
    } | null;
    images?: Array<{
        image?: {
            url: string;
            [key: string]: any;
        } | null;
        [key: string]: any;
    }>;
    taker?: {
        id?: number;
        first_name?: string | null;
        last_name?: string | null;
        email?: string | null;
    } | null;
    created_at?: string;
    has_after?: boolean;
    is_after?: boolean;
    before_media_id?: number | string | null;
    after_media?: {
        original_media?: { url: string; [key: string]: any } | null;
        [key: string]: any;
    } | null;
    [key: string]: any;
}

interface UseImageViewerDerivedDataParams {
    rawMediaData?: RawMediaData[];
    mediaData?: MediaItem[];
    images: string[];
    imageUrlToMediaIdMap?: Map<string, number | string>;
    imageUrlToBookmarkMap?: Map<string, boolean>;
    imageUrlToCreatedAtMap?: Map<string, string>;
    imageUrlToTakerMap?: Map<string, { first_name?: string | null; last_name?: string | null }>;
    actions?: ViewerActionsConfig;
    displayIndex: number;
}

export function useImageViewerDerivedData({
    rawMediaData,
    mediaData,
    images,
    imageUrlToMediaIdMap,
    imageUrlToBookmarkMap,
    imageUrlToCreatedAtMap,
    imageUrlToTakerMap,
    actions = { showBookmark: true, showEdit: true, showArchive: true, showShare: true, showNote: false },
    displayIndex,
}: UseImageViewerDerivedDataParams) {
    // Build maps from mediaData if provided, otherwise use legacy maps
    const { imageUrlToMediaIdMapInternal, imageUrlToBookmarkMapInternal, imageUrlToCreatedAtMapInternal, imagesList } = React.useMemo(() => {
        // If mediaData is provided, build maps from it
        if (mediaData && mediaData.length > 0) {
            const mediaIdMap = new Map<string, number | string>();
            const bookmarkMap = new Map<string, boolean>();
            const createdAtMap = new Map<string, string>();
            const imageUrls: string[] = [];

            mediaData.forEach((item) => {
                imageUrls.push(item.url);
                if (item.mediaId) {
                    mediaIdMap.set(item.url, item.mediaId);
                }
                if (item.isBookmarked !== undefined) {
                    bookmarkMap.set(item.url, item.isBookmarked);
                }
                if (item.createdAt) {
                    createdAtMap.set(item.url, item.createdAt);
                }
            });

            return {
                imageUrlToMediaIdMapInternal: mediaIdMap,
                imageUrlToBookmarkMapInternal: bookmarkMap,
                imageUrlToCreatedAtMapInternal: createdAtMap,
                imagesList: imageUrls,
            };
        }

        // Otherwise use legacy props
        return {
            imageUrlToMediaIdMapInternal: imageUrlToMediaIdMap || new Map(),
            imageUrlToBookmarkMapInternal: imageUrlToBookmarkMap || new Map(),
            imageUrlToCreatedAtMapInternal: imageUrlToCreatedAtMap || new Map(),
            imagesList: images,
        };
    }, [mediaData, images, imageUrlToMediaIdMap, imageUrlToBookmarkMap, imageUrlToCreatedAtMap]);

    // Build maps from rawMediaData for taker, createdAt, isOriginalMedia, hideTakeAfter, originalWithNoBeforeAfter, and isComposite
    const { imageUrlToTakerMapInternal, imageUrlToCreatedAtMapFromRaw, imageUrlToIsOriginalMediaMap, imageUrlToHideTakeAfterMap, imageUrlToOriginalNoBeforeAfterMap, imageUrlToIsCompositeMap } = React.useMemo(() => {
        const takerMap = new Map<string, { first_name?: string | null; last_name?: string | null }>();
        const createdAtMap = new Map<string, string>();
        const isOriginalMediaMap = new Map<string, boolean>();
        const hideTakeAfterMap = new Map<string, boolean>();
        const originalNoBeforeAfterMap = new Map<string, boolean>();
        const isCompositeMap = new Map<string, boolean>();

        if (rawMediaData && Array.isArray(rawMediaData)) {
            rawMediaData.forEach((media: RawMediaData) => {
                const taker = media.taker;
                const createdAt = media.created_at;
                const hasTemplate = !!media.template;
                const hideTakeAfter = media.has_after === true || (media.is_after === true && media.before_media_id != null);
                const noBeforeAfter = media.has_after !== true && media.before_media_id == null;

                // Check if this is a composite (has original_media, template, and images)
                const isComposite = !!(media.original_media?.url && hasTemplate && media.images?.length);

                const editedCompositeUrl = (media as { edited_media?: { url?: string } }).edited_media?.url;
                if (media.original_media?.url) {
                    const setTakerCreated = (url: string) => {
                        if (taker) takerMap.set(url, { first_name: taker.first_name, last_name: taker.last_name });
                        if (createdAt) createdAtMap.set(url, createdAt);
                    };
                    setTakerCreated(media.original_media.url);
                    if (editedCompositeUrl) setTakerCreated(editedCompositeUrl);
                    if (hasTemplate) {
                        isOriginalMediaMap.set(media.original_media.url, true);
                        if (editedCompositeUrl) isOriginalMediaMap.set(editedCompositeUrl, true);
                        if (hideTakeAfter) {
                            hideTakeAfterMap.set(media.original_media.url, true);
                            if (editedCompositeUrl) hideTakeAfterMap.set(editedCompositeUrl, true);
                        }
                        if (noBeforeAfter) {
                            originalNoBeforeAfterMap.set(media.original_media.url, true);
                            if (editedCompositeUrl) originalNoBeforeAfterMap.set(editedCompositeUrl, true);
                        }
                    }
                    if (isComposite) {
                        isCompositeMap.set(media.original_media.url, true);
                        if (editedCompositeUrl) isCompositeMap.set(editedCompositeUrl, true);
                    }
                }

                const hasTemplateNoOriginal = hasTemplate && !media.original_media?.url && media.images?.length;

                if (media.images && Array.isArray(media.images)) {
                    media.images.forEach((img: any, idx: number) => {
                        const displayUrl = img.edited_image?.url ?? img.image?.url;
                        if (!displayUrl) return;
                        if (taker) {
                            takerMap.set(displayUrl, { first_name: taker.first_name, last_name: taker.last_name });
                        }
                        const imgCreatedAt = img.created_at || createdAt;
                        if (imgCreatedAt) createdAtMap.set(displayUrl, imgCreatedAt);
                        const isFirstTemplateImage = hasTemplateNoOriginal && idx === 0;
                        if (isFirstTemplateImage) {
                            isOriginalMediaMap.set(displayUrl, true);
                            if (hideTakeAfter) hideTakeAfterMap.set(displayUrl, true);
                            if (noBeforeAfter) originalNoBeforeAfterMap.set(displayUrl, true);
                        } else {
                            isOriginalMediaMap.set(displayUrl, false);
                            if (hideTakeAfter) hideTakeAfterMap.set(displayUrl, true);
                        }
                        if (isComposite) isCompositeMap.set(displayUrl, true);
                    });
                }
            });
        }

        return {
            imageUrlToTakerMapInternal: takerMap,
            imageUrlToCreatedAtMapFromRaw: createdAtMap,
            imageUrlToIsOriginalMediaMap: isOriginalMediaMap,
            imageUrlToHideTakeAfterMap: hideTakeAfterMap,
            imageUrlToOriginalNoBeforeAfterMap: originalNoBeforeAfterMap,
            imageUrlToIsCompositeMap: isCompositeMap,
        };
    }, [rawMediaData]);

    // Map image URL -> editor state (per-image data for template cells, media.data for composite/non-template)
    const imageUrlToEditorStateMapInternal = React.useMemo(() => {
        const map = new Map<string, ReturnType<typeof parseEditorStateFromMediaData>>();
        if (!rawMediaData || !Array.isArray(rawMediaData)) return map;

        rawMediaData.forEach((media: RawMediaData) => {
            const mediaData = (media as { data?: unknown }).data;
            const mediaState = parseEditorStateFromMediaData(mediaData);

            if (media.original_media?.url) {
                if (mediaState) map.set(media.original_media.url, mediaState);
                const editedComposite = (media as { edited_media?: { url?: string } }).edited_media?.url;
                if (editedComposite && mediaState) map.set(editedComposite, mediaState);
            }
            if (media.images?.length) {
                media.images.forEach((img: { image?: { url?: string } | null; edited_image?: { url?: string } | null; data?: unknown }) => {
                    const itemState = parseEditorStateFromMediaData(img.data);
                    if (itemState) {
                        if (img.image?.url) map.set(img.image.url, itemState);
                        if (img.edited_image?.url) map.set(img.edited_image.url, itemState);
                    }
                });
            }
            const simpleMedia = media as { media?: { url?: string } };
            if (simpleMedia.media?.url && mediaState) {
                map.set(simpleMedia.media.url, mediaState);
            }
            const editedMedia = media as { edited_media?: { url?: string } };
            if (editedMedia.edited_media?.url && mediaState) {
                map.set(editedMedia.edited_media.url, mediaState);
            }
        });

        return map;
    }, [rawMediaData]);

    const imageUrlToOriginalUriMapInternal = React.useMemo(() => {
        const map = new Map<string, string>();
        if (!rawMediaData || !Array.isArray(rawMediaData)) return map;

        rawMediaData.forEach((media: RawMediaData) => {
            const orig = media.original_media?.url ?? (media as { media?: { url?: string } }).media?.url;
            if (media.original_media?.url) map.set(media.original_media.url, media.original_media.url);
            const withEdited = media as { edited_media?: { url?: string } };
            if (withEdited.edited_media?.url && orig) map.set(withEdited.edited_media.url, orig);
            // Each template cell: original = that cell's image, not composite
            if (media.images?.length) {
                media.images.forEach((img: { image?: { url?: string } | null; edited_image?: { url?: string } | null }) => {
                    if (img.image?.url) map.set(img.image.url, img.image.url);
                    if (img.edited_image?.url) map.set(img.edited_image.url, img.image?.url ?? img.edited_image.url);
                });
            }
            const simpleMedia = media as { media?: { url?: string } };
            if (simpleMedia.media?.url) map.set(simpleMedia.media.url, orig ?? simpleMedia.media.url);
        });

        return map;
    }, [rawMediaData]);

    // Create a map from image URL to mediaImageId (for template images)
    const imageUrlToMediaImageIdMapInternal = React.useMemo(() => {
        const map = new Map<string, number>();
        if (!rawMediaData || !Array.isArray(rawMediaData)) return map;

        rawMediaData.forEach((media: RawMediaData) => {
            const hasTemplate = !!media.template;
            if (hasTemplate && media.images?.length) {
                media.images.forEach((img: { id?: number; image?: { url?: string } | null; edited_image?: { url?: string } | null }) => {
                    if (img.id && img.image?.url) {
                        map.set(img.image.url, img.id);
                    }
                    if (img.id && img.edited_image?.url) {
                        map.set(img.edited_image.url, img.id);
                    }
                });
            }
        });

        return map;
    }, [rawMediaData]);

    // Create a map from image URL to hasTemplate flag
    const imageUrlToHasTemplateMapInternal = React.useMemo(() => {
        const map = new Map<string, boolean>();
        if (!rawMediaData || !Array.isArray(rawMediaData)) return map;

        rawMediaData.forEach((media: RawMediaData) => {
            const hasTemplate = !!media.template;
            // Mark original_media as non-template (it uses editMedia)
            if (media.original_media?.url) {
                map.set(media.original_media.url, false);
            }
            // Mark all template images as having template (they use updateMediaImage)
            if (hasTemplate && media.images?.length) {
                media.images.forEach((img: { image?: { url?: string } | null; edited_image?: { url?: string } | null }) => {
                    if (img.image?.url) {
                        map.set(img.image.url, true);
                    }
                    if (img.edited_image?.url) {
                        map.set(img.edited_image.url, true);
                    }
                });
            } else {
                // Non-template media
                const simpleMedia = media as { media?: { url?: string }; edited_media?: { url?: string } };
                if (simpleMedia.media?.url) {
                    map.set(simpleMedia.media.url, false);
                }
                if (simpleMedia.edited_media?.url) {
                    map.set(simpleMedia.edited_media.url, false);
                }
            }
        });

        return map;
    }, [rawMediaData]);

    // Map image URL → gost name (pose name from media.images[].gost.name; Magic only for "Full Teeth-Open" and "Front Face Smile")
    const imageUrlToTemplateNameMap = React.useMemo(() => {
        const map = new Map<string, string>();
        if (!rawMediaData || !Array.isArray(rawMediaData)) return map;

        rawMediaData.forEach((media: RawMediaData) => {
            if (!media.images?.length) return;
            media.images.forEach((img: { gost?: { name?: string }; image?: { url?: string } | null; edited_image?: { url?: string } | null }) => {
                const gostName = typeof img.gost?.name === "string" ? img.gost.name : null;
                if (!gostName) return;
                if (img.image?.url) map.set(img.image.url, gostName);
                if (img.edited_image?.url) map.set(img.edited_image.url, gostName);
            });
        });
        return map;
    }, [rawMediaData]);

    // Merge taker maps (rawMediaData takes precedence)
    const finalTakerMap = React.useMemo(() => {
        const merged = new Map(imageUrlToTakerMap || []);
        imageUrlToTakerMapInternal.forEach((value, key) => {
            merged.set(key, value);
        });
        return merged;
    }, [imageUrlToTakerMap, imageUrlToTakerMapInternal]);

    // Merge createdAt maps (rawMediaData takes precedence)
    const finalCreatedAtMap = React.useMemo(() => {
        const merged = new Map(imageUrlToCreatedAtMap || []);
        imageUrlToCreatedAtMapFromRaw.forEach((value, key) => {
            merged.set(key, value);
        });
        return merged;
    }, [imageUrlToCreatedAtMap, imageUrlToCreatedAtMapFromRaw]);

    // Get current taker info (displayIndex = updates with scroll, no delay)
    const currentTaker = React.useMemo(() => {
        if (imagesList.length > 0 && displayIndex >= 0 && displayIndex < imagesList.length) {
            const currentImageUrl = imagesList[displayIndex];
            return finalTakerMap.get(currentImageUrl);
        }
        return null;
    }, [displayIndex, imagesList, finalTakerMap]);

    // Get current createdAt
    const currentCreatedAt = React.useMemo(() => {
        if (imagesList.length > 0 && displayIndex >= 0 && displayIndex < imagesList.length) {
            const currentImageUrl = imagesList[displayIndex];
            return finalCreatedAtMap.get(currentImageUrl);
        }
        return null;
    }, [displayIndex, imagesList, finalCreatedAtMap]);

    // Check if current image is original_media from a template
    const isCurrentImageOriginalMedia = React.useMemo(() => {
        if (imagesList.length > 0 && displayIndex >= 0 && displayIndex < imagesList.length) {
            const currentImageUrl = imagesList[displayIndex];
            return imageUrlToIsOriginalMediaMap.get(currentImageUrl) === true;
        }
        return false;
    }, [displayIndex, imagesList, imageUrlToIsOriginalMediaMap]);

    // Check if current image is from a template
    const isCurrentImageFromTemplate = React.useMemo(() => {
        if (imagesList.length > 0 && displayIndex >= 0 && displayIndex < imagesList.length) {
            const currentImageUrl = imagesList[displayIndex];
            return imageUrlToHasTemplateMapInternal.get(currentImageUrl) === true;
        }
        return false;
    }, [displayIndex, imagesList, imageUrlToHasTemplateMapInternal]);

    // Check if current image is part of a composite (has original_media, template, and images)
    const isCurrentImageComposite = React.useMemo(() => {
        if (imagesList.length > 0 && displayIndex >= 0 && displayIndex < imagesList.length) {
            const currentImageUrl = imagesList[displayIndex];
            return imageUrlToIsCompositeMap.get(currentImageUrl) === true;
        }
        return false;
    }, [displayIndex, imagesList, imageUrlToIsCompositeMap]);

    // Check if current image is the original_media of a composite
    const isCurrentImageCompositeOriginal = React.useMemo(() => {
        if (imagesList.length > 0 && displayIndex >= 0 && displayIndex < imagesList.length) {
            const currentImageUrl = imagesList[displayIndex];
            const isComposite = imageUrlToIsCompositeMap.get(currentImageUrl) === true;
            const isOriginalMedia = imageUrlToIsOriginalMediaMap.get(currentImageUrl) === true;
            return isComposite && isOriginalMedia;
        }
        return false;
    }, [displayIndex, imagesList, imageUrlToIsCompositeMap, imageUrlToIsOriginalMediaMap]);

    // Check if current image is a template image (not original_media) of a composite
    const isCurrentImageCompositeChild = React.useMemo(() => {
        if (imagesList.length > 0 && displayIndex >= 0 && displayIndex < imagesList.length) {
            const currentImageUrl = imagesList[displayIndex];
            const isComposite = imageUrlToIsCompositeMap.get(currentImageUrl) === true;
            const isOriginalMedia = imageUrlToIsOriginalMediaMap.get(currentImageUrl) === true;
            return isComposite && !isOriginalMedia;
        }
        return false;
    }, [displayIndex, imagesList, imageUrlToIsCompositeMap, imageUrlToIsOriginalMediaMap]);

    // Check if current image is a single image (has original_media but no template)
    const isCurrentImageSingleImage = React.useMemo(() => {
        if (imagesList.length > 0 && displayIndex >= 0 && displayIndex < imagesList.length && rawMediaData) {
            const currentImageUrl = imagesList[displayIndex];
            // Check if current image is original_media from a media item that has no template
            for (const media of rawMediaData) {
                if (media.original_media?.url === currentImageUrl && !media.template) {
                    return true;
                }
            }
        }
        return false;
    }, [displayIndex, imagesList, rawMediaData]);

    // Hide "Take After Template" when has_after or (is_after + before_media_id)
    const isCurrentImageHideTakeAfter = React.useMemo(() => {
        if (imagesList.length > 0 && displayIndex >= 0 && displayIndex < imagesList.length) {
            const currentImageUrl = imagesList[displayIndex];
            return imageUrlToHideTakeAfterMap.get(currentImageUrl) === true;
        }
        return false;
    }, [displayIndex, imagesList, imageUrlToHideTakeAfterMap]);

    // Original with no before/after (e.g. id 176): show split with + badge for take-after; no archive
    const isCurrentImageOriginalNoBeforeAfter = React.useMemo(() => {
        if (imagesList.length > 0 && displayIndex >= 0 && displayIndex < imagesList.length) {
            const currentImageUrl = imagesList[displayIndex];
            return imageUrlToOriginalNoBeforeAfterMap.get(currentImageUrl) === true;
        }
        return false;
    }, [displayIndex, imagesList, imageUrlToOriginalNoBeforeAfterMap]);

    // hasAfter = current image already has linked after (split tap → compare); !hasAfter = show + on split, tap → take after
    const currentImageHasAfter = isCurrentImageHideTakeAfter;

    // Templates that show Magic icon and Magic tab in editor (only these two)
    const MAGIC_TEMPLATE_NAMES = ["Full Teeth-Open", "Front Face Smile"] as const;
    const isCurrentImageMagicTemplate = React.useMemo(() => {
        if (imagesList.length > 0 && displayIndex >= 0 && displayIndex < imagesList.length) {
            const currentImageUrl = imagesList[displayIndex];
            const name = imageUrlToTemplateNameMap.get(currentImageUrl);
            return name != null && MAGIC_TEMPLATE_NAMES.includes(name as (typeof MAGIC_TEMPLATE_NAMES)[number]);
        }
        return false;
    }, [displayIndex, imagesList, imageUrlToTemplateNameMap]);

    // Adjust actions based on image type:
    // 1. Single image without template: note, like, adjust (no compare)
    // 2. Single image with template (no original_media): note, like, compare, adjust
    // 3. Composite original_media: note, like, compare (no adjust)
    // 4. Composite child images: note, like, adjust (no compare)
    const effectiveActions = React.useMemo(() => {
        const {
            showShare: share = true,
            showRestore: restore = false,
            showArchive: archive = true,
            showBookmark: bookmark = true,
            showNote: note = false,
            showCompare: compare = false,
            showEdit: edit = true,
            showMagic: magicAllowed = false,
        } = actions;

        // Get current image info directly from maps
        let isCompositeOriginal = false;
        let isCompositeChild = false;
        let isSingleImage = false;
        let isOriginalMedia = false;
        let isFromTemplate = false;

        if (imagesList.length > 0 && displayIndex >= 0 && displayIndex < imagesList.length) {
            const currentImageUrl = imagesList[displayIndex];
            const isComposite = imageUrlToIsCompositeMap.get(currentImageUrl) === true;
            isOriginalMedia = imageUrlToIsOriginalMediaMap.get(currentImageUrl) === true;
            isFromTemplate = imageUrlToHasTemplateMapInternal.get(currentImageUrl) === true;

            isCompositeOriginal = isComposite && isOriginalMedia;
            isCompositeChild = isComposite && !isOriginalMedia;

            // Check if single image (has original_media but no template)
            if (rawMediaData) {
                for (const media of rawMediaData) {
                    if (media.original_media?.url === currentImageUrl && !media.template) {
                        isSingleImage = true;
                        break;
                    }
                }
            }
        }

        // For composite original_media: show compare only if caller allowed (e.g. hide in album)
        if (isCompositeOriginal) {
            return {
                showBookmark: bookmark,
                showEdit: false,
                showArchive: archive,
                showShare: share,
                showRestore: restore,
                showMagic: false,
                showNote: note,
                showCompare: compare,
            };
        }

        // For composite child images: show adjust only if caller allowed (e.g. hide in album)
        if (isCompositeChild) {
            return {
                showBookmark: bookmark,
                showEdit: edit,
                showArchive: archive,
                showShare: share,
                showRestore: restore,
                showMagic: magicAllowed && isCurrentImageMagicTemplate,
                showNote: note,
                showCompare: false,
            };
        }

        // For single image without template: show adjust but not compare; Magic only for magic templates
        if (isSingleImage) {
            return {
                showBookmark: bookmark,
                showEdit: edit,
                showArchive: archive,
                showShare: share,
                showRestore: restore,
                showMagic: magicAllowed && isCurrentImageMagicTemplate,
                showNote: note,
                showCompare: false, // Hide compare for single images without template
            };
        }

        // For single image with template (template without original_media): show compare and adjust; Magic only for magic templates
        const shouldShowCompare = compare && (isOriginalMedia || isFromTemplate);
        // When swiping on composite images and caller allows, show at least Adjust if others are empty
        const forceShowEditWhenFromTemplate = edit && isFromTemplate && !shouldShowCompare;
            return {
                showBookmark: bookmark,
                showEdit: edit || forceShowEditWhenFromTemplate,
                showArchive: archive,
                showShare: share,
                showRestore: restore,
                showMagic: magicAllowed && isCurrentImageMagicTemplate,
                showNote: note,
                showCompare: shouldShowCompare,
            };
    }, [displayIndex, imagesList, imageUrlToIsCompositeMap, imageUrlToIsOriginalMediaMap, imageUrlToHasTemplateMapInternal, rawMediaData, actions, isCurrentImageMagicTemplate]);

    // Notes from media.data.editor.notes for current image (for notes panel)
    const notesForCurrentImage = React.useMemo(() => {
        const uri = imagesList[displayIndex];
        if (!uri) return [];
        const state = imageUrlToEditorStateMapInternal.get(uri);
        return state?.notes ?? [];
    }, [displayIndex, imagesList, imageUrlToEditorStateMapInternal]);

    // Return stable memoized object
    return React.useMemo(
        () => ({
            imagesList,
            maps: {
                imageUrlToMediaIdMapInternal,
                imageUrlToBookmarkMapInternal,
                imageUrlToCreatedAtMapInternal,
                imageUrlToMediaImageIdMapInternal,
                imageUrlToHasTemplateMapInternal,
                imageUrlToOriginalUriMapInternal,
                imageUrlToEditorStateMapInternal,
            },
            derived: {
                currentTaker,
                currentCreatedAt,
                isCurrentImageOriginalMedia,
                isCurrentImageFromTemplate,
                isCurrentImageComposite,
                isCurrentImageCompositeOriginal,
                isCurrentImageCompositeChild,
                isCurrentImageSingleImage,
                isCurrentImageHideTakeAfter,
                isCurrentImageOriginalNoBeforeAfter,
                currentImageHasAfter,
                isCurrentImageMagicTemplate,
            },
            effectiveActions,
            notesForCurrentImage,
        }),
        [
            imagesList,
            imageUrlToMediaIdMapInternal,
            imageUrlToBookmarkMapInternal,
            imageUrlToCreatedAtMapInternal,
            imageUrlToMediaImageIdMapInternal,
            imageUrlToHasTemplateMapInternal,
            imageUrlToOriginalUriMapInternal,
            imageUrlToEditorStateMapInternal,
            currentTaker,
            currentCreatedAt,
            isCurrentImageOriginalMedia,
            isCurrentImageFromTemplate,
            isCurrentImageComposite,
            isCurrentImageCompositeOriginal,
            isCurrentImageCompositeChild,
            isCurrentImageSingleImage,
            isCurrentImageHideTakeAfter,
            isCurrentImageOriginalNoBeforeAfter,
            currentImageHasAfter,
            isCurrentImageMagicTemplate,
            effectiveActions,
            notesForCurrentImage,
        ],
    );
}
