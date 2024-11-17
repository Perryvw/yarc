import * as path from "node:path";
import * as protobufjs from "../../../node_modules/protobufjs";
import type { ProtoContent, ProtoService } from "../../common/grpc";

export async function parseProtoFile(protoPath: string, protoRootDir: string): Promise<Result<ProtoContent, string>> {
    try {
        // Override path resolution algorithm to resolve from protoRootDir
        const root = new protobufjs.Root();
        root.resolvePath = (_, target) => {
            if (path.isAbsolute(target)) return target;
            return path.join(protoRootDir, target);
        };
        const protoContent = protobufjs.loadSync(path.join(protoRootDir, protoPath), root);

        protoContent.resolveAll();

        const result: ProtoContent = { services: [] };

        for (const service of iterateServices(protoContent)) {
            const s: ProtoService = {
                name: fullyQualifiedName(service),
                methods: [],
            };
            result.services.push(s);

            for (const method of service.methodsArray) {
                s.methods.push({
                    name: method.name,
                    requestStream: method.requestStream ?? false,
                    serverStream: method.responseStream ?? false,
                    requestType: method.resolvedRequestType
                        ? (mapType(method.resolvedRequestType) as ProtoMessageDescriptor)
                        : undefined,
                    responseType: method.resolvedResponseType
                        ? (mapType(method.resolvedResponseType) as ProtoMessageDescriptor)
                        : undefined,
                });
            }
        }

        return { success: true, value: result };
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    } catch (e: any) {
        return { success: false, error: e.toString() };
    }
}

function* iterateServices(parent: protobufjs.Namespace): Generator<protobufjs.Service> {
    for (const child of parent.nestedArray) {
        if (child instanceof protobufjs.Service) {
            yield child;
        } else if (child instanceof protobufjs.Namespace) {
            yield* iterateServices(child);
        }
    }
}

function isOptionalField(field: protobufjs.Field): boolean {
    return field.options?.proto3_optional === true;
}

function fullyQualifiedName(obj: protobufjs.ReflectionObject): string {
    let name = obj.name;
    let p = obj.parent;
    while (p && p !== obj.root) {
        name = `${p.name}.${name}`;
        p = p.parent;
    }
    return name;
}

function mapType(type: protobufjs.Type | protobufjs.Enum): ProtoObject {
    if (type instanceof protobufjs.Enum) {
        const values = Object.entries(type.values);
        values.sort((a, b) => a[1] - b[1]);

        return {
            type: "enum",
            name: type.name,
            values: values.map(([name, value]) => ({ name, value })),
        };
    }

    // Else: Assume message
    const members: Record<string, ProtoObject | undefined> = {};
    for (const field of type.fieldsArray) {
        const fieldType = field.resolvedType ? mapType(field.resolvedType) : mapLiteralType(field.type);

        if (isOptionalField(field)) {
            members[field.name] = fieldType ? { type: "optional", optionalType: fieldType } : undefined;
            continue;
        }

        if (field.partOf instanceof protobufjs.OneOf) continue; // Skip oneofs for now

        if (field.repeated && fieldType) {
            members[field.name] = { type: "repeated", repeatedType: fieldType };
        } else {
            members[field.name] = fieldType;
        }
    }

    // Add one-of properties
    for (const oneof of type.oneofsArray) {
        // Optionals generate a synchtetic oneof, filter those out
        if (oneof.fieldsArray.length === 1 && isOptionalField(oneof.fieldsArray[0])) {
            continue;
        }

        const oneOfMembers: Record<string, ProtoObject> = {};

        for (const field of oneof.fieldsArray) {
            const nestedFieldType = field.resolvedType ? mapType(field.resolvedType) : mapLiteralType(field.type);
            if (nestedFieldType) {
                oneOfMembers[field.name] = nestedFieldType;
            }
        }

        members[oneof.name] = { type: "oneof", fields: oneOfMembers };
    }

    return {
        type: "message",
        name: type.name,
        fields: members,
    };
}

function mapLiteralType(type: string): ProtoLiteral | undefined {
    let mappedType: string | undefined;
    switch (type) {
        case "string":
            mappedType = type;
            break;
        default:
            mappedType = type;
    }

    if (mappedType) {
        return {
            type: "literal",
            literalType: mappedType,
        };
    }

    return undefined;
}
