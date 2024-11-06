export interface KeyValue {
    enabled: boolean;
    key: string;
    value: string;
}

export type HttpMethodVerb = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export interface HttpRequestData {
    type: "http";
    id: string;
    name: string;
    url: string;
    method: HttpMethodVerb;
    params: KeyValue[];
    headers: KeyValue[];
    bodyForm: KeyValue[];
    body: string;
    lastExecute: number;
    history: HttpRequestData[];

    response?: HttpResponseData;
}

export interface GrpcRequestData {
    type: "grpc";
    id: string;
    name: string;
    url: string;
    lastExecute: number;
    history: GrpcRequestData[];

    protoFile?: { protoPath: string; rootDir: string };
    rpc?: { service: string; method: string };

    body: string;

    response?: GrpcResponse;
}

export type RequestData = HttpRequestData | GrpcRequestData;

export type RequestList = RequestData[];

export interface HttpResponseData {
    statusCode: number;
    time: number;
    headers: Record<string, string | string[]>;
    body: string;
}

export type GrpcResponse = GrpcError | GrpcResponseData;

export interface GrpcError {
    success: false;
    code: string;
    detail: string;
    time: number;
}

export interface GrpcResponseData {
    success: true;
    time: number;
    body: string;
}
