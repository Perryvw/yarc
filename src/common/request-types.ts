import type { KeyValue } from "./key-values";

export type HttpMethodVerb = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export type RequestId = string & { __requestIdBrand: never };

export interface HttpRequestData {
    type: "http";
    id: RequestId;
    name: string;
    url: string;
    method: HttpMethodVerb;
    params: KeyValue[];
    headers: KeyValue[];
    bodyForm: KeyValue[];
    body: string;
    lastExecute: number;
    isExecuting: boolean;
    history: HttpRequestData[];

    response?: HttpResponseData;
}

export enum GrpcRequestKind {
    Unary = 0,
    RequestStreaming = 1,
    ResponseStreaming = 2,
    Bidirectional = 3,
}

export interface GrpcRequestData {
    type: "grpc";
    id: RequestId;
    name: string;
    url: string;
    lastExecute: number;
    isExecuting: boolean;
    history: GrpcRequestData[];

    kind?: GrpcRequestKind;
    protoFile?: { protoPath: string; rootDir: string };
    rpc?: { service: string; method: string };

    body: string;

    response?: GrpcResponse;
}

export type RequestData = HttpRequestData | GrpcRequestData;

export interface RequestGroup {
    type: "group";
    id: RequestId;
    name: string;
    collapsed: boolean;
    requests: RequestDataOrGroup[];
}

export type RequestDataOrGroup = RequestData | RequestGroup;

export type RequestList = RequestDataOrGroup[];

export interface HttpResponseEvent {
    requestId: RequestId;
    response: HttpResponseData;
}

export interface HttpResponseData {
    statusCode: number;
    time: number;
    headers: Record<string, string | string[]>;
    body: string;
}

export type GrpcResponse = GrpcError | GrpcResponseData | GrpcServerStreamData;

export interface GrpcError {
    result: "error";
    code: string;
    detail: string;
    time: number;
}

export interface GrpcResponseData {
    result: "success";
    time: number;
    body: string;
}

export interface GrpcServerStreamData {
    result: "stream";
    streamOpen: boolean;
    responses: GrpcResponseData[];
    error?: GrpcError;
}
