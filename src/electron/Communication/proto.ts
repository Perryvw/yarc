import * as path from "node:path";
import * as protobufjs from "../../../node_modules/protobufjs";
import type { ProtoContent, ProtoService } from "../../common/grpc";

export async function parseProtoFile(protoPath: string, protoRootDir: string): Promise<ProtoContent> {
    const protoContent = protobufjs.loadSync(path.join(protoRootDir, protoPath));
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
            // idk what to do here
            return {
                type: "enum",
            };
        }

        // Else: Assume message
        const members: Record<string, ProtoObject | undefined> = {};
        for (const field of type.fieldsArray) {
            members[field.name] = field.resolvedType ? mapType(field.resolvedType) : mapLiteralType(field.type);
        }

        return {
            type: "message",
            fields: members,
        };
    }

    function mapLiteralType(type: string): ProtoLiteral | undefined {
        let mappedType: string | undefined;
        switch (type) {
            case "string":
                mappedType = type;
                break;
        }

        if (mappedType) {
            return {
                type: "literal",
                literalType: mappedType,
            };
        }

        return undefined;
    }

    return result;
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

//function protoFieldType(type: protoDescriptor.IFieldDescriptorProto): ProtoMessageDescriptor {}
