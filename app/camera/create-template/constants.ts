import { LayoutPatternOption, TemplateItem } from "./types";

export const LAYOUT_PATTERNS_2_ITEMS: LayoutPatternOption[] = [
    { id: "left-right", name: "Left Right" },
    { id: "top-bottom", name: "Top Bottom" },
];

export const LAYOUT_PATTERNS_3_ITEMS: LayoutPatternOption[] = [
    { id: "left-tall", name: "Left Tall" },
    { id: "top-wide", name: "Top Wide" },
    { id: "right-tall", name: "Right Tall" },
    { id: "top-two", name: "Top Two" },
];

export const LAYOUT_PATTERNS_4_ITEMS: LayoutPatternOption[] = [
    { id: "grid-2x2", name: "Grid 2x2" },
    { id: "grid-2x2-alt", name: "Left Large" },
    { id: "grid-2x2-vertical", name: "Top Large" },
];

export const LAYOUT_PATTERNS_5_ITEMS: LayoutPatternOption[] = [
    { id: "grid-2x3", name: "Grid 2x3" },
    { id: "grid-2x3-alt", name: "Top Large" },
    { id: "grid-2x3-horizontal", name: "Left Large" },
];

export const LAYOUT_PATTERNS_6_ITEMS: LayoutPatternOption[] = [
    { id: "grid-2x3", name: "Grid 2x3" },
    { id: "grid-3x2", name: "Grid 3x2" },
];

export const LAYOUT_PATTERNS_7_ITEMS: LayoutPatternOption[] = [
    { id: "grid-3x3", name: "Grid 3x3" },
    { id: "grid-3x3-alt", name: "Top Large" },
    { id: "grid-3x3-horizontal", name: "Left Large" },
];

export const LAYOUT_PATTERNS_8_ITEMS: LayoutPatternOption[] = [
    { id: "grid-4x2", name: "Grid 4x2" },
    { id: "grid-2x4", name: "Grid 2x4" },
];

export const LAYOUT_PATTERNS_9_ITEMS: LayoutPatternOption[] = [
    { id: "grid-3x3-full", name: "Grid 3x3" },
    { id: "grid-3x3-full-alt", name: "Top Large" },
    { id: "grid-3x3-full-horizontal", name: "Left Large" },
];

export const TEMPLATE_ITEMS: TemplateItem[] = [
    { id: "face", name: "Face", image: require("@/assets/gost/Face.png") },
    { id: "faceTurnRight", name: "Face Turn Right", image: require("@/assets/gost/Face-turn_right.png") },
    { id: "faceTurnLeft", name: "Face Turn Left", image: require("@/assets/gost/Face-turn_left.png") },
    { id: "faceDown", name: "Face Down", image: require("@/assets/gost/Face-down.png") },
    { id: "faceRightSide", name: "Face Right Side", image: require("@/assets/gost/Face-_right_side.png") },
    { id: "faceLeftSide", name: "Face Left Side", image: require("@/assets/gost/Face-_left_side.png") },
    { id: "upperTeethFront", name: "Upper Teeth Front", image: require("@/assets/gost/upper_teeth-close_up-front.png") },
    { id: "upperTeethRightSide", name: "Upper Teeth Right Side", image: require("@/assets/gost/upper_teeth-close_up-_right_side.png") },
    { id: "upperTeethLeftSide", name: "Upper Teeth Left Side", image: require("@/assets/gost/upper_teeth-close_up-_left_side.png") },
    { id: "upperJawDownView", name: "Upper Jaw Down View", image: require("@/assets/gost/upper_jaw_teeth-_down_view.png") },
    { id: "lowerJawUpView", name: "Lower Jaw Up View", image: require("@/assets/gost/lower_jaw_teeth-_up_view.png") },
    { id: "allTeethOpenRightSide", name: "All Teeth Open Right Side", image: require("@/assets/gost/all_teeth-open_right_side.png") },
    { id: "allTeethOpenMouthLeftSide", name: "All Teeth Open Mouth Left Side", image: require("@/assets/gost/all_teeth-open_mouth-left_side.png") },
    { id: "allTeethOpenLeftSide", name: "All Teeth Open Left Side", image: require("@/assets/gost/all_teeth-open_left_side.png") },
    { id: "allTeethFrontOpen", name: "All Teeth Front Open", image: require("@/assets/gost/all_teeth-front_-_open.png") },
    { id: "allTeethFrontClosed", name: "All Teeth Front Closed", image: require("@/assets/gost/all_teeth-front_-_closed.png") },
    { id: "allTeethOpenMouthFront", name: "All Teeth Open Mouth Front", image: require("@/assets/gost/all_teeth_open_mouth-front.png") },
    { id: "allTeethOpenMouthRightSide", name: "All Teeth Open Mouth Right Side", image: require("@/assets/gost/all_teeth-open_mouth-right_side.png") },
];

export const MINT_COLOR = "#00c7be";
