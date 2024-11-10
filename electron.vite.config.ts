import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {
                input: {
                    index: resolve(__dirname, "src/electron/electron-app.ts"),
                },
            },
        },
    },
    preload: {
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {
                input: {
                    index: resolve(__dirname, "src/preload/index.ts"),
                },
            },
        },
    },
    renderer: {
        plugins: [
            react({
                babel: {
                    plugins: [
                        [
                            "styled-components",
                            {
                                displayName: true,
                            },
                        ],
                    ],
                },
            }),
        ],
        build: {
            rollupOptions: {
                input: {
                    index: resolve(__dirname, "src/renderer/index.html"),
                },
            },
        },
    },
});
