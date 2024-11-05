import * as fs from "node:fs/promises";
import * as path from "node:path";
import { dialog } from "electron";
import type { ProtoContent, ProtoService } from "../../common/grpc";
import type { BrowseProtoResult } from "../../common/ipc";
import * as proto from "@grpc/proto-loader";
import type { GrpcRequestData, GrpcResponse, HttpResponseData } from "../../common/request-types";
import * as grpc from "@grpc/grpc-js";

export async function makeGrpcRequest(request: GrpcRequestData): Promise<GrpcResponse> {
    if (!request.protoFile || !request.rpc) {
        throw "invalid request";
    }

    const GenericClient = grpc.makeGenericClientConstructor({}, "");
    const client = new GenericClient(request.url, grpc.credentials.createInsecure());

    const parsedProto = await parseProtoPackageDescription(request.protoFile.protoPath, request.protoFile.rootDir);
    const service = parsedProto[request.rpc.service];
    if (service && isServiceDefinition(service)) {
        const method = service[request.rpc.method];
        if (method) {
            return await grpcUnaryRequest(request, method, client);
        }
    }

    return Promise.reject("invalid request");
}

function grpcUnaryRequest(
    request: GrpcRequestData,
    method: proto.MethodDefinition<object, object, object, object>,
    client: grpc.Client,
): Promise<GrpcResponse> {
    return new Promise((resolve) => {
        const start = performance.now();
        client.makeUnaryRequest(
            method.path,
            method.requestSerialize,
            (r) => JSON.stringify(method.responseDeserialize(r)),
            JSON.parse(request.body),
            (err: grpc.ServiceError | null, value?: string) => {
                if (err) {
                    resolve({
                        success: false,
                        code: grpc.status[err.code],
                        detail: err.details,
                        time: performance.now() - start,
                    });
                } else {
                    resolve({
                        success: true,
                        body: value ?? "",
                        time: performance.now() - start,
                    });
                }
            },
        );
    });
}

export async function browseProtoRoot(): Promise<BrowseProtoResult> {
    const result = await dialog.showOpenDialog({
        properties: ["openDirectory"],
    });

    if (result.canceled) {
        return { cancelled: true };
    }

    return {
        cancelled: false,
        protoRoot: { rootPath: result.filePaths[0], protoFiles: await findProtoFiles(result.filePaths[0]) },
    };
}

export async function findProtoFiles(protoRoot: string): Promise<string[]> {
    const result: string[] = [];
    async function findInDir(directory: string) {
        for (const f of await fs.readdir(directory)) {
            const p = path.join(directory, f);
            const stat = await fs.stat(p);
            if (stat.isDirectory()) {
                await findInDir(p);
            } else {
                if (f.endsWith(".proto")) {
                    result.push(p);
                }
            }
        }
    }

    await findInDir(protoRoot);

    return result;
}

export async function parseProtoFile(protoPath: string, protoRootDir: string): Promise<ProtoContent> {
    const contents = parseProtoPackageDescription(protoPath, protoRootDir);

    const services = [];
    for (const [serviceName, serviceDescription] of Object.entries(contents)) {
        if (isServiceDefinition(serviceDescription)) {
            const service: ProtoService = {
                name: serviceName,
                methods: [],
            };
            for (const [methodName, methodDescription] of Object.entries(serviceDescription)) {
                service.methods.push({
                    name: methodName,
                    path: methodDescription.path,
                    requestStream: methodDescription.requestStream,
                    serverStream: methodDescription.responseStream,
                });
            }
            services.push(service);
        }
    }

    return { services };
}

function parseProtoPackageDescription(protoPath: string, protoRootDir: string): Promise<proto.PackageDefinition> {
    return proto.load(protoPath, { includeDirs: [protoRootDir] });
}

function isServiceDefinition(desc: proto.AnyDefinition): desc is proto.ServiceDefinition {
    return !isMessageTypeDefinition(desc) && !isEnumTypeDefinition(desc);
}

function isMessageTypeDefinition(desc: proto.AnyDefinition): desc is proto.MessageTypeDefinition {
    return desc.format === "Protocol Buffer 3 DescriptorProto";
}

function isEnumTypeDefinition(desc: proto.AnyDefinition): desc is proto.EnumTypeDefinition {
    return desc.format === "Protocol Buffer 3 EnumDescriptorProto";
}
