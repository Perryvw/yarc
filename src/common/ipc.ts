import type { RequestList } from "./request-types";

export enum IpcCall {
    PersistState = "persist-state",
    LoadPersistedState = "load-persisted-state",
    ImportDirectory = "import-directory",
    ExportDirectory = "export-directory",

    HttpRequest = "http-request",
    GrpcRequest = "grpc-request",
}

export enum IpcEvent {
    WindowClosing = "window-closing",
}

export type IpcImportResult = { cancelled: true } | { cancelled: false; requests: RequestList };
