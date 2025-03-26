import { join } from "node:path";
import { BrowserWindow, app, ipcMain, nativeTheme } from "electron";
import type { ProtoContent, ProtoRoot } from "../common/grpc";
import { type BrowseProtoResult, IpcCall, IpcEvent } from "../common/ipc";
import type { PersistedState } from "../common/persist-state";
import type {
    GrpcRequestData,
    GrpcResponse,
    HttpRequestData,
    HttpResponseData,
    RequestId,
    RequestList,
} from "../common/request-types";
import { browseProtoRoot, cancelGrpcRequest, findProtoFiles, makeGrpcRequest } from "./Communication/grpc";
import { cancelHttpRequest, makeHttpRequest } from "./Communication/http";
import { parseProtoFile } from "./Communication/proto";
import { exportDirectory, importDirectory } from "./Storage/import-export";
import { getPersistedState, persistCurrentState } from "./Storage/persist";
import { backgroundColor } from "../renderer/src/palette";

nativeTheme.themeSource = "dark";

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
        width: persistedState?.window.size[0] ?? 1280,
        height: persistedState?.window.size[1] ?? 720,
        backgroundColor: backgroundColor,
        darkTheme: true,
        show: false,
    });
    if (persistedState?.window.maximized) {
        window.maximize();
    }

    window.once("ready-to-show", () => {
        window.show();
    });

    // Do not let dragged links onto the app to open new window
    window.webContents.setWindowOpenHandler(() => {
        return { action: "deny" };
    });

    ipcMain.handle(IpcCall.SetTitle, (_, title: string) => {
        window.setTitle(title);
    });

    ipcMain.handle(IpcCall.HttpRequest, (_, request: HttpRequestData) => {
        return makeHttpRequest(request, window.webContents);
    });

    ipcMain.handle(IpcCall.GrpcRequest, async (_, request: GrpcRequestData): Promise<GrpcResponse> => {
        try {
            return await makeGrpcRequest(request, window.webContents);
            // biome-ignore lint/suspicious/noExplicitAny:
        } catch (err: any) {
            return { result: "error", code: "EXCEPTION", detail: err.toString(), time: 0 };
        }
    });

    ipcMain.handle(IpcCall.AbortRequest, (_, requestType: "http" | "grpc", requestId: RequestId) => {
        if (requestType === "http") {
            cancelHttpRequest(requestId);
        } else if (requestType === "grpc") {
            cancelGrpcRequest(requestId);
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
        async (_, protoPath: string, protoRootDir: string): Promise<Result<ProtoContent, string>> => {
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
