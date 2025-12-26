export type GhostItemId =
    | "face"
    | "frontFaceSmile"
    | "faceTurnRight"
    | "faceTurnLeft"
    | "faceRightSide"
    | "faceLeftSide"
    | "upperTeethFront"
    | "upperTeethRightSide"
    | "upperTeethLeftSide"
    | "upperJawDownView"
    | "lowerJawUpView"
    | "allTeethOpenRightSide"
    | "allTeethOpenMouthLeftSide"
    | "allTeethOpenLeftSide"
    | "allTeethFrontOpen"
    | "allTeethFrontClosed"
    | "allTeethOpenMouthFront"
    | "allTeethOpenMouthRightSide";

type GhostImageSource = number;

export const GHOST_ASSETS: Record<GhostItemId, GhostImageSource> = {
    face: require("@/assets/gost/Face.png"),
    frontFaceSmile: require("@/assets/gost/Front Face Smile.png"),
    faceTurnRight: require("@/assets/gost/Face-turn_right.png"),
    faceTurnLeft: require("@/assets/gost/Face-turn_left.png"),
    faceRightSide: require("@/assets/gost/Face-_right_side.png"),
    faceLeftSide: require("@/assets/gost/Face-_left_side.png"),
    upperTeethFront: require("@/assets/gost/upper_teeth-close_up-front.png"),
    upperTeethRightSide: require("@/assets/gost/upper_teeth-close_up-_right_side.png"),
    upperTeethLeftSide: require("@/assets/gost/upper_teeth-close_up-_left_side.png"),
    upperJawDownView: require("@/assets/gost/upper_jaw_teeth-_down_view.png"),
    lowerJawUpView: require("@/assets/gost/lower_jaw_teeth-_up_view.png"),
    allTeethOpenRightSide: require("@/assets/gost/all_teeth-open_right_side.png"),
    allTeethOpenMouthLeftSide: require("@/assets/gost/all_teeth-open_mouth-left_side.png"),
    allTeethOpenLeftSide: require("@/assets/gost/all_teeth-open_left_side.png"),
    allTeethFrontOpen: require("@/assets/gost/all_teeth-front_-_open.png"),
    allTeethFrontClosed: require("@/assets/gost/all_teeth-front_-_closed.png"),
    allTeethOpenMouthFront: require("@/assets/gost/all_teeth_open_mouth-front.png"),
    allTeethOpenMouthRightSide: require("@/assets/gost/all_teeth-open_mouth-right_side.png"),
};

export type GhostItem = {
    id: GhostItemId;
    name: string;
    image: GhostImageSource;
};

export const GHOST_ITEMS: GhostItem[] = [
    { id: "face", name: "Face", image: GHOST_ASSETS.face },
    { id: "frontFaceSmile", name: "Front Face Smile", image: GHOST_ASSETS.frontFaceSmile },
    { id: "faceTurnRight", name: "Face Turn Right", image: GHOST_ASSETS.faceTurnRight },
    { id: "faceTurnLeft", name: "Face Turn Left", image: GHOST_ASSETS.faceTurnLeft },
    { id: "faceRightSide", name: "Face Right Side", image: GHOST_ASSETS.faceRightSide },
    { id: "faceLeftSide", name: "Face Left Side", image: GHOST_ASSETS.faceLeftSide },
    { id: "upperTeethFront", name: "Upper Teeth Front", image: GHOST_ASSETS.upperTeethFront },
    { id: "upperTeethRightSide", name: "Upper Teeth Right Side", image: GHOST_ASSETS.upperTeethRightSide },
    { id: "upperTeethLeftSide", name: "Upper Teeth Left Side", image: GHOST_ASSETS.upperTeethLeftSide },
    { id: "upperJawDownView", name: "Upper Jaw Down View", image: GHOST_ASSETS.upperJawDownView },
    { id: "lowerJawUpView", name: "Lower Jaw Up View", image: GHOST_ASSETS.lowerJawUpView },
    { id: "allTeethOpenRightSide", name: "All Teeth Open Right Side", image: GHOST_ASSETS.allTeethOpenRightSide },
    { id: "allTeethOpenMouthLeftSide", name: "All Teeth Open Mouth Left Side", image: GHOST_ASSETS.allTeethOpenMouthLeftSide },
    { id: "allTeethOpenLeftSide", name: "All Teeth Open Left Side", image: GHOST_ASSETS.allTeethOpenLeftSide },
    { id: "allTeethFrontOpen", name: "All Teeth Front Open", image: GHOST_ASSETS.allTeethFrontOpen },
    { id: "allTeethFrontClosed", name: "All Teeth Front Closed", image: GHOST_ASSETS.allTeethFrontClosed },
    { id: "allTeethOpenMouthFront", name: "All Teeth Open Mouth Front", image: GHOST_ASSETS.allTeethOpenMouthFront },
    { id: "allTeethOpenMouthRightSide", name: "All Teeth Open Mouth Right Side", image: GHOST_ASSETS.allTeethOpenMouthRightSide },
];

