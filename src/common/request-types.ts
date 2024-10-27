export interface HttpRequestData {
    type: "http";
    name: string;
    url: string;
    method: "GET" | "POST";
    body: string;
}

export interface GrpcRequestData {
    type: "grpc";
    name: string;
    url: string;
}

export type RequestData = HttpRequestData | GrpcRequestData;

export interface ResponseData {
    statusCode: number;
    headers: Record<string, string | string[]>;
    body: string;
}
