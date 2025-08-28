import * as fs from "node:fs/promises";
import * as path from "node:path";
import { type BaseWindow, app } from "electron";
import { v7 as uuidv7 } from "uuid";
import type { MethodInfo } from "../../common/grpc";
import type { KeyValue } from "../../common/key-values";
import type { PersistedState, PersistedStateWithWindow } from "../../common/persist-state";
import type {
    GrpcRequestData,
    HttpRequestData,
    RequestDataOrGroup,
    RequestGroup,
    RequestId,
} from "../../common/request-types";

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
    return stateWithWindow;
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

function notUndefined<T>(v: T | undefined) {
    return v !== undefined;
}

// Try to form whatever kind of data we read from disk into the required data format the app is expecting
function fixPersistedData(
    incoming: DeepPartial<PersistedStateWithWindow> | undefined,
): PersistedStateWithWindow | undefined {
    if (incoming === undefined) {
        return undefined;
    }

    function fixRequest(r: DeepPartial<RequestDataOrGroup> | undefined): RequestDataOrGroup | undefined {
        if (r === undefined) return undefined;

        if (r.type === "grpc") {
            return fixGrpcRequest(r);
        }
        if (r.type === "http") {
            return fixHttpRequest(r);
        }
        if (r.type === "group") {
            return fixGroup(r);
        }
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
            id: (ri.id ?? uuidv7()) as RequestId,
            name: ri.name ?? "Restored request",
            url: ri.url ?? "",
            method: ri.method ?? "GET",
            body: ri.body ?? "",
            bodyForm: ri.bodyForm?.map(fixKeyValue).filter(notUndefined) ?? [],
            headers: ri.headers?.map(fixKeyValue).filter(notUndefined) ?? [],
            params: ri.params?.map(fixKeyValue).filter(notUndefined) ?? [],
            lastExecute: ri.lastExecute ?? Date.now(),
            isExecuting: false,
            history: [],
        };
    }

    function fixGrpcRequest(ri: DeepPartial<GrpcRequestData>): GrpcRequestData {
        const fixedMethod = ri.rpc?.method ? fixGrpcMethod(ri.rpc.method, ri.protoFile !== undefined) : undefined;
        return {
            type: "grpc",
            id: (ri.id ?? uuidv7()) as RequestId,
            name: ri.name ?? "Restored request",
            url: ri.url ?? "",
            kind: ri.kind,

            useReflection: ri.useReflection ?? false,
            protoFile: ri.protoFile
                ? {
                      protoPath: ri.protoFile?.protoPath ?? "",
                      rootDir: ri.protoFile?.rootDir ?? "",
                  }
                : undefined,
            rpc:
                ri.rpc && fixedMethod
                    ? {
                          service: ri.rpc?.service ?? "",
                          method: fixedMethod,
                      }
                    : undefined,

            body: ri.body ?? "{}",

            lastExecute: ri.lastExecute ?? Date.now(),
            isExecuting: false,
            history: [],
        };
    }

    function fixGrpcMethod(rpc: DeepPartial<MethodInfo>, hasProtoFile: boolean): MethodInfo | undefined {
        if (typeof rpc === "string" && hasProtoFile) {
            // If we only have a name, but we have the proto file it's in, we can deal with just the name
            return {
                name: rpc,
                requestStream: false, // assume unary
                serverStream: false, // assume unary
            };
        }

        if (typeof rpc === "object") {
            return {
                name: rpc.name ?? "",
                requestStream: rpc.requestStream ?? false,
                serverStream: rpc.serverStream ?? false,
                requestType: rpc.requestType as ProtoMessageDescriptor | undefined, // assume content of this is correct
                responseType: rpc.responseType as ProtoMessageDescriptor | undefined, // assume content of htis is correct
            };
        }

        return undefined;
    }

    function fixGroup(ri: DeepPartial<RequestGroup>): RequestGroup {
        return {
            type: "group",
            id: (ri.id ?? uuidv7()) as RequestId,
            name: ri.name ?? "Restored group",
            collapsed: ri.collapsed ?? false,
            requests: ri.requests?.map(fixRequest).filter(notUndefined) ?? [],
        };
    }

    function fixSubstitutionVariable(vi: DeepPartial<KeyValue>): KeyValue {
        return {
            enabled: vi.enabled ?? true,
            key: vi.key ?? "restored-variable",
            value: vi.value ?? "",
        };
    }

    return {
        requests: incoming.requests?.map(fixRequest).filter(notUndefined) ?? [],
        protoRoots: incoming.protoRoots?.filter(notUndefined) ?? [],
        selectedRequest: (incoming.selectedRequest as RequestId) ?? null,
        substitutionVariables: incoming.substitutionVariables?.filter(notUndefined)?.map(fixSubstitutionVariable) ?? [],
        response: {
            prettyPrint: incoming.response?.lineWrap ?? true,
            lineWrap: incoming.response?.lineWrap ?? true,
        },
        layout: {
            directoryWidth: incoming.layout?.directoryWidth ?? 20,
            responseWidth: incoming.layout?.responseWidth ?? 50,
        },
        window: {
            maximized: incoming.window?.maximized ?? false,
            position: (incoming.window?.position as number[]) ?? [100, 100],
            size: (incoming.window?.size as number[]) ?? [800, 600],
        },
    };
}
