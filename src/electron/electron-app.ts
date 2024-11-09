import { join } from "node:path";
import { BrowserWindow, app, ipcMain } from "electron";
import type { ProtoContent, ProtoRoot } from "../common/grpc";
import { type BrowseProtoResult, IpcCall, IpcEvent } from "../common/ipc";
import type { PersistedState } from "../common/persist-state";
import type {
    GrpcRequestData,
    GrpcResponse,
    HttpRequestData,
    HttpResponseData,
    RequestList,
} from "../common/request-types";
import { browseProtoRoot, findProtoFiles, makeGrpcRequest, parseProtoFile } from "./Communication/grpc";
import { makeHttpRequest } from "./Communication/http";
import { exportDirectory, importDirectory } from "./Storage/import-export";
import { getPersistedState, persistCurrentState } from "./Storage/persist";

app.whenReady().then(async () => {
    let persistedState = await getPersistedState();
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
    if (persistedState?.window.maximized) {
        window.maximize();
    }

    ipcMain.handle(IpcCall.HttpRequest, (_, request: HttpRequestData) => {
        return makeHttpRequest(request, window.webContents);
    });

    ipcMain.handle(IpcCall.GrpcRequest, async (_, request: GrpcRequestData): Promise<GrpcResponse> => {
        try {
            return await makeGrpcRequest(request, window.webContents);
        } catch (err: unknown) {
            return { result: "error", code: "EXCEPTION", detail: JSON.stringify(err), time: 0 };
        }
    });

    ipcMain.handle(IpcCall.LoadPersistedState, async () => {
        return persistedState;
    });

    ipcMain.handle(IpcCall.PersistState, async (_, state: PersistedState) => {
        persistedState = await persistCurrentState(state, window);

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

    ipcMain.handle(IpcCall.BrowseProtoDirectory, async (): Promise<BrowseProtoResult> => {
        return await browseProtoRoot();
    });

    ipcMain.handle(IpcCall.RefreshProtoDirectory, async (_, directory: string): Promise<ProtoRoot> => {
        return {
            rootPath: directory,
            protoFiles: await findProtoFiles(directory),
        };
    });

    ipcMain.handle(
        IpcCall.ReadProtoContent,
        async (_, protoPath: string, protoRootDir: string): Promise<ProtoContent> => {
            return await parseProtoFile(protoPath, protoRootDir);
        },
    );

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
