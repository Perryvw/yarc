export enum IpcCall {
    LoadRequestList = "load-request-list",
    SaveRequestList = "save-request-list",
    ImportDirectory = "import-directory",
    ExportDirectory = "export-directory",

    HttpRequest = "http-request",
    GrpcRequest = "grpc-request"
}