import {
    type IActionFactory,
    type IComputedFactory,
    type IObservableFactory,
    action,
    isObservable,
    makeAutoObservable,
    makeObservable,
    observable,
    runInAction,
    toJS,
} from "mobx";
import type {
    GrpcServerStreamDataEvent,
    GrpcServerStreamErrorEvent,
    GrpcStreamClosedEvent,
    ProtoRoot,
} from "../../common/grpc";
import { IpcCall, IpcEvent } from "../../common/ipc";
import type { PersistedState } from "../../common/persist-state";
import type {
    HttpResponseData,
    HttpResponseEvent,
    RequestData,
    RequestDataOrGroup,
    RequestList,
} from "../../common/request-types";
import { v7 as uuidv7 } from "uuid";

export class AppContext {
    requests: RequestList = [];
    activeRequest: RequestData | undefined;

    gridWidthDirectory = 20;
    gridWidthResponse = 50;

    isDragging = false;
    draggingOverRequestId: string | null = null;
    draggingInsertPosition: "above" | "below" | "group" = "above";
    draggingStartClientY = 0;

    protoConfig: ProtoConfig;

    constructor() {
        this.protoConfig = new ProtoConfig(this);

        makeAutoObservable(this);

        this.loadPersistedState();

        window.electron.ipcRenderer.on(IpcEvent.WindowClosing, () => {
            this.persistState();
        });

        window.electron.ipcRenderer.on(IpcEvent.HttpResponseData, (_, event: HttpResponseEvent) =>
            this.handleHttpResponse(event),
        );

        window.electron.ipcRenderer.on(IpcEvent.GrpcServerStreamData, (_, event: GrpcServerStreamDataEvent) =>
            this.handleGrpcStreamData(event),
        );

        window.electron.ipcRenderer.on(IpcEvent.GrpcServerStreamEnded, (_, event: GrpcStreamClosedEvent) =>
            this.handleGrpcStreamClose(event),
        );

        window.electron.ipcRenderer.on(IpcEvent.GrpcServerStreamError, (_, event: GrpcServerStreamErrorEvent) =>
            this.handleGrpcStreamError(event),
        );
    }

    public addRequest(request: RequestDataOrGroup) {
        this.requests.push(isObservable(request) ? request : request);
        this.persistState();
    }

    public setActiveRequest(request: RequestData | undefined) {
        this.activeRequest = request;
    }

    public setResponse(response: HttpResponseData | undefined) {
        if (this.activeRequest) {
            this.activeRequest.response = response;
        }
    }

    public deleteRequest(request: RequestDataOrGroup) {
        const oldIndex = this.findRequestById(request.id);

        if (oldIndex === null) {
            return;
        }

        this.setActiveRequest(undefined);

        oldIndex.requests.splice(oldIndex.index, 1);

        this.persistState();
    }

    public duplicateRequest(request: RequestData) {
        const oldIndex = this.findRequestById(request.id);

        if (oldIndex === null) {
            return;
        }

        const newRequest = { ...request, id: uuidv7(), name: `${request.name} - Duplicate` };

        oldIndex.requests.splice(oldIndex.index + 1, 0, newRequest);

        this.persistState();
    }

    public findRequestById(
        id: string,
        requests: RequestDataOrGroup[] = this.requests,
    ): {
        request: RequestDataOrGroup;
        requests: RequestDataOrGroup[];
        index: number;
    } | null {
        for (let i = 0; i < requests.length; i++) {
            const request = requests[i];

            if (request.id === id) {
                return { request, requests, index: i };
            }

            if (request.type === "group") {
                const found = this.findRequestById(id, request.requests);
                if (found) {
                    return found;
                }
            }
        }

        return null;
    }

    public moveRequest(who: string, where: string, position: "below" | "above" | "group") {
        if (who === where) {
            return;
        }

        const oldIndex = this.findRequestById(who);

        if (oldIndex === null) {
            return;
        }

        const [request] = oldIndex.requests.splice(oldIndex.index, 1);

        // Find the new index after removing the request so its placed in the correct place
        const newIndex = this.findRequestById(where);

        if (newIndex === null) {
            oldIndex.requests.splice(oldIndex.index, 0, request); // insert back
            return;
        }

        if (position === "group" && newIndex.request.type === "group") {
            newIndex.request.requests.unshift(request);
        } else {
            const delta = position === "below" ? 1 : 0;
            newIndex.requests.splice(newIndex.index + delta, 0, request);
        }

        // Persist state
        //this.persistState();
    }

