import { app, BrowserWindow, ipcMain } from "electron";
import type { HttpRequestData, RequestData, ResponseData } from "../AppContext";
import { makeHttpRequest } from "./Communication/http";
import { loadRequestList, persistRequestList } from "./Storage/persist";

app.whenReady().then(() => {
    ipcMain.handle("http-request", async (_, request: HttpRequestData): Promise<ResponseData> => {
        return await makeHttpRequest(request);
    });

    ipcMain.handle(
        "load-request-list",
        async () => {
            return await loadRequestList();
        }
    );

    ipcMain.handle(
        "save-request-list",
        async (_, requests: RequestData[]) => {
            await persistRequestList(requests);
        }
    )

    const window = new BrowserWindow({
        autoHideMenuBar: true,
        width: 1000,
        webPreferences: { nodeIntegration: true, contextIsolation: false },
    });

    window.loadFile("../../public/index.html");
});
