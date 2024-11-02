import { dialog } from "electron";
import type { BrowseProtoResult } from "../../common/ipc";

export async function browseProtoRoot(): Promise<BrowseProtoResult> {
    const result = await dialog.showOpenDialog({
        properties: ["openDirectory"],
    });

    if (result.canceled) {
        return { cancelled: true };
    }

    return { cancelled: false, protoRoot: { rootPath: result.filePaths[0], protoFiles: [] } };
}