    public restoreRequestData(request: RequestData) {
        if (this.activeRequest === undefined) {
            return;
        }

        if (this.activeRequest) {
            request.history = this.activeRequest.history;
        }
    }

    public persistState(): void {
        const requestsWithoutResponse = this.requests.map((r) => {
            const req = toJS(r);
            if (req.type !== "group") req.response = undefined;
            if (req.type !== "group") req.history = [];
            return req;
        });
        const state: PersistedState = {
            requests: requestsWithoutResponse,
            protoRoots: this.protoConfig.roots.map((r) => r.rootPath),
            layout: {
                directoryWidth: this.gridWidthDirectory,
                responseWidth: this.gridWidthResponse,
            },
        };
        window.electron.ipcRenderer.invoke(IpcCall.PersistState, toJS(state));
    }

    public loadPersistedState(): void {
        window.electron.ipcRenderer.invoke(IpcCall.LoadPersistedState).then((state: PersistedState | undefined) =>
            runInAction(() => {
                if (state) {
                    this.gridWidthDirectory = state.layout.directoryWidth;
                    this.gridWidthResponse = state.layout.responseWidth;
                    this.requests = state.requests;

                    this.protoConfig.roots = observable<ProtoRoot>([]);
                    for (const protoRoot of state.protoRoots) {
                        const root = this.protoConfig.addProtoRoot({ rootPath: protoRoot, protoFiles: [] });
                        // Only the root path is persisted, discover proto files from the root on disk
                        this.protoConfig.refreshProtoRoot(root);
                    }
                }
            }),
        );
    }

    public handleHttpResponse(event: HttpResponseEvent) {
        const index = this.findRequestById(event.requestId);

        if (index === null) {
            return;
        }

        const { request } = index;

        if (request.type === "http") {
            request.response = event.response;
            request.isExecuting = false;
        }
    }

    public handleGrpcStreamData(event: GrpcServerStreamDataEvent) {
        const index = this.findRequestById(event.requestId);

        if (index === null) {
            return;
        }

        const { request } = index;

        if (request.type === "grpc" && request.response?.result === "stream") {
            request.response.responses.push(event.response);
        }
    }

    public handleGrpcStreamClose(event: GrpcStreamClosedEvent) {
        const index = this.findRequestById(event.requestId);

        if (index === null) {
            return;
        }

        const { request } = index;

        if (request.type !== "grpc") {
            return;
        }

        request.isExecuting = false;

        if (request?.type === "grpc" && request.response?.result === "stream") {
            request.response.streamOpen = false;
        }
    }

    public handleGrpcStreamError(event: GrpcServerStreamErrorEvent) {
        const request = this.requests.find((r) => r.id === event.requestId);

        if (request?.type !== "grpc") {
            return;
        }

        request.isExecuting = false;

        if (request.response?.result === "stream") {
            request.response.error = {
                result: "error",
                code: event.code ?? "<unknown>",
                detail: event.detail ?? "",
                time: 0,
            };
        }
    }
}

export class ProtoConfig {
    roots: ProtoRoot[] = [];

    constructor(private context: AppContext) {
        makeObservable(this, {
            roots: observable,

            addProtoRoot: action,
            deleteProtoRoot: action,
            refreshProtoRoot: action,
        } satisfies ObservableDefinition<ProtoConfig>);
    }

    addProtoRoot(protoRoot: ProtoRoot) {
        this.roots.push(protoRoot);
        this.context.persistState();
        return this.roots[this.roots.length - 1];
    }

    deleteProtoRoot(protoRoot: ProtoRoot) {
        const index = this.roots.indexOf(protoRoot);
        if (index >= 0) {
            this.roots.splice(index, 1);
        }
        this.context.persistState();
    }

    async refreshProtoRoot(protoRoot: ProtoRoot) {
        const refreshedRoot: ProtoRoot = await window.electron.ipcRenderer.invoke(
            IpcCall.RefreshProtoDirectory,
            protoRoot.rootPath,
        );
        protoRoot.protoFiles = refreshedRoot.protoFiles;
    }
}

type ObservableDefinition<T extends object> = Record<
    keyof T,
    IObservableFactory | IComputedFactory | IActionFactory | undefined
>;
