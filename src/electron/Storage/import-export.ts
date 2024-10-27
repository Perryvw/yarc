import { dialog } from "electron";
import type { RequestData } from "../../common/request-types";
import * as fs from "node:fs/promises";

export async function importDirectory() {
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
        return { cancelled: false, requests: deserializedData };
    }

    return { cancelled: true };
}

export async function exportDirectory(requests: RequestData[]) {
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
        const serializedData = JSON.stringify(requests);
        await fs.writeFile(result.filePath, serializedData);
    }
}