export const getGhostImage = (id: GhostItemId) => GHOST_ASSETS[id];

// Ghost Icons - Using paths from separate ghost-icons folder
export const GHOST_ICONS: Record<GhostItemId, GhostImageSource> = {
    face: require("@/assets/ghost-icons/Face icon.jpg"),
    frontFaceSmile: require("@/assets/ghost-icons/Face icon-1.jpg"),
    faceTurnRight: require("@/assets/ghost-icons/Face-turn right - icon.jpg"),
    faceTurnLeft: require("@/assets/ghost-icons/Face-turn left - icon.jpg"),
    faceRightSide: require("@/assets/ghost-icons/Face- right side - icon.jpg"),
    faceLeftSide: require("@/assets/ghost-icons/Face- left side - icon.jpg"),
    upperTeethFront: require("@/assets/ghost-icons/upper teeth-close up-front - icon.jpg"),
    upperTeethRightSide: require("@/assets/ghost-icons/upper teeth-close up- right side - icon.jpg"),
    upperTeethLeftSide: require("@/assets/ghost-icons/upper teeth-close up- left side - icon.jpg"),
    upperJawDownView: require("@/assets/ghost-icons/upper jaw teeth- down view - icon.jpg"),
    lowerJawUpView: require("@/assets/ghost-icons/lower jaw teeth- up view - icon.jpg"),
    allTeethOpenRightSide: require("@/assets/ghost-icons/all teeth-open right side - icon.jpg"),
    allTeethOpenMouthLeftSide: require("@/assets/ghost-icons/all teeth-open mouth-left side - icon.jpg"),
    allTeethOpenLeftSide: require("@/assets/ghost-icons/all teeth-open left side - icon.jpg"),
    allTeethFrontOpen: require("@/assets/ghost-icons/all teeth-front - open - icon.jpg"),
    allTeethFrontClosed: require("@/assets/ghost-icons/all teeth-front - closed - icon.jpg"),
    allTeethOpenMouthFront: require("@/assets/ghost-icons/all teeth open mouth-front - icon.jpg"),
    allTeethOpenMouthRightSide: require("@/assets/ghost-icons/all teeth-open mouth-right side - icon.jpg"),
};

// Ghost Samples - Using paths from separate ghost-samples folder
export const GHOST_SAMPLES: Record<GhostItemId, GhostImageSource> = {
    face: require("@/assets/ghost-samples/Face - sample.jpg"),
    frontFaceSmile: require("@/assets/ghost-samples/Front Face Smile - sample.jpg"),
    faceTurnRight: require("@/assets/ghost-samples/Face-turn left - sample.jpg"),
    faceTurnLeft: require("@/assets/ghost-samples/Face-turn left - sample.jpg"),
    faceRightSide: require("@/assets/ghost-samples/Face- right side - sample.jpg"),
    faceLeftSide: require("@/assets/ghost-samples/Face- left side - sample.jpg"),
    upperTeethFront: require("@/assets/ghost-samples/upper teeth-close up-front - sample.jpg"),
    upperTeethRightSide: require("@/assets/ghost-samples/upper teeth-close up- right side - sample.jpg"),
    upperTeethLeftSide: require("@/assets/ghost-samples/upper teeth-close up- left side - sample.jpg"),
    upperJawDownView: require("@/assets/ghost-samples/upper jaw teeth- down view - sample.jpg"),
    lowerJawUpView: require("@/assets/ghost-samples/lower jaw teeth - sample - sample.jpg"),
    allTeethOpenRightSide: require("@/assets/ghost-samples/all teeth-open right side - sample.jpg"),
    allTeethOpenMouthLeftSide: require("@/assets/ghost-samples/all teeth-open mouth-left side - sample.jpg"),
    allTeethOpenLeftSide: require("@/assets/ghost-samples/all teeth-open left side - sample.jpg"),
    allTeethFrontOpen: require("@/assets/ghost-samples/all teeth-front - open - sample.jpg"),
    allTeethFrontClosed: require("@/assets/ghost-samples/all teeth-front - closed - sample.jpg"),
    allTeethOpenMouthFront: require("@/assets/ghost-samples/all teeth open mouth- - sample.jpg"),
    allTeethOpenMouthRightSide: require("@/assets/ghost-samples/all teeth-open mouth-right side - sample.jpg"),
};

export const getGhostIcon = (id: GhostItemId) => GHOST_ICONS[id];
export const getGhostSample = (id: GhostItemId) => GHOST_SAMPLES[id];
