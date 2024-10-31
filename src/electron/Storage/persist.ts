import { app, type BaseWindow } from "electron";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { PersistedState, PersistedStateWithWindow } from "../../common/persist-state";
import type { GrpcRequestData, HttpRequestData, KeyValue, RequestData } from "../../common/request-types";

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
                const persistedData = JSON.parse(loaded.toString());

                resolve(fixPersistedData(persistedData));
            })
            .catch((err) => {
                // File doesn't exist
                resolve(undefined);
            });
    });
}

type DeepPartial<T> = T extends object
    ? {
          [P in keyof T]?: DeepPartial<T[P]>;
      }
    : T;

// Try to form whatever kind of data we read from disk into the required data format the app is expecting
function fixPersistedData(
    incoming: DeepPartial<PersistedStateWithWindow> | undefined,
): PersistedStateWithWindow | undefined {
    if (incoming === undefined) {
        return undefined;
    }

    function fixRequest(r: DeepPartial<RequestData> | undefined): RequestData | undefined {
        if (r === undefined) return undefined;

        if (r.type === "grpc") {
            return fixGrpcRequest(r);
        }

        return fixHttpRequest(r as HttpRequestData);
    }

    function fixHttpRequest(ri: DeepPartial<HttpRequestData>): HttpRequestData {
        function fixKeyValue(kv: DeepPartial<KeyValue> | undefined): KeyValue | undefined {
            if (kv === undefined) return undefined;
            return {
                enabled: kv.enabled ?? true,
                key: kv.key ?? "",
                value: kv.value ?? "",
            };
        }
        return {
            type: "http",
            name: ri.name ?? "Restored request",
            url: ri.url ?? "",
            method: ri.method ?? "GET",
            body: ri.body ?? "",
            headers: ri.headers?.map(fixKeyValue).filter((kv) => kv !== undefined) ?? [],
            params: ri.params?.map(fixKeyValue).filter((kv) => kv !== undefined) ?? [],
        };
    }

    function fixGrpcRequest(ri: DeepPartial<GrpcRequestData>): GrpcRequestData {
        return {
            type: "grpc",
            name: ri.name ?? "Restored request",
            url: ri.url ?? "",
        };
    }

    return {
        requests: incoming.requests?.map(fixRequest).filter((r) => r !== undefined) ?? [],
        layout: {
            directoryWidth: incoming.layout?.directoryWidth ?? 150,
            repsonseWidth: incoming.layout?.repsonseWidth ?? 200,
        },
        window: {
            maximized: incoming.window?.maximized ?? false,
            position: (incoming.window?.position as number[]) ?? [100, 100],
            size: (incoming.window?.size as number[]) ?? [800, 600],
        },
    };
}
