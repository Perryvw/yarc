import type { GrpcResponseData } from "./request-types";

export interface ProtoRoot {
    rootPath: string;
    protoFiles: string[];
}

export interface ProtoFileDescriptor {
    protoPath: string;
    rootPath: string;
}

export interface ProtoContent {
    services: ProtoService[];
}

export interface ProtoService {
    name: string;
    methods: MethodInfo[];
}

export interface MethodInfo {
    name: string;
    path: string;
    requestStream: boolean;
    serverStream: boolean;
}

export interface GrpcStreamClosedEvent {
    requestId: string;
}

export interface GrpcServerStreamDataEvent {
    requestId: string;
    response: GrpcResponseData;
}

export interface GrpcServerStreamErrorEvent {
    requestId: string;
    code?: string;
    detail?: string;
}
