import type * as CSS from "csstype";

const statusCodesColorPalette: Record<number, CSS.DataType.Color> = {
    500: "rgb(220 38 38)",
    400: "rgb(249 115 22)",
    300: "rgb(59 130 246)",
    200: "rgb(22 163 74)",
    0: "rgb(107 114 128)",
};

export function statusCodeColor(statusCode: number) {
    if (statusCode >= 500) return statusCodesColorPalette[500];
    if (statusCode >= 400) return statusCodesColorPalette[400];
    if (statusCode >= 300) return statusCodesColorPalette[300];
    if (statusCode >= 200) return statusCodesColorPalette[200];
    return statusCodesColorPalette[0];
}
