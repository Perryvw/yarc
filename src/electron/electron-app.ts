import { app, BrowserWindow, ipcMain } from "electron";
import { makeHttpRequest } from "./Communication/http";
import { loadRequestList, persistRequestList } from "./Storage/persist";
import { IpcCall } from "../common/ipc";
import type { HttpRequestData, RequestData, ResponseData } from "../common/request-types";
import { exportDirectory, importDirectory } from "./Storage/import-export";

app.whenReady().then(() => {
    ipcMain.handle(IpcCall.HttpRequest, async (_, request: HttpRequestData): Promise<ResponseData> => {
        return await makeHttpRequest(request);
    });

    ipcMain.handle(IpcCall.LoadRequestList, async () => {
        return await loadRequestList();
    });

    ipcMain.handle(IpcCall.SaveRequestList, async (_, requests: RequestData[]) => {
        await persistRequestList(requests);
    });

    ipcMain.handle(IpcCall.ImportDirectory, async () => {
        return await importDirectory();
    });

    ipcMain.handle(IpcCall.ExportDirectory, async (_, requests: RequestData[]) => {
        await exportDirectory(requests);
    });

    const window = new BrowserWindow({
        autoHideMenuBar: true,
        width: 1000,
        webPreferences: { nodeIntegration: true, contextIsolation: false },
    });

    window.loadFile("../../public/index.html");
});
