import * as path from "node:path";
import type * as grpc from "@grpc/grpc-js";
import * as proto from "@grpc/proto-loader";
import * as protobufjs from "protobufjs";
import type * as protobuf_descriptor from "protobufjs/ext/descriptor";
import type { ServerReflectionRequest } from "@grpc/reflection/build/src/generated/grpc/reflection/v1/ServerReflectionRequest";
import type { ServerReflectionResponse } from "@grpc/reflection/build/src/generated/grpc/reflection/v1/ServerReflectionResponse";
import type { FileDescriptorResponse } from "@grpc/reflection/build/src/generated/grpc/reflection/v1/FileDescriptorResponse";
import type { ServiceResponse } from "@grpc/reflection/build/src/generated/grpc/reflection/v1/ServiceResponse";
import type { ProtoRoot, ProtoService } from "../../common/grpc";

let FileDescriptorProto: protobufjs.Type = undefined!;
async function loadPrerequisites(): Promise<void> {
    if (!FileDescriptorProto) {
        // parse the descriptor proto to decode the reflection messages
        const root = await protobufjs.load(path.join("node_modules/protobufjs", "google/protobuf/descriptor.proto"));
        FileDescriptorProto = root.lookupType("google.protobuf.FileDescriptorProto");
    }
}

export class GrpcReflectionHandler {
    private pendingRequests = 0;
    private stream: grpc.ClientDuplexStream<ServerReflectionRequest, ServerReflectionResponse> = undefined!;
    private services: protobuf_descriptor.IServiceDescriptorProto[] = [];
    private knownTypes = new Map<
        string,
        protobuf_descriptor.IDescriptorProto | protobuf_descriptor.IEnumDescriptorProto
    >();

    private constructor(private client: grpc.Client) {
        this.client = client;
    }

    static async fetchServicesFromServer(client: grpc.Client): Promise<Result<ProtoService[], string>> {
        const handler = new GrpcReflectionHandler(client);
        await loadPrerequisites();
        return await handler.fetchServices();
    }

    async fetchServices(): Promise<Result<ProtoService[], string>> {
        return new Promise((resolve) => {
            this.stream = this.client.makeBidiStreamRequest(
                "grpc.reflection.v1.ServerReflection/ServerReflectionInfo",
                (arg) => Buffer.from(JSON.stringify(arg)),
                (buffer) => JSON.parse(buffer.toString()),
            );

            // Request a list of all the services
            this.requestServiceList();

            this.stream.on("data", async (response: ServerReflectionResponse) => {
                if (response?.listServicesResponse?.service) {
                    this.handleListServicesResponse(response.listServicesResponse.service);
                } else if (response?.fileDescriptorResponse) {
                    this.handleFileDescriptorResponse(response.fileDescriptorResponse);
                }

                this.pendingRequests--;
                if (this.pendingRequests === 0) {
                    this.stream.end();
                }
            });

            this.stream.on("error", (err) => {
                resolve({ success: false, error: err.message });
            });

            this.stream.on("end", () => {
                // Map the reflection info to the info we need
                resolve({ success: true, value: mapServices(this.services) });
            });
        });
    }

    handleListServicesResponse(services: ServiceResponse[]): void {
        // Request the type of all the received services
        for (const service of services) {
            this.requestType(service.name!);
        }
    }

    handleFileDescriptorResponse(response: FileDescriptorResponse): void {
        const fileDescBytes = response.fileDescriptorProto?.[0] as Buffer;
        // Use protobufjs to decode the descriptor bytes
        const fileDesc = FileDescriptorProto.decode(fileDescBytes) as protobuf_descriptor.IFileDescriptorProto;

        // First read all message and types from this file so we don't re-request them later
        if (fileDesc.enumType) {
            for (const enumType of fileDesc.enumType) {
                this.knownTypes.set(enumType.name!, enumType);
            }
        }
        if (fileDesc.messageType) {
            for (const msg of fileDesc.messageType) {
                this.knownTypes.set(msg.name!, msg);
                if (msg.enumType) {
                    // Request any referenced enums we don't know yet
                    for (const enumType of msg.enumType) {
                        if (!this.knownTypes.has(enumType.name!)) {
                            this.requestType(enumType.name!);
                        }
                    }
                }
                if (msg.nestedType) {
                    // Request any nested types we don't know yet
                    for (const nestedType of msg.nestedType) {
                        if (!this.knownTypes.has(nestedType.name!)) {
                            this.requestType(nestedType.name!);
                        }
                    }
                }
            }
        }
        // Then read all the services and see which types we need to request as follow-up
        if (fileDesc?.service) {
            for (const svc of fileDesc.service) {
                this.services.push(svc);
                for (const method of svc.method ?? []) {
                    if (method.inputType && !this.knownTypes.has(method.inputType)) {
                        // Request the file containing this unknown type
                        this.requestType(method.inputType);
                    }
                    if (method.outputType && !this.knownTypes.has(method.outputType)) {
                        // Request the file containing this unknown type
                        this.requestType(method.outputType);
                    }
                }
            }
        }
    }

    requestServiceList(): void {
        this.stream.write({
            listServices: "",
        });
        this.pendingRequests++;
    }

    requestType(typeName: string): void {
        this.stream.write({
            fileContainingSymbol: typeName,
        });
        this.pendingRequests++;
    }
}

function mapServices(services: protobuf_descriptor.IServiceDescriptorProto[]): ProtoService[] {
    // TODO
    return [];
}
