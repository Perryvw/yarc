import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as grpc from "@grpc/grpc-js";
import * as proto from "@grpc/proto-loader";
import * as protobufjs from "protobufjs";
import type * as protobuf_descriptor from "protobufjs/ext/descriptor";
import { dialog } from "electron";
import JSON5 from "json5";
import type {
    GrpcServerStreamDataEvent,
    GrpcServerStreamErrorEvent,
    GrpcStreamClosedEvent,
    ProtoService,
} from "../../common/grpc";
import { type BrowseProtoResult, IpcEvent } from "../../common/ipc";
import type { GrpcRequestData, GrpcResponse, GrpcServerStreamData, RequestId } from "../../common/request-types";
import { GrpcReflectionHandler } from "./grpc-reflection";

const RequestCancelHandles: Partial<Record<RequestId, () => void>> = {};

export async function makeGrpcRequest(request: GrpcRequestData, ipc: Electron.WebContents): Promise<GrpcResponse> {
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
            if (!method.requestStream && !method.responseStream) {
                return await grpcUnaryRequest(request, method, client);
            }

            if (!method.requestStream && method.responseStream) {
                return await grpcServerStreamingRequest(request, method, client, ipc);
            }

            return { result: "error", code: "INVALID", detail: "Request streaming is not (yet) supported", time: 0 };
        }
    }

    return { result: "error", code: "INVALID", detail: "Invalid request", time: 0 };
}

export async function getMethodsViaReflection(serverUrl: string): Promise<Result<ProtoService[], string>> {
    const GenericClient = grpc.makeGenericClientConstructor({}, "");
    const client = new GenericClient(serverUrl, grpc.credentials.createInsecure());

    // This protocol is so complicated it was moved to its own file
    return GrpcReflectionHandler.fetchServicesFromServer(client);
}

function grpcUnaryRequest(
    request: GrpcRequestData,
    method: proto.MethodDefinition<object, object, object, object>,
    client: grpc.Client,
): Promise<GrpcResponse> {
    return new Promise((resolve) => {
        const start = performance.now();
        const call = client.makeUnaryRequest(
            method.path,
            method.requestSerialize,
            (r) => JSON.stringify(method.responseDeserialize(r), null, 2),
            parseRequestBody(request.body),
            (err: grpc.ServiceError | null, value?: string) => {
                delete RequestCancelHandles[request.id];

                if (err) {
                    resolve({
                        result: "error",
                        code: grpc.status[err.code],
                        detail: err.details,
                        time: performance.now() - start,
                        metadata: err.metadata.getMap(),
                    });
                } else {
                    resolve({
                        result: "success",
                        body: value ?? "",
                        time: performance.now() - start,
                    });
                }
            },
        );

        RequestCancelHandles[request.id] = () => {
            call.cancel();
            delete RequestCancelHandles[request.id];
        };
    });
}

async function grpcServerStreamingRequest(
    request: GrpcRequestData,
    method: proto.MethodDefinition<object, object, object, object>,
    client: grpc.Client,
    ipc: Electron.WebContents,
): Promise<GrpcServerStreamData> {
    const stream = client.makeServerStreamRequest(
        method.path,
        method.requestSerialize,
        method.responseDeserialize,
        parseRequestBody(request.body),
    );

    RequestCancelHandles[request.id] = () => {
        stream.cancel();
        delete RequestCancelHandles[request.id];
    };

    stream.on("data", (data) => {
        const eventData: GrpcServerStreamDataEvent = {
            requestId: request.id,
            response: {
                result: "success",
                body: JSON.stringify(data, null, 2),
                time: Date.now(),
            },
        };
        ipc.send(IpcEvent.GrpcServerStreamData, eventData);
    });

    stream.on("end", () => {
        const eventData: GrpcStreamClosedEvent = {
            requestId: request.id,
        };
        delete RequestCancelHandles[request.id];
        ipc.send(IpcEvent.GrpcServerStreamEnded, eventData);
    });

    stream.on("error", (err: grpc.ServerErrorResponse) => {
        const eventData: GrpcServerStreamErrorEvent = {
            requestId: request.id,
            code: err.code !== undefined ? grpc.status[err.code] : undefined,
            detail: err.details,
        };
        ipc.send(IpcEvent.GrpcServerStreamError, eventData);
    });

    return { result: "stream", streamOpen: true, responses: [] };
}

export function cancelGrpcRequest(id: RequestId) {
    if (RequestCancelHandles[id]) {
        RequestCancelHandles[id]();
    }
}

function parseRequestBody(body: string): object {
    return JSON5.parse(body);
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
        result: { rootPath: result.filePaths[0], protoFiles: await findProtoFiles(result.filePaths[0]) },
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
                    result.push(path.relative(protoRoot, p));
                }
            }
        }
    }

    await findInDir(protoRoot);

    return result;
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
