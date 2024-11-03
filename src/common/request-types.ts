export interface KeyValue {
    enabled: boolean;
    key: string;
    value: string;
}

export interface HttpRequestData {
    type: "http";
    id: string;
    name: string;
    url: string;
    params: KeyValue[];
    headers: KeyValue[];
    method: "GET" | "POST";
    body: string;

    response?: ResponseData;
}

export interface GrpcRequestData {
    type: "grpc";
    id: string;
    name: string;
    url: string;

    protoFile?: { protoPath: string; rootDir: string };
    rpc?: { service: string; method: string };

    response?: ResponseData;
}

export type RequestData = HttpRequestData | GrpcRequestData;

export type RequestList = RequestData[];

export interface ResponseData {
    statusCode: number;
    time: number;
    headers: Record<string, string | string[]>;
    body: string;
}
