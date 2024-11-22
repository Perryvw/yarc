import type { GrpcResponseData, RequestId } from "./request-types";

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
    requestStream: boolean;
    serverStream: boolean;
    requestType?: ProtoMessageDescriptor;
    responseType?: ProtoMessageDescriptor;
}

export interface GrpcStreamClosedEvent {
    requestId: RequestId;
}

export interface GrpcServerStreamDataEvent {
    requestId: RequestId;
    response: GrpcResponseData;
}

export interface GrpcServerStreamErrorEvent {
    requestId: RequestId;
    code?: string;
    detail?: string;
}
