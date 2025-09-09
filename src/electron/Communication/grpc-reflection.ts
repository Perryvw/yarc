import type * as grpc from "@grpc/grpc-js";
import { Status as GrpcStatus } from "@grpc/grpc-js/build/src/constants";
import * as proto from "@grpc/proto-loader";
import type { FileDescriptorResponse } from "@grpc/reflection/build/src/generated/grpc/reflection/v1/FileDescriptorResponse";
import type { ServerReflectionRequest } from "@grpc/reflection/build/src/generated/grpc/reflection/v1/ServerReflectionRequest";
import type { ServerReflectionResponse } from "@grpc/reflection/build/src/generated/grpc/reflection/v1/ServerReflectionResponse";
import type { ServiceResponse } from "@grpc/reflection/build/src/generated/grpc/reflection/v1/ServiceResponse";
import * as protobufjs from "protobufjs";
import type * as protobuf_descriptor from "protobufjs/ext/descriptor";
import type { MethodInfo, ProtoService } from "../../common/grpc";

import reflectionV1ProtoPath from "../../../node_modules/@grpc/reflection/build/proto/grpc/reflection/v1/reflection.proto?asset";
import reflectionV1AlphaProtoPath from "../../../node_modules/@grpc/reflection/build/proto/grpc/reflection/v1alpha/reflection.proto?asset";
import descriptorProtoPath from "../../../node_modules/protobufjs/google/protobuf/descriptor.proto?asset";

let ReflectionServiceV1: proto.ServiceDefinition = undefined!;
let ReflectionServiceV1Alpha: proto.ServiceDefinition = undefined!;
let FileDescriptorProto: protobufjs.Type = undefined!;
async function loadPrerequisites(): Promise<void> {
    if (!ReflectionServiceV1) {
        // Parse the reflection proto to call the service
        const parsedProtoV1 = await proto.load(reflectionV1ProtoPath);
        ReflectionServiceV1 = parsedProtoV1["grpc.reflection.v1.ServerReflection"] as proto.ServiceDefinition;
        const parsedProtoV1Alpha = await proto.load(reflectionV1AlphaProtoPath);
        ReflectionServiceV1Alpha = parsedProtoV1Alpha[
            "grpc.reflection.v1alpha.ServerReflection"
        ] as proto.ServiceDefinition;

        // parse the descriptor proto to decode the reflection messages
        const root = await protobufjs.load(descriptorProtoPath);
        FileDescriptorProto = root.lookupType("google.protobuf.FileDescriptorProto");
    }
}

