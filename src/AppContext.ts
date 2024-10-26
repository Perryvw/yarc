import { createContext } from "react";

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
    body: string;
}

export interface AppContextType {
    request: RequestData;
    response: ResponseData;

    setRequestHeader: (request: RequestData) => void;
    setRequest: (request: RequestData) => void;
    setResponse: (request: ResponseData) => void;
}
export const AppContext = createContext<AppContextType>(null!);
