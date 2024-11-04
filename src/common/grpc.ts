export interface ProtoRoot {
    rootPath: string;
    protoFiles: string[];
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
}
