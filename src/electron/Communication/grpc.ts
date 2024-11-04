import * as fs from "node:fs/promises";
import * as path from "node:path";
import { dialog } from "electron";
import type { ProtoContent, ProtoService } from "../../common/grpc";
import type { BrowseProtoResult } from "../../common/ipc";
import * as proto from "@grpc/proto-loader";

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
    const contents = proto.loadSync(protoPath, { includeDirs: [protoRootDir] });

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
                    requestStream: methodDescription.requestStream,
                    serverStream: methodDescription.responseStream,
                });
            }
            services.push(service);
        }
    }

    return { services };
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
