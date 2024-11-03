import type { ProtoRoot } from "./grpc";
import type { RequestList } from "./request-types";

export enum IpcCall {
    PersistState = "persist-state",
    LoadPersistedState = "load-persisted-state",
    ImportDirectory = "import-directory",
    ExportDirectory = "export-directory",
    BrowseProtoDirectory = "browse-proto-directory",
    RefreshProtoDirectory = "refresh-proto-directory",

    HttpRequest = "http-request",
    GrpcRequest = "grpc-request",
}

export enum IpcEvent {
    WindowClosing = "window-closing",
}

export type IpcImportResult = { cancelled: true } | { cancelled: false; requests: RequestList };
export type BrowseProtoResult = { cancelled: true } | { cancelled: false; protoRoot: ProtoRoot };
