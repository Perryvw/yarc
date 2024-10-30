import { app, BrowserWindow, ipcMain, ipcRenderer } from "electron";
import { makeHttpRequest } from "./Communication/http";
import { getPersistedState, persistCurrentState } from "./Storage/persist";
import { IpcCall, IpcEvent } from "../common/ipc";
import type { HttpRequestData, RequestList, ResponseData } from "../common/request-types";
import { exportDirectory, importDirectory } from "./Storage/import-export";
import type { PersistedState } from "../common/persist-state";
import { join } from "node:path";

app.whenReady().then(async () => {
    const persistedState = await getPersistedState();
    const window = new BrowserWindow({
        autoHideMenuBar: true,
        webPreferences: {
            preload: join(__dirname, "../preload/index.js"),
            sandbox: false,
        },

        x: persistedState?.window.position[0],
        y: persistedState?.window.position[1],
        width: persistedState?.window.size[0] ?? 1000,
        height: persistedState?.window.size[1],
    });

    ipcMain.handle(IpcCall.HttpRequest, async (_, request: HttpRequestData): Promise<ResponseData> => {
        return await makeHttpRequest(request);
    });

    ipcMain.handle(IpcCall.LoadPersistedState, async () => {
        return await getPersistedState();
    });

    ipcMain.handle(IpcCall.PersistState, async (_, state: PersistedState) => {
        await persistCurrentState(state, window);

        // If we are closing then this was the last persist, quit the app
        if (closing) {
            app.quit();
        }
    });

    ipcMain.handle(IpcCall.ImportDirectory, async () => {
        return await importDirectory();
    });

    ipcMain.handle(IpcCall.ExportDirectory, async (_, requests: RequestList) => {
        await exportDirectory(requests);
    });

    let closing = false; // We need to prevent first close to give renderer the chance to persist state
    window.on("close", (e) => {
        if (!closing) {
            // Prevent close
            e.preventDefault();
            // Notify renderer we are closing, can't use regular ipc interface for some reason
            window.webContents.send(IpcEvent.WindowClosing);
            // Remember we are in closing state
            closing = true;
        }
    });

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
        window.loadURL(process.env.ELECTRON_RENDERER_URL);
    } else {
        window.loadFile(join(__dirname, "../renderer/index.html"));
    }
});
