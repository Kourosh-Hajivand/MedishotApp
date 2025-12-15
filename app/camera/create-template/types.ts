export type LayoutPattern =
    | "left-right"
    | "top-bottom"
    | "left-tall"
    | "top-wide"
    | "right-tall"
    | "top-two"
    | "grid-2x2"
    | "grid-2x2-alt"
    | "grid-2x2-vertical"
    | "grid-2x3"
    | "grid-2x3-alt"
    | "grid-2x3-horizontal"
    | "grid-3x2"
    | "grid-3x3"
    | "grid-3x3-alt"
    | "grid-3x3-horizontal"
    | "grid-4x2"
    | "grid-2x4"
    | "grid-3x3-full"
    | "grid-3x3-full-alt"
    | "grid-3x3-full-horizontal";

export interface LayoutPatternOption {
    id: LayoutPattern;
    name: string;
}

export interface TemplateItem {
    id: string;
    name: string;
    image: any;
}
