import { GHOST_ICONS, GHOST_SAMPLES, GhostItemId } from "./ghostAssets";

export type GhostIconSource = number;
export type GhostSampleSource = number;

export interface GhostMetadata {
    icon: GhostIconSource;
    sample: GhostSampleSource;
    name: string;
    description: string;
}

// Mapping GhostItemId to icon and sample assets - using same structure as ghostAssets.ts
export const GHOST_METADATA: Record<GhostItemId, GhostMetadata> = {
    face: {
        icon: GHOST_ICONS.face,
        sample: GHOST_SAMPLES.face,
        name: "Face Template",
        description: "Place The Head Between Lines and keep eye line leveled.",
    },
    frontFaceSmile: {
        icon: GHOST_ICONS.frontFaceSmile,
        sample: GHOST_SAMPLES.frontFaceSmile,
        name: "Front Face Smile Template",
        description: "Place The Head Between Lines and keep eye line leveled. Show a natural smile.",
    },
    faceTurnRight: {
        icon: GHOST_ICONS.faceTurnRight,
        sample: GHOST_SAMPLES.faceTurnRight,
        name: "Face Turn Right Template",
        description: "Turn your face to the right. Keep the head aligned between the guide lines.",
    },
    faceTurnLeft: {
        icon: GHOST_ICONS.faceTurnLeft,
        sample: GHOST_SAMPLES.faceTurnLeft,
        name: "Face Turn Left Template",
        description: "Turn your face to the left. Keep the head aligned between the guide lines.",
    },
    faceRightSide: {
        icon: GHOST_ICONS.faceRightSide,
        sample: GHOST_SAMPLES.faceRightSide,
        name: "Face Right Side Template",
        description: "Position your face showing the right side profile. Align with the guide lines.",
    },
    faceLeftSide: {
        icon: GHOST_ICONS.faceLeftSide,
        sample: GHOST_SAMPLES.faceLeftSide,
        name: "Face Left Side Template",
        description: "Position your face showing the left side profile. Align with the guide lines.",
    },
    upperTeethFront: {
        icon: GHOST_ICONS.upperTeethFront,
        sample: GHOST_SAMPLES.upperTeethFront,
        name: "Upper Teeth Front Template",
        description: "Open your mouth and position upper teeth in the center of the frame.",
    },
    upperTeethRightSide: {
        icon: GHOST_ICONS.upperTeethRightSide,
        sample: GHOST_SAMPLES.upperTeethRightSide,
        name: "Upper Teeth Right Side Template",
        description: "Open your mouth and show upper teeth from the right side angle.",
    },
    upperTeethLeftSide: {
        icon: GHOST_ICONS.upperTeethLeftSide,
        sample: GHOST_SAMPLES.upperTeethLeftSide,
        name: "Upper Teeth Left Side Template",
        description: "Open your mouth and show upper teeth from the left side angle.",
    },
    upperJawDownView: {
        icon: GHOST_ICONS.upperJawDownView,
        sample: GHOST_SAMPLES.upperJawDownView,
        name: "Upper Jaw Down View Template",
        description: "Open your mouth wide and position upper jaw teeth visible from below.",
    },
    lowerJawUpView: {
        icon: GHOST_ICONS.lowerJawUpView,
        sample: GHOST_SAMPLES.lowerJawUpView,
        name: "Lower Jaw Up View Template",
        description: "Open your mouth wide and position lower jaw teeth visible from above.",
    },
    allTeethOpenRightSide: {
        icon: GHOST_ICONS.allTeethOpenRightSide,
        sample: GHOST_SAMPLES.allTeethOpenRightSide,
        name: "All Teeth Open Right Side Template",
        description: "Open your mouth and show all teeth from the right side angle.",
    },
    allTeethOpenMouthLeftSide: {
        icon: GHOST_ICONS.allTeethOpenMouthLeftSide,
        sample: GHOST_SAMPLES.allTeethOpenMouthLeftSide,
        name: "All Teeth Open Mouth Left Side Template",
        description: "Open your mouth wide and show all teeth from the left side angle.",
    },
    allTeethOpenLeftSide: {
        icon: GHOST_ICONS.allTeethOpenLeftSide,
        sample: GHOST_SAMPLES.allTeethOpenLeftSide,
        name: "All Teeth Open Left Side Template",
        description: "Open your mouth and show all teeth from the left side angle.",
    },
    allTeethFrontOpen: {
        icon: GHOST_ICONS.allTeethFrontOpen,
        sample: GHOST_SAMPLES.allTeethFrontOpen,
        name: "All Teeth Front Open Template",
        description: "Open your mouth and show all teeth from the front view.",
    },
    allTeethFrontClosed: {
        icon: GHOST_ICONS.allTeethFrontClosed,
        sample: GHOST_SAMPLES.allTeethFrontClosed,
        name: "All Teeth Front Closed Template",
        description: "Close your mouth naturally and position front view with closed lips.",
    },
    allTeethOpenMouthFront: {
        icon: GHOST_ICONS.allTeethOpenMouthFront,
        sample: GHOST_SAMPLES.allTeethOpenMouthFront,
        name: "All Teeth Open Mouth Front Template",
        description: "Open your mouth wide and show all teeth from the front view.",
    },
    allTeethOpenMouthRightSide: {
        icon: GHOST_ICONS.allTeethOpenMouthRightSide,
        sample: GHOST_SAMPLES.allTeethOpenMouthRightSide,
        name: "All Teeth Open Mouth Right Side Template",
        description: "Open your mouth wide and show all teeth from the right side angle.",
    },
};

export { getGhostIcon, getGhostSample } from "./ghostAssets";

export const getGhostName = (id: GhostItemId): string => {
    return GHOST_METADATA[id]?.name || "Template";
};

export const getGhostDescription = (id: GhostItemId): string => {
    return GHOST_METADATA[id]?.description || "Follow the guide lines to position correctly.";
};
