import { Dimensions } from "react-native";
import { LayoutPattern } from "./types";

const { width } = Dimensions.get("window");

export const getItemLayoutStyle = (index: number, total: number, selectedLayout: LayoutPattern, customBoxSize?: number): any => {
    if (total === 0) return {};

    const padding = 7; // 7px from box edge
    const boxWidth = customBoxSize || width - 40; // Full preview box width or custom size
    const boxHeight = customBoxSize || (width - 40) * 0.92; // Full preview box height or custom size

    if (total === 1) {
        // Single item: center it, large size
        const size = Math.min(boxWidth, boxHeight) * 0.7;
        return {
            position: "absolute",
            top: (boxHeight - size) / 2,
            left: (boxWidth - size) / 2,
            width: size,
            height: size,
        };
    }

    if (total === 2) {
        // Two items: based on selected layout
        if (selectedLayout === "left-right") {
            // Left and right
            if (index === 0) {
                return {
                    position: "absolute",
                    left: padding,
                    top: padding,
                    width: (boxWidth - padding * 3) / 2,
                    height: boxHeight - padding * 2,
                };
            } else {
                return {
                    position: "absolute",
                    right: padding,
                    top: padding,
                    width: (boxWidth - padding * 3) / 2,
                    height: boxHeight - padding * 2,
                };
            }
        } else {
            // Top and bottom
            if (index === 0) {
                return {
                    position: "absolute",
                    left: padding,
                    top: padding,
                    width: boxWidth - padding * 2,
                    height: (boxHeight - padding * 3) / 2,
                };
            } else {
                return {
                    position: "absolute",
                    left: padding,
                    bottom: padding,
                    width: boxWidth - padding * 2,
                    height: (boxHeight - padding * 3) / 2,
                };
            }
        }
    }

    // Three or more items: use layout patterns
    switch (selectedLayout) {
        case "left-tall":
            if (index === 0) {
                // Tall rectangle on left
                return {
                    position: "absolute",
                    left: padding,
                    top: padding,
                    width: boxWidth * 0.4,
                    height: boxHeight - padding * 2,
                };
            } else if (index === 1) {
                // Top right
                return {
                    position: "absolute",
                    right: padding,
                    top: padding,
                    width: boxWidth * 0.55,
                    height: (boxHeight - padding * 3) / 2,
                };
            } else {
                // Bottom right
                return {
                    position: "absolute",
                    right: padding,
                    bottom: padding,
                    width: boxWidth * 0.55,
                    height: (boxHeight - padding * 3) / 2,
                };
            }

        case "top-wide":
            if (index === 0) {
                // Wide rectangle on top
                return {
                    position: "absolute",
                    left: padding,
                    top: padding,
                    width: boxWidth - padding * 2,
                    height: (boxHeight - padding * 3) / 2,
                };
            } else if (index === 1) {
                // Bottom left
                return {
                    position: "absolute",
                    left: padding,
                    bottom: padding,
                    width: (boxWidth - padding * 3) / 2,
                    height: (boxHeight - padding * 3) / 2,
                };
            } else {
                // Bottom right
                return {
                    position: "absolute",
                    right: padding,
                    bottom: padding,
                    width: (boxWidth - padding * 3) / 2,
                    height: (boxHeight - padding * 3) / 2,
                };
            }

        case "right-tall":
            if (index === 0) {
                // Top left
                return {
                    position: "absolute",
                    left: padding,
                    top: padding,
                    width: boxWidth * 0.55,
                    height: (boxHeight - padding * 3) / 2,
                };
            } else if (index === 1) {
                // Bottom left
                return {
                    position: "absolute",
                    left: padding,
                    bottom: padding,
                    width: boxWidth * 0.55,
                    height: (boxHeight - padding * 3) / 2,
                };
            } else {
                // Tall rectangle on right
                return {
                    position: "absolute",
                    right: padding,
                    top: padding,
                    width: boxWidth * 0.4,
                    height: boxHeight - padding * 2,
                };
            }

        case "top-two":
            if (index === 0) {
                // Top left
                return {
                    position: "absolute",
                    left: padding,
                    top: padding,
                    width: (boxWidth - padding * 3) / 2,
                    height: (boxHeight - padding * 3) / 2,
                };
            } else if (index === 1) {
                // Top right
                return {
                    position: "absolute",
                    right: padding,
                    top: padding,
                    width: (boxWidth - padding * 3) / 2,
                    height: (boxHeight - padding * 3) / 2,
                };
            } else {
                // Bottom center
                return {
                    position: "absolute",
                    left: "50%",
                    bottom: padding,
                    transform: [{ translateX: -(boxWidth - padding * 2) / 2 }],
                    width: boxWidth - padding * 2,
                    height: (boxHeight - padding * 3) / 2,
                };
            }

        // 4 items layouts
        case "grid-2x2": {
            const itemWidth = (boxWidth - padding * 3) / 2;
            const itemHeight = (boxHeight - padding * 3) / 2;
            const row = Math.floor(index / 2);
            const col = index % 2;
            return {
                position: "absolute",
                left: padding + col * (itemWidth + padding),
                top: padding + row * (itemHeight + padding),
                width: itemWidth,
                height: itemHeight,
            };
        }

        case "grid-2x2-alt": {
            // Alternative: one large on left, 3 small on right
            if (index === 0) {
                return {
                    position: "absolute",
                    left: padding,
                    top: padding,
                    width: boxWidth * 0.5,
                    height: boxHeight - padding * 2,
                };
            } else {
                const itemWidth = boxWidth * 0.5 - padding * 2;
                const itemHeight = (boxHeight - padding * 4) / 3;
                return {
                    position: "absolute",
                    right: padding,
                    top: padding + (index - 1) * (itemHeight + padding),
                    width: itemWidth,
                    height: itemHeight,
                };
            }
        }

        // 5 items layouts
        case "grid-2x3": {
            // 2 columns, 3 rows (with one empty spot)
            const itemWidth = (boxWidth - padding * 3) / 2;
            const itemHeight = (boxHeight - padding * 4) / 3;
            const row = Math.floor(index / 2);
            const col = index % 2;
            return {
                position: "absolute",
                left: padding + col * (itemWidth + padding),
                top: padding + row * (itemHeight + padding),
                width: itemWidth,
                height: itemHeight,
            };
        }

        case "grid-2x3-alt": {
            // One large on top, 4 small below in 2x2
            if (index === 0) {
                return {
                    position: "absolute",
                    left: padding,
                    top: padding,
                    width: boxWidth - padding * 2,
                    height: (boxHeight - padding * 3) * 0.4,
                };
            } else {
                const itemWidth = (boxWidth - padding * 3) / 2;
                const itemHeight = ((boxHeight - padding * 3) * 0.6) / 2;
                const row = Math.floor((index - 1) / 2);
                const col = (index - 1) % 2;
                return {
                    position: "absolute",
                    left: padding + col * (itemWidth + padding),
                    top: padding + (boxHeight - padding * 2) * 0.4 + padding + row * (itemHeight + padding),
                    width: itemWidth,
                    height: itemHeight,
                };
            }
        }

        // 6 items layouts
        case "grid-3x2": {
            // 3 columns, 2 rows
            const itemWidth = (boxWidth - padding * 4) / 3;
            const itemHeight = (boxHeight - padding * 3) / 2;
            const row = Math.floor(index / 3);
            const col = index % 3;
            return {
                position: "absolute",
                left: padding + col * (itemWidth + padding),
                top: padding + row * (itemHeight + padding),
                width: itemWidth,
                height: itemHeight,
            };
        }

        // 7 items layouts
        case "grid-3x3": {
            // 3x3 grid (with 2 empty spots)
            const itemWidth = (boxWidth - padding * 4) / 3;
            const itemHeight = (boxHeight - padding * 4) / 3;
            const row = Math.floor(index / 3);
            const col = index % 3;
            return {
                position: "absolute",
                left: padding + col * (itemWidth + padding),
                top: padding + row * (itemHeight + padding),
                width: itemWidth,
                height: itemHeight,
            };
        }

        case "grid-3x3-alt": {
            // One large on top, 6 small below in 3x2
            if (index === 0) {
                return {
                    position: "absolute",
                    left: padding,
                    top: padding,
                    width: boxWidth - padding * 2,
                    height: (boxHeight - padding * 3) * 0.35,
                };
            } else {
                const itemWidth = (boxWidth - padding * 4) / 3;
                const itemHeight = ((boxHeight - padding * 3) * 0.65) / 2;
                const row = Math.floor((index - 1) / 3);
                const col = (index - 1) % 3;
                return {
                    position: "absolute",
                    left: padding + col * (itemWidth + padding),
                    top: padding + (boxHeight - padding * 2) * 0.35 + padding + row * (itemHeight + padding),
                    width: itemWidth,
                    height: itemHeight,
                };
            }
        }

        // 8 items layouts
        case "grid-4x2": {
            // 4 columns, 2 rows
            const itemWidth = (boxWidth - padding * 5) / 4;
            const itemHeight = (boxHeight - padding * 3) / 2;
            const row = Math.floor(index / 4);
            const col = index % 4;
            return {
                position: "absolute",
                left: padding + col * (itemWidth + padding),
                top: padding + row * (itemHeight + padding),
                width: itemWidth,
                height: itemHeight,
            };
        }

        case "grid-2x4": {
            // 2 columns, 4 rows
            const itemWidth = (boxWidth - padding * 3) / 2;
            const itemHeight = (boxHeight - padding * 5) / 4;
            const row = Math.floor(index / 2);
            const col = index % 2;
            return {
                position: "absolute",
                left: padding + col * (itemWidth + padding),
                top: padding + row * (itemHeight + padding),
                width: itemWidth,
                height: itemHeight,
            };
        }

        // 4 items - additional layouts
        case "grid-2x2-vertical": {
            // One large on top, 3 small below
            if (index === 0) {
                return {
                    position: "absolute",
                    left: padding,
                    top: padding,
                    width: boxWidth - padding * 2,
                    height: (boxHeight - padding * 3) * 0.5,
                };
            } else {
                const itemWidth = (boxWidth - padding * 4) / 3;
                const itemHeight = (boxHeight - padding * 3) * 0.5;
                return {
                    position: "absolute",
                    left: padding + (index - 1) * (itemWidth + padding),
                    bottom: padding,
                    width: itemWidth,
                    height: itemHeight,
                };
            }
        }

        // 5 items - additional layouts
        case "grid-2x3-horizontal": {
            // One large on left, 4 small on right in 2x2
            if (index === 0) {
                return {
                    position: "absolute",
                    left: padding,
                    top: padding,
                    width: boxWidth * 0.5,
                    height: boxHeight - padding * 2,
                };
            } else {
                const itemWidth = (boxWidth * 0.5 - padding * 3) / 2;
                const itemHeight = (boxHeight - padding * 3) / 2;
                const row = Math.floor((index - 1) / 2);
                const col = (index - 1) % 2;
                return {
                    position: "absolute",
                    right: padding + col * (itemWidth + padding),
                    top: padding + row * (itemHeight + padding),
                    width: itemWidth,
                    height: itemHeight,
                };
            }
        }

        // 7 items - additional layouts
        case "grid-3x3-horizontal": {
            // One large on left, 6 small on right in 2x3
            if (index === 0) {
                return {
                    position: "absolute",
                    left: padding,
                    top: padding,
                    width: boxWidth * 0.4,
                    height: boxHeight - padding * 2,
                };
            } else {
                const itemWidth = (boxWidth * 0.6 - padding * 3) / 2;
                const itemHeight = (boxHeight - padding * 4) / 3;
                const row = Math.floor((index - 1) / 2);
                const col = (index - 1) % 2;
                return {
                    position: "absolute",
                    right: padding + col * (itemWidth + padding),
                    top: padding + row * (itemHeight + padding),
                    width: itemWidth,
                    height: itemHeight,
                };
            }
        }

        // 9 items - layouts
        case "grid-3x3-full": {
            // Full 3x3 grid
            const itemWidth = (boxWidth - padding * 4) / 3;
            const itemHeight = (boxHeight - padding * 4) / 3;
            const row = Math.floor(index / 3);
            const col = index % 3;
            return {
                position: "absolute",
                left: padding + col * (itemWidth + padding),
                top: padding + row * (itemHeight + padding),
                width: itemWidth,
                height: itemHeight,
            };
        }

        case "grid-3x3-full-alt": {
            // One large on top, 8 small below in 4x2
            if (index === 0) {
                return {
                    position: "absolute",
                    left: padding,
                    top: padding,
                    width: boxWidth - padding * 2,
                    height: (boxHeight - padding * 3) * 0.35,
                };
            } else {
                const itemWidth = (boxWidth - padding * 5) / 4;
                const itemHeight = ((boxHeight - padding * 3) * 0.65) / 2;
                const row = Math.floor((index - 1) / 4);
                const col = (index - 1) % 4;
                return {
                    position: "absolute",
                    left: padding + col * (itemWidth + padding),
                    top: padding + (boxHeight - padding * 2) * 0.35 + padding + row * (itemHeight + padding),
                    width: itemWidth,
                    height: itemHeight,
                };
            }
        }

        case "grid-3x3-full-horizontal": {
            // One large on left, 8 small on right in 2x4
            if (index === 0) {
                return {
                    position: "absolute",
                    left: padding,
                    top: padding,
                    width: boxWidth * 0.4,
                    height: boxHeight - padding * 2,
                };
            } else {
                const itemWidth = (boxWidth * 0.6 - padding * 3) / 2;
                const itemHeight = (boxHeight - padding * 5) / 4;
                const row = Math.floor((index - 1) / 2);
                const col = (index - 1) % 2;
                return {
                    position: "absolute",
                    right: padding + col * (itemWidth + padding),
                    top: padding + row * (itemHeight + padding),
                    width: itemWidth,
                    height: itemHeight,
                };
            }
        }

        // 9 items layout (3x3 grid)
        default:
            // For 9 items, use 3x3 grid
            if (total === 9) {
                const itemWidth = (boxWidth - padding * 4) / 3;
                const itemHeight = (boxHeight - padding * 4) / 3;
                const row = Math.floor(index / 3);
                const col = index % 3;
                return {
                    position: "absolute",
                    left: padding + col * (itemWidth + padding),
                    top: padding + row * (itemHeight + padding),
                    width: itemWidth,
                    height: itemHeight,
                };
            }
            return {};
    }
};