const reflectionCache = new Map<string, MethodInfo>();

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
        reflectionCache.clear();
        return await handler.fetchServicesWithV1();
    }

    static async getMethodInfo(client: grpc.Client, service: string, method: string): Promise<MethodInfo> {
        const methodPath = methodKey(service, method);
        let methodInfo = reflectionCache.get(methodPath);
        if (methodInfo) return methodInfo;

        // Method not found in cache, re-execute the reflection call to make sure cache is up to date
        await GrpcReflectionHandler.fetchServicesFromServer(client);

        methodInfo = reflectionCache.get(methodPath);
        if (methodInfo === undefined) {
            throw `Failed to find method info for ${methodPath} through reflection`;
        }
        return methodInfo;
    }

    async fetchServicesWithV1(): Promise<Result<ProtoService[], string>> {
        return new Promise((resolve, reject) => {
            const method = ReflectionServiceV1.ServerReflectionInfo;
            this.stream = this.client.makeBidiStreamRequest(
                method.path,
                method.requestSerialize,
                method.responseDeserialize,
            );

            // Request a list of all the services
            this.requestServiceList();

            this.stream.on("data", async (response: ServerReflectionResponse) => {
                try {
                    if (response?.listServicesResponse?.service) {
                        this.handleListServicesResponse(response.listServicesResponse.service);
                    } else if (response?.fileDescriptorResponse) {
                        this.handleFileDescriptorResponse(response.fileDescriptorResponse);
                    }

                    this.pendingRequests--;
                    if (this.pendingRequests === 0) {
                        this.stream.end();
                    }
                } catch (err) {
                    console.log("error in v1 data handler", err);
                }
            });

            let fellBackToV1Alpha = false;

            this.stream.on("error", (err) => {
                try {
                    if ("code" in err && err.code === GrpcStatus.UNIMPLEMENTED) {
                        // Fall back on v1 alpha
                        console.log("Falling back on v1alpha reflection protocol");
                        this.fetchServicesWithV1Alpha().then(resolve).catch(reject);
                        fellBackToV1Alpha = true;
                    } else {
                        resolve({ success: false, error: err.message });
                    }
                } catch (err) {
                    console.log("error in v1 error handler", err);
                }
            });

            this.stream.on("end", () => {
                try {
                    if (!fellBackToV1Alpha) {
                        // Map the reflection info to the info we need
                        resolve({ success: true, value: this.mapServices() });
                    }
                } catch (err) {
                    console.log("error in v1 end handler", err);
                }
            });
        });
    }

    async fetchServicesWithV1Alpha(): Promise<Result<ProtoService[], string>> {
        return new Promise((resolve, reject) => {
            try {
                const method = ReflectionServiceV1Alpha.ServerReflectionInfo;
                console.log("v1alpha reflection method", method);
                this.stream = this.client.makeBidiStreamRequest(
                    method.path,
                    method.requestSerialize,
                    method.responseDeserialize,
                );
                this.pendingRequests = 0;

                console.log("requesting service list");

                // Request a list of all the services
                this.requestServiceList();

                this.stream.on("data", async (response: ServerReflectionResponse) => {
                    try {
                        console.log("v1alpha data");
                        if (response?.listServicesResponse?.service) {
                            this.handleListServicesResponse(response.listServicesResponse.service);
                        } else if (response?.fileDescriptorResponse) {
                            this.handleFileDescriptorResponse(response.fileDescriptorResponse);
                        }

                        this.pendingRequests--;
                        if (this.pendingRequests === 0) {
                            this.stream.end();
                        }
                        console.log("v1alpha data handled");
                    } catch (err) {
                        console.log("error in v1alpha data handler", err);
                    }
                });

                this.stream.on("error", (err) => {
                    console.log("v1alpha stream error", err);
                    resolve({ success: false, error: err.message });
                });

                this.stream.on("end", () => {
                    console.log("v1alpha end");
                    try {
                        // Map the reflection info to the info we need
                        resolve({ success: true, value: this.mapServices() });
                    } catch (err) {
                        console.log("error in v1alpha end handler", err);
                    }
                });
            } catch (err) {
                console.log("error fetching with v1alpha", err);
                reject(err);
            }
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
                svc.name = `${fileDesc.package}.${svc.name}`;
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
        const services = this.services.map((svc) => ({
            name: svc.name!,
            methods: (svc.method ?? []).map((method) => ({
                name: method.name!,
                requestStream: method.clientStreaming ?? false,
                serverStream: method.serverStreaming ?? false,
                requestType: this.mapMessageType(method.inputType!),
                responseType: this.mapMessageType(method.outputType!),
            })),
        }));

        for (const svc of services) {
            for (const method of svc.methods) {
                reflectionCache.set(methodKey(svc.name, method.name), method);
            }
        }

        return services;
    }

    mapMessageType(typeName: string): ProtoMessageDescriptor {
        const type = this.knownTypes.get(typeName);
        if (!type) {
            throw `unknown type ${typeName}`;
        }

        const fields: ProtoMessageDescriptor["fields"] = {};
        const oneOfs = new Map<number, ProtoField[]>();
        for (const field of type.field ?? []) {
            let innerType = this.mapMessageField(field);
            const inOneOf = Object.hasOwn(field, "oneofIndex");
            if (field.label === ProtoFieldLabel.LABEL_OPTIONAL && !inOneOf) {
                innerType = { type: "optional", optionalType: innerType };
            }
            if (field.label === ProtoFieldLabel.LABEL_REPEATED) {
                innerType = { type: "repeated", repeatedType: innerType };
            }

            if (inOneOf && field.oneofIndex !== undefined) {
                if (!oneOfs.has(field.oneofIndex)) {
                    oneOfs.set(field.oneofIndex, []);
                }
                oneOfs.get(field.oneofIndex)!.push({
                    id: field.number!,
                    name: field.name!,
                    type: innerType,
                });
            } else {
                fields[field.name!] = {
                    id: field.number!,
                    name: field.name!,
                    type: innerType,
                };
            }
        }

        let oneOfId = 0;
        for (const oneof of type.oneofDecl ?? []) {
            const oneOfFields: ProtoOneOf["fields"] = {};
            const oneOfValues = oneOfs.get(oneOfId) ?? [];

            // If only one value, assume optional:
            if (oneOfValues.length === 1) {
                const value = oneOfValues[0];
                fields[value.name] = {
                    id: value.id,
                    name: value.name,
                    type: {
                        type: "optional",
                        optionalType: value.type,
                    },
                };
            } else {
                for (const field of oneOfValues) {
                    oneOfFields[field.name] = field;
                }
                fields[oneof.name!] = {
                    id: -1,
                    name: oneof.name!,
                    type: {
                        type: "oneof",
                        fields: oneOfFields,
                    },
                };
            }
            oneOfId++;
        }

        return {
            type: "message",
            name: type.name!,
            fields,
        };
    }

    mapMessageField(field: protobuf_descriptor.IFieldDescriptorProto): ProtoObject {
        if (field.type === ProtoFieldType.TYPE_MESSAGE) {
            return this.mapMessageType(field.typeName!);
        }
        if (field.type === ProtoFieldType.TYPE_ENUM) {
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

function methodKey(service: string, method: string): string {
    return `${service}/${method}`;
}

/**
 * Enum values declared in protobufjs\ext\descriptor\index.js
 */
enum ProtoFieldLabel {
    LABEL_OPTIONAL = 1,
    LABEL_REQUIRED = 2,
    LABEL_REPEATED = 3,
}
enum ProtoFieldType {
    TYPE_DOUBLE = 1,
    TYPE_FLOAT = 2,
    TYPE_INT64 = 3,
    TYPE_UINT64 = 4,
    TYPE_INT32 = 5,
    TYPE_FIXED64 = 6,
    TYPE_FIXED32 = 7,
    TYPE_BOOL = 8,
    TYPE_STRING = 9,
    TYPE_GROUP = 10,
    TYPE_MESSAGE = 11,
    TYPE_BYTES = 12,
    TYPE_UINT32 = 13,
    TYPE_ENUM = 14,
    TYPE_SFIXED32 = 15,
    TYPE_SFIXED64 = 16,
    TYPE_SINT32 = 17,
    TYPE_SINT64 = 18,
}

function mapLiteralType(type: protobuf_descriptor.IFieldDescriptorProtoType): string {
    switch (type) {
        case ProtoFieldType.TYPE_STRING:
            return "string";
        default:
            return ProtoFieldType[type].split("_")[1].toLowerCase();
    }
}
