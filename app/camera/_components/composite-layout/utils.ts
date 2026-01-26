import { Dimensions } from "react-native";
import { LayoutPattern } from "../create-template/types";

const { width } = Dimensions.get("window");

// Match camera capture: 3:2 (height = width * 1.5). Every composite cell uses this ratio.
export const PHOTO_ASPECT_RATIO = 3 / 2;

export type LayoutStyle = {
    position: "absolute";
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
    width?: number;
    height?: number;
};

/**
 * Calculates the layout style for a composite cell based on index, total count, and layout pattern
 * @param index - The index of the cell (0-based)
 * @param total - Total number of cells
 * @param layoutPattern - The layout pattern to use
 * @param containerWidth - Optional container width (defaults to screen width)
 * @param padding - Optional padding (defaults to 10)
 * @param gap - Optional gap between cells (defaults to 10)
 * @returns LayoutStyle object with position, dimensions, and coordinates
 */
export const getCompositeLayoutStyle = (
    index: number,
    total: number,
    layoutPattern: LayoutPattern,
    containerWidth: number = width,
    padding: number = 10,
    gap: number = 10,
): LayoutStyle => {
    const box = containerWidth; // Full container width (1:1)
    const innerW = box - 2 * padding; // Available width after padding
    const innerH = box - 2 * padding; // Available height after padding
    const pos = "absolute" as const;
    const R = PHOTO_ASPECT_RATIO; // height = width * R

    const cell = (w: number) => ({ w, h: w * R });

    if (total === 0) return {} as LayoutStyle;

    if (total === 1) {
        const w = Math.min(innerW, innerH / R);
        const { h } = cell(w);
        const left = padding + (innerW - w) / 2;
        const top = padding + (innerH - h) / 2;
        return { position: pos, left, top, width: w, height: h };
    }

    if (total === 2) {
        if (layoutPattern === "left-right") {
            const w = (innerW - gap) / 2;
            const { h } = cell(w);
            const top = padding + (innerH - h) / 2;
            const totalWidth = 2 * w + gap;
            const startX = padding + (innerW - totalWidth) / 2; // Center the entire layout
            if (index === 0) return { position: pos, left: startX, top, width: w, height: h };
            return { position: pos, left: startX + w + gap, top, width: w, height: h };
        }
        const h = (innerH - gap) / 2;
        const w = h / R;
        const left = padding + (innerW - w) / 2;
        if (index === 0) return { position: pos, left, top: padding, width: w, height: h };
        return { position: pos, left, top: padding + h + gap, width: w, height: h };
    }

    switch (layoutPattern) {
        case "left-tall": {
            const rightW = (innerW - gap) / 2;
            const rightH = (innerH - gap) / 2;
            const rightCellW = Math.min(rightW, rightH / R);
            const rightCellH = rightCellW * R;
            const leftW = innerW - gap - rightCellW;
            const leftH = Math.min(innerH, leftW * R);
            const leftCellW = leftH / R;
            const leftCellH = leftH;
            const leftTop = padding + (innerH - leftCellH) / 2;
            // Calculate total width and center the entire layout
            const totalWidth = leftCellW + gap + rightCellW;
            const startX = padding + (innerW - totalWidth) / 2;
            if (index === 0) return { position: pos, left: startX, top: leftTop, width: leftCellW, height: leftCellH };
            const r1Top = padding + (innerH - 2 * rightCellH - gap) / 2;
            const rightLeft = startX + leftCellW + gap;
            if (index === 1) return { position: pos, left: rightLeft, top: r1Top, width: rightCellW, height: rightCellH };
            return { position: pos, left: rightLeft, top: r1Top + rightCellH + gap, width: rightCellW, height: rightCellH };
        }
        case "top-wide": {
            const topH = (innerH - gap) / 2;
            const topW = Math.min(innerW, topH / R);
            const topCellW = topW;
            const topCellH = topCellW * R;
            const topLeft = padding + (innerW - topCellW) / 2;
            const botW = (innerW - gap) / 2;
            const botH = Math.min((innerH - gap) / 2, botW * R);
            const botCellW = botH / R;
            const botCellH = botH;
            const botStartX = padding + (innerW - (2 * botCellW + gap)) / 2;
            const botTop = padding + topCellH + gap + ((innerH - gap) / 2 - botCellH) / 2;
            if (index === 0) return { position: pos, left: topLeft, top: padding, width: topCellW, height: topCellH };
            if (index === 1) return { position: pos, left: botStartX, top: botTop, width: botCellW, height: botCellH };
            return { position: pos, left: botStartX + botCellW + gap, top: botTop, width: botCellW, height: botCellH };
        }
        case "right-tall": {
            const leftW = (innerW - gap) / 2;
            const leftH = (innerH - gap) / 2;
            const leftCellW = Math.min(leftW, leftH / R);
            const leftCellH = leftCellW * R;
            const rightW = innerW - gap - leftCellW;
            const rightH = Math.min(innerH, rightW * R);
            const rightCellW = rightH / R;
            const rightCellH = rightH;
            const rightTop = padding + (innerH - rightCellH) / 2;
            // Calculate total width and center the entire layout
            const totalWidth = leftCellW + gap + rightCellW;
            const startX = padding + (innerW - totalWidth) / 2;
            if (index === 0) return { position: pos, left: startX, top: padding + (innerH - 2 * leftCellH - gap) / 2, width: leftCellW, height: leftCellH };
            if (index === 1) return { position: pos, left: startX, top: padding + (innerH - 2 * leftCellH - gap) / 2 + leftCellH + gap, width: leftCellW, height: leftCellH };
            return { position: pos, left: startX + leftCellW + gap, top: rightTop, width: rightCellW, height: rightCellH };
        }
        case "top-two": {
            const topW = (innerW - gap) / 2;
            const topH = topW * R;
            const botH = innerH - topH - gap;
            const botW = Math.min(innerW, botH / R);
            const botCellW = botW;
            const botCellH = botCellW * R;
            const botLeft = padding + (innerW - botCellW) / 2;
            if (index === 0) return { position: pos, left: padding, top: padding, width: topW, height: topH };
            if (index === 1) return { position: pos, left: padding + topW + gap, top: padding, width: topW, height: topH };
            return { position: pos, left: botLeft, top: padding + topH + gap, width: botCellW, height: botCellH };
        }
        case "grid-2x2": {
            const wByWidth = (innerW - gap) / 2;
            const wByHeight = (innerH - gap) / 2 / R;
            const itemW = Math.min(wByWidth, wByHeight);
            const itemH = itemW * R;
            const startX = padding + (innerW - (2 * itemW + gap)) / 2;
            const row = Math.floor(index / 2);
            const col = index % 2;
            return { position: pos, left: startX + col * (itemW + gap), top: padding + row * (itemH + gap), width: itemW, height: itemH };
        }
        case "grid-2x2-alt": {
            const rightW = (innerW - gap) / 2;
            const rightH = (innerH - 2 * gap) / 3;
            const rightCellW = Math.min(rightW, rightH / R);
            const rightCellH = rightCellW * R;
            const leftW = innerW - gap - rightCellW;
            const leftH = Math.min(innerH, leftW * R);
            const leftCellW = leftH / R;
            const leftCellH = leftH;
            const leftTop = padding + (innerH - leftCellH) / 2;
            // Calculate total width and center the entire layout
            const totalWidth = leftCellW + gap + rightCellW;
            const startX = padding + (innerW - totalWidth) / 2;
            if (index === 0) return { position: pos, left: startX, top: leftTop, width: leftCellW, height: leftCellH };
            const r0Top = padding + (innerH - 3 * rightCellH - 2 * gap) / 2;
            return { position: pos, left: startX + leftCellW + gap, top: r0Top + (index - 1) * (rightCellH + gap), width: rightCellW, height: rightCellH };
        }
        case "grid-2x2-vertical": {
            const topH = (innerH - gap) / 2;
            const topW = Math.min(innerW, topH / R);
            const topCellW = topW;
            const topCellH = topCellW * R;
            const topLeft = padding + (innerW - topCellW) / 2;
            const botW = (innerW - 2 * gap) / 3;
            const botH = Math.min((innerH - gap) / 2, botW * R);
            const botCellW = botH / R;
            const botCellH = botH;
            const botStartX = padding + (innerW - (3 * botCellW + 2 * gap)) / 2;
            if (index === 0) return { position: pos, left: topLeft, top: padding, width: topCellW, height: topCellH };
            return { position: pos, left: botStartX + (index - 1) * (botCellW + gap), top: padding + topCellH + gap, width: botCellW, height: botCellH };
        }
        case "grid-2x3": {
            const wByW = (innerW - gap) / 2;
            const wByH = (innerH - 2 * gap) / 3 / R;
            const itemW = Math.min(wByW, wByH);
            const itemH = itemW * R;
            const startX = padding + (innerW - (2 * itemW + gap)) / 2;
            const row = Math.floor(index / 2);
            const col = index % 2;
            return { position: pos, left: startX + col * (itemW + gap), top: padding + row * (itemH + gap), width: itemW, height: itemH };
        }
        case "grid-2x3-alt": {
            const topH = (innerH - gap) * 0.4;
            const topW = Math.min(innerW, topH / R);
            const topCellW = topW;
            const topCellH = topCellW * R;
            const topLeft = padding + (innerW - topCellW) / 2;
            const remH = (innerH - gap) * 0.6 - gap;
            const botW = (innerW - gap) / 2;
            const botH = Math.min(remH / 2, botW * R);
            const botCellW = botH / R;
            const botCellH = botH;
            const botStartX = padding + (innerW - (2 * botCellW + gap)) / 2;
            const botTop = padding + topCellH + gap + (remH - 2 * botCellH - gap) / 2;
            if (index === 0) return { position: pos, left: topLeft, top: padding, width: topCellW, height: topCellH };
            const r = Math.floor((index - 1) / 2);
            const c = (index - 1) % 2;
            return { position: pos, left: botStartX + c * (botCellW + gap), top: botTop + r * (botCellH + gap), width: botCellW, height: botCellH };
        }
        case "grid-2x3-horizontal": {
            const leftW = (innerW - gap) / 2;
            const leftH = Math.min(innerH, leftW * R);
            const leftCellW = leftH / R;
            const leftCellH = leftH;
            const leftTop = padding + (innerH - leftCellH) / 2;
            const rightW = (innerW - gap) / 2 - gap;
            const rightH = (innerH - gap) / 2;
            const rightCellW = Math.min(rightW / 2, rightH / R);
            const rightCellH = rightCellW * R;
            // Calculate total width and center the entire layout
            const totalWidth = leftCellW + gap + 2 * rightCellW + gap;
            const startX = padding + (innerW - totalWidth) / 2;
            const rightStartX = startX + leftCellW + gap;
            const rightStartY = padding + (innerH - 2 * rightCellH - gap) / 2;
            if (index === 0) return { position: pos, left: startX, top: leftTop, width: leftCellW, height: leftCellH };
            const r = Math.floor((index - 1) / 2);
            const c = (index - 1) % 2;
            return { position: pos, left: rightStartX + c * (rightCellW + gap), top: rightStartY + r * (rightCellH + gap), width: rightCellW, height: rightCellH };
        }
        case "grid-3x2": {
            const wByW = (innerW - 2 * gap) / 3;
            const wByH = (innerH - gap) / 2 / R;
            const itemW = Math.min(wByW, wByH);
            const itemH = itemW * R;
            const startX = padding + (innerW - (3 * itemW + 2 * gap)) / 2;
            const row = Math.floor(index / 3);
            const col = index % 3;
            return { position: pos, left: startX + col * (itemW + gap), top: padding + row * (itemH + gap), width: itemW, height: itemH };
        }
        case "grid-3x3": {
            const wByW = (innerW - 2 * gap) / 3;
            const wByH = (innerH - 2 * gap) / 3 / R;
            const itemW = Math.min(wByW, wByH);
            const itemH = itemW * R;
            const startX = padding + (innerW - (3 * itemW + 2 * gap)) / 2;
            const startY = padding + (innerH - (3 * itemH + 2 * gap)) / 2;
            const row = Math.floor(index / 3);
            const col = index % 3;
            return { position: pos, left: startX + col * (itemW + gap), top: startY + row * (itemH + gap), width: itemW, height: itemH };
        }
        case "grid-3x3-alt": {
            const topH = (innerH - gap) * 0.35;
            const topW = Math.min(innerW, topH / R);
            const topCellW = topW;
            const topCellH = topCellW * R;
            const topLeft = padding + (innerW - topCellW) / 2;
            const remH = (innerH - gap) * 0.65 - gap;
            const botW = (innerW - 2 * gap) / 3;
            const botH = Math.min(remH / 2, botW * R);
            const botCellW = botH / R;
            const botCellH = botH;
            const botStartX = padding + (innerW - (3 * botCellW + 2 * gap)) / 2;
            const botTop = padding + topCellH + gap + (remH - 2 * botCellH - gap) / 2;
            if (index === 0) return { position: pos, left: topLeft, top: padding, width: topCellW, height: topCellH };
            const r = Math.floor((index - 1) / 3);
            const c = (index - 1) % 3;
            return { position: pos, left: botStartX + c * (botCellW + gap), top: botTop + r * (botCellH + gap), width: botCellW, height: botCellH };
        }
        case "grid-3x3-horizontal": {
            const leftW = innerW * 0.4;
            const leftH = Math.min(innerH, leftW * R);
            const leftCellW = leftH / R;
            const leftCellH = leftH;
            const leftTop = padding + (innerH - leftCellH) / 2;
            const rightW = innerW * 0.6 - gap;
            const rightH = (innerH - 2 * gap) / 3;
            const rightCellW = Math.min(rightW / 2, rightH / R);
            const rightCellH = rightCellW * R;
            // Calculate total width and center the entire layout
            const totalWidth = leftCellW + gap + 2 * rightCellW + gap;
            const startX = padding + (innerW - totalWidth) / 2;
            const rightStartX = startX + leftCellW + gap;
            const rightStartY = padding + (innerH - 3 * rightCellH - 2 * gap) / 2;
            if (index === 0) return { position: pos, left: startX, top: leftTop, width: leftCellW, height: leftCellH };
            const r = Math.floor((index - 1) / 2);
            const c = (index - 1) % 2;
            return { position: pos, left: rightStartX + c * (rightCellW + gap), top: rightStartY + r * (rightCellH + gap), width: rightCellW, height: rightCellH };
        }
        case "grid-4x2": {
            const wByW = (innerW - 3 * gap) / 4;
            const wByH = (innerH - gap) / 2 / R;
            const itemW = Math.min(wByW, wByH);
            const itemH = itemW * R;
            const startX = padding + (innerW - (4 * itemW + 3 * gap)) / 2;
            const row = Math.floor(index / 4);
            const col = index % 4;
            return { position: pos, left: startX + col * (itemW + gap), top: padding + row * (itemH + gap), width: itemW, height: itemH };
        }
        case "grid-2x4": {
            const wByW = (innerW - gap) / 2;
            const wByH = (innerH - 3 * gap) / 4 / R;
            const itemW = Math.min(wByW, wByH);
            const itemH = itemW * R;
            const startX = padding + (innerW - (2 * itemW + gap)) / 2;
            const startY = padding + (innerH - (4 * itemH + 3 * gap)) / 2;
            const row = Math.floor(index / 2);
            const col = index % 2;
            return { position: pos, left: startX + col * (itemW + gap), top: startY + row * (itemH + gap), width: itemW, height: itemH };
        }
        case "grid-3x3-full": {
            const wByW = (innerW - 2 * gap) / 3;
            const wByH = (innerH - 2 * gap) / 3 / R;
            const itemW = Math.min(wByW, wByH);
            const itemH = itemW * R;
            const startX = padding + (innerW - (3 * itemW + 2 * gap)) / 2;
            const startY = padding + (innerH - (3 * itemH + 2 * gap)) / 2;
            const row = Math.floor(index / 3);
            const col = index % 3;
            return { position: pos, left: startX + col * (itemW + gap), top: startY + row * (itemH + gap), width: itemW, height: itemH };
        }
        case "grid-3x3-full-alt": {
            const topH = (innerH - gap) * 0.35;
            const topW = Math.min(innerW, topH / R);
            const topCellW = topW;
            const topCellH = topCellW * R;
            const topLeft = padding + (innerW - topCellW) / 2;
            const remH = (innerH - gap) * 0.65 - gap;
            const botW = (innerW - 3 * gap) / 4;
            const botH = Math.min(remH / 2, botW * R);
            const botCellW = botH / R;
            const botCellH = botH;
            const botStartX = padding + (innerW - (4 * botCellW + 3 * gap)) / 2;
            const botTop = padding + topCellH + gap + (remH - 2 * botCellH - gap) / 2;
            if (index === 0) return { position: pos, left: topLeft, top: padding, width: topCellW, height: topCellH };
            const r = Math.floor((index - 1) / 4);
            const c = (index - 1) % 4;
            return { position: pos, left: botStartX + c * (botCellW + gap), top: botTop + r * (botCellH + gap), width: botCellW, height: botCellH };
        }
        case "grid-3x3-full-horizontal": {
            const leftW = innerW * 0.4;
            const leftH = Math.min(innerH, leftW * R);
            const leftCellW = leftH / R;
            const leftCellH = leftH;
            const leftTop = padding + (innerH - leftCellH) / 2;
            const rightW = innerW * 0.6 - gap;
            const rightH = (innerH - 3 * gap) / 4;
            const rightCellW = Math.min(rightW / 2, rightH / R);
            const rightCellH = rightCellW * R;
            // Calculate total width and center the entire layout
            const totalWidth = leftCellW + gap + 2 * rightCellW + gap;
            const startX = padding + (innerW - totalWidth) / 2;
            const rightStartX = startX + leftCellW + gap;
            const rightStartY = padding + (innerH - 4 * rightCellH - 3 * gap) / 2;
            if (index === 0) return { position: pos, left: startX, top: leftTop, width: leftCellW, height: leftCellH };
            const r = Math.floor((index - 1) / 2);
            const c = (index - 1) % 2;
            return { position: pos, left: rightStartX + c * (rightCellW + gap), top: rightStartY + r * (rightCellH + gap), width: rightCellW, height: rightCellH };
        }
        default:
            if (total === 9) {
                const wByW = (innerW - 2 * gap) / 3;
                const wByH = (innerH - 2 * gap) / 3 / R;
                const itemW = Math.min(wByW, wByH);
                const itemH = itemW * R;
                const startX = padding + (innerW - (3 * itemW + 2 * gap)) / 2;
                const startY = padding + (innerH - (3 * itemH + 2 * gap)) / 2;
                const row = Math.floor(index / 3);
                const col = index % 3;
                return { position: pos, left: startX + col * (itemW + gap), top: startY + row * (itemH + gap), width: itemW, height: itemH };
            }
            return {} as LayoutStyle;
    }
};
