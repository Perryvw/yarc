import type { ProtoRoot } from "./grpc";
import type { RequestList } from "./request-types";

export enum IpcCall {
    PersistState = "persist-state",
    LoadPersistedState = "load-persisted-state",
    ImportDirectory = "import-directory",
    ExportDirectory = "export-directory",
    BrowseProtoDirectory = "browse-proto-directory",
    RefreshProtoDirectory = "refresh-proto-directory",
    ReadProtoContent = "read-proto-content",

    HttpRequest = "http-request",
    GrpcRequest = "grpc-request",
}

export enum IpcEvent {
    WindowClosing = "window-closing",

    GrpcServerStreamData = "grpc-server-stream-data",
    GrpcServerStreamEnded = "grpc-server-stream-ended",
    GrpcServerStreamError = "grpc-server-stream-error",
}

export type IpcImportResult = { cancelled: true } | { cancelled: false; requests: RequestList };
export type BrowseProtoResult = { cancelled: true } | { cancelled: false; protoRoot: ProtoRoot };
