import type * as CSS from "csstype";

export const backgroundColor: CSS.DataType.Color = "#0c0c0c";
export const backgroundContrastColor: CSS.DataType.Color = "#161920";
export const backgroundHoverColor: CSS.DataType.Color = "#304674";
export const backgroundHoverColorAlternate: CSS.DataType.Color = "#8f3535";

export const borderColor: CSS.DataType.Color = "#2b2b2b";

export const errorColor: CSS.DataType.Color = "darkred";

export const httpVerbColorPalette: Record<string, CSS.DataType.Color> = {
    GET: "#51cf66",
    POST: "#4dabf7",
    PUT: "#ffa94d",
    PATCH: "#ff6b6b",
    DELETE: "#e64980",
    HEAD: "#be4bdb",
    OPTIONS: "#fcc419",
    TRACE: "#82c91e",
    CONNECT: "#fab005",
};
