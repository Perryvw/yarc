import * as fs from "node:fs/promises";
import * as path from "node:path";
import { dialog } from "electron";
import type { ProtoContent } from "../../common/grpc";
import type { BrowseProtoResult } from "../../common/ipc";

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
    return {
        services: [
            {
                name: "ServiceA",
                method: ["foo", "bar"],
            },
            {
                name: "ServiceB",
                method: ["baz", "buzz"],
            },
        ],
    };
}
