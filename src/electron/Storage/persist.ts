import { app, type BaseWindow } from "electron";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { PersistedState, PersistedStateWithWindow } from "../../common/persist-state";

const storagePath = app.getPath("sessionData");
const storageFile = path.join(storagePath, "localStorage.json");

export async function persistCurrentState(state: PersistedState, window: BaseWindow) {
    const stateWithWindow: PersistedStateWithWindow = {
        ...state,
        window: {
            maximized: window.isMaximized(),
            position: window.getPosition(),
            size: window.getSize(),
        },
    };
    await fs.writeFile(storageFile, JSON.stringify(stateWithWindow));
}

export async function getPersistedState(): Promise<PersistedStateWithWindow | undefined> {
    return new Promise((resolve) => {
        fs.access(storageFile, fs.constants.R_OK)
            .then(async () => {
                // Can read the storage file
                const loaded = await fs.readFile(storageFile);
                resolve(JSON.parse(loaded.toString()));
            })
            .catch((err) => {
                // File doesn't exist
                resolve(undefined);
            });
    });
}
