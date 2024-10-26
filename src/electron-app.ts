import { app, BrowserWindow, ipcMain } from "electron";
import type { HttpRequestData, RequestData, ResponseData } from "./AppContext";
import { makeHttpRequest } from "./Communication/http";

app.whenReady()
    .then(() => {
        ipcMain.handle("http-request", async (_, request: HttpRequestData): Promise<ResponseData> => {
            return await makeHttpRequest(request);
        })

        const window = new BrowserWindow({
            autoHideMenuBar: true,
            width: 1000,
            webPreferences: { nodeIntegration: true, contextIsolation: false }
        });

        window.loadFile("../public/index.html");
    });