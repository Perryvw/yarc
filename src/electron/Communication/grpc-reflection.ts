import * as path from "node:path";
import type * as grpc from "@grpc/grpc-js";
import * as proto from "@grpc/proto-loader";
import * as protobufjs from "protobufjs";
import type * as protobuf_descriptor from "protobufjs/ext/descriptor";
import type { ServerReflectionRequest } from "@grpc/reflection/build/src/generated/grpc/reflection/v1/ServerReflectionRequest";
import type { ServerReflectionResponse } from "@grpc/reflection/build/src/generated/grpc/reflection/v1/ServerReflectionResponse";
import type { FileDescriptorResponse } from "@grpc/reflection/build/src/generated/grpc/reflection/v1/FileDescriptorResponse";
import type { ServiceResponse } from "@grpc/reflection/build/src/generated/grpc/reflection/v1/ServiceResponse";
import type { ProtoService } from "../../common/grpc";

let ReflectionService: proto.ServiceDefinition = undefined!;
let FileDescriptorProto: protobufjs.Type = undefined!;
async function loadPrerequisites(): Promise<void> {
    if (!ReflectionService) {
        // Parse the reflection proto to call the service
        const parsedProto = await proto.load("reflection.proto", {
            includeDirs: ["node_modules/@grpc/reflection/build/proto/grpc/reflection/v1"],
        });
        ReflectionService = parsedProto["grpc.reflection.v1.ServerReflection"] as proto.ServiceDefinition;

        // parse the descriptor proto to decode the reflection messages
        const root = await protobufjs.load(path.join("node_modules/protobufjs", "google/protobuf/descriptor.proto"));
        FileDescriptorProto = root.lookupType("google.protobuf.FileDescriptorProto");
    }
}

export class GrpcReflectionHandler {
    private pendingRequests = 0;
    private stream: grpc.ClientDuplexStream<ServerReflectionRequest, ServerReflectionResponse> = undefined!;
    private services: protobuf_descriptor.IServiceDescriptorProto[] = [];
    private knownTypes = new Map<string, protobuf_descriptor.IDescriptorProto>();
    private knownEnums = new Map<string, protobuf_descriptor.IEnumDescriptorProto>();

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
            const method = ReflectionService.ServerReflectionInfo;
            this.stream = this.client.makeBidiStreamRequest(
                method.path,
                method.requestSerialize,
                method.responseDeserialize,
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
                resolve({ success: true, value: this.mapServices() });
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
                // Save both the local and globally specified name
                this.knownEnums.set(enumType.name!, enumType);
                this.knownEnums.set(`.${fileDesc.package}.${enumType.name}`, enumType);
            }
        }
        if (fileDesc.messageType) {
            for (const msg of fileDesc.messageType) {
                // Save both the local name and globally specified name
                this.knownTypes.set(msg.name!, msg);
                this.knownTypes.set(`.${fileDesc.package}.${msg.name}`, msg);
                if (msg.enumType) {
                    // Also save the nested enums
                    for (const enumType of msg.enumType) {
                        this.knownEnums.set(enumType.name!, enumType);
                    }
                }
                if (msg.nestedType) {
                    // Also save nested messages
                    for (const nestedType of msg.nestedType) {
                        this.knownTypes.set(nestedType.name!, nestedType);
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

    mapServices(): ProtoService[] {
        return this.services.map((svc) => ({
            name: svc.name!,
            methods: (svc.method ?? []).map((method) => ({
                name: method.name!,
                requestStream: method.clientStreaming ?? false,
                serverStream: method.serverStreaming ?? false,
                requestType: this.mapMessageType(method.inputType!),
                responseType: this.mapMessageType(method.outputType!),
            })),
        }));
    }

    mapMessageType(typeName: string): ProtoMessageDescriptor {
        const type = this.knownTypes.get(typeName);
        if (!type) {
            throw `unknown type ${typeName}`;
        }

        const fields: ProtoMessageDescriptor["fields"] = {};
        for (const field of type.field ?? []) {
            fields[field.name!] = this.mapMessageField(field);
        }

        return {
            type: "message",
            name: type.name!,
            fields,
        };
    }

    mapMessageField(field: protobuf_descriptor.IFieldDescriptorProto): ProtoObject {
        /**
         * Types declared in protobufjs\ext\descriptor\index.js
         */
        if (field.type === 11 /* TYPE_MESSAGE */) {
            return this.mapMessageType(field.typeName!);
        }
        if (field.type === 14 /* TYPE_ENUM */) {
            const enumType = this.knownEnums.get(field.typeName!);
            if (!enumType) {
                throw `Unknown enum type ${field.typeName}`;
            }
            return {
                type: "enum",
                name: field.typeName!,
                values:
                    enumType.value?.map((v) => ({
                        name: v.name!,
                        value: 0,
                    })) ?? [],
            };
        }
        return {
            type: "literal",
            literalType: mapLiteralType(field.type!),
        };
    }
}

function mapLiteralType(type: protobuf_descriptor.IFieldDescriptorProtoType): string {
    /**
     * Types declared in protobufjs\ext\descriptor\index.js
     */
    switch (type) {
        case 1:
            return "DOUBLE";
        case 2:
            return "FLOAT";
        case 3:
            return "INT64";
        case 4:
            return "UINT64";
        case 5:
            return "INT32";
        case 6:
            return "FIXED64";
        case 7:
            return "FIXED32";
        case 8:
            return "BOOL";
        case 9:
            return "string";
        case 12:
            return "BYTES";
        case 13:
            return "UINT32";
        case 15:
            return "SFIXED32";
        case 16:
            return "SFIXED64";
        case 17:
            return "SINT32";
        case 18:
            return "SINT64";
        default:
            throw `Unknown literal type: ${type}`;
    }
}
