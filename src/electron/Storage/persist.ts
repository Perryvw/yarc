import { app } from "electron";
import type { RequestData } from "../../AppContext";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const storagePath = app.getAppPath();
//const storagePath = app.getPath("userData");

const storageFile = path.join(storagePath, "localStorage.json");

export async function persistRequestList(requests: RequestData[]) {
    console.log(storageFile);
    await fs.writeFile(storageFile, JSON.stringify(requests));
}

export async function loadRequestList(): Promise<RequestData[]> {
    const s = await fs.stat(storagePath);
    if (s.isFile())
    {
        const loaded = await fs.readFile(storageFile);
        return JSON.parse(loaded.toString());
    }
    
    return [];
}
