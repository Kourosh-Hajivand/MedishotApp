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
