import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

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
        plugins: [react()],
        build: {
            rollupOptions: {
                input: {
                    index: resolve(__dirname, "src/renderer/index.html"),
                },
            },
        },
    },
});
