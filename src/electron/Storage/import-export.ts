import * as fs from "node:fs/promises";
import { dialog } from "electron";
import type { IpcImportResult } from "../../common/ipc";
import type { RequestList } from "../../common/request-types";

export async function importDirectory(): Promise<IpcImportResult> {
    const result = await dialog.showOpenDialog({
        filters: [
            {
                extensions: ["json"],
                name: "Directory",
            },
        ],
    });

    if (!result.canceled) {
        const data = await fs.readFile(result.filePaths[0]);
        const deserializedData = JSON.parse(data.toString());
        // TODO: Add validation
        return { cancelled: false, result: deserializedData };
    }

    return { cancelled: true };
}

export async function exportDirectory(requests: RequestList) {
    const result = await dialog.showSaveDialog({
        filters: [
            {
                extensions: ["json"],
                name: "Directory",
            },
        ],
        defaultPath: "directory.json",
    });

    if (!result.canceled) {
        const serializedData = JSON.stringify(requests, null, 4);
        await fs.writeFile(result.filePath, serializedData);
    }
}
