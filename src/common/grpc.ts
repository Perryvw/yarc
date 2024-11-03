export interface ProtoRoot {
    rootPath: string;
    protoFiles: string[];
}

export interface ProtoContent {
    services: ProtoService[];
}

export interface ProtoService {
    name: string;
    method: string[];
}
