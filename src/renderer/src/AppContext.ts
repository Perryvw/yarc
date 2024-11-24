import {
    type IActionFactory,
    type IComputedFactory,
    type IObservableFactory,
    action,
    isObservable,
    makeAutoObservable,
    makeObservable,
    observable,
    observe,
    runInAction,
    toJS,
} from "mobx";
import { v7 as uuidv7 } from "uuid";
import type {
    GrpcServerStreamDataEvent,
    GrpcServerStreamErrorEvent,
    GrpcStreamClosedEvent,
    ProtoRoot,
} from "../../common/grpc";
import { IpcCall, IpcEvent } from "../../common/ipc";
import type { KeyValue } from "../../common/key-values";
import type { PersistedState } from "../../common/persist-state";
import type {
    HttpResponseData,
    HttpResponseEvent,
    RequestData,
    RequestDataOrGroup,
    RequestGroup,
    RequestId,
    RequestList,
} from "../../common/request-types";
import { debounce } from "./util/debounce";

interface RequestWithPositionContext {
    request: RequestDataOrGroup;
    requests: RequestDataOrGroup[];
    index: number;
}

export class AppContext {
    requests: RequestList = [];
    activeRequest: RequestData | undefined;
    lastDeletedRequestForUndo: RequestWithPositionContext | undefined;
    substitutionVariables: KeyValue[] = [];

    historyActiveRequestIds: RequestId[] = [];
    historyCurrentIndex = 0;

    gridWidthDirectory = 20;
    gridWidthResponse = 50;

    responsePrettyPrint = true;
    responseLineWrap = true;

    isDragging = false;
    draggingOverRequestId: RequestId | null = null;
    draggingInsertPosition: "above" | "below" | "group" = "above";
    draggingStartClientY = 0;

    protoConfig: ProtoConfig;

    activeRequestObserverDispose = () => {};

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
        let newRequest: RequestDataOrGroup | null = null;

        if (this.activeRequest) {
            const activeIndex = this.findRequestById(this.activeRequest.id);

            if (activeIndex !== null) {
                activeIndex.requests.splice(activeIndex.index + 1, 0, request);
                newRequest = activeIndex.requests[activeIndex.index + 1];
            }
        } else {
            this.requests.push(request);
            newRequest = this.requests[this.requests.length - 1];
        }

        if (newRequest !== null && newRequest.type !== "group") {
            this.setActiveRequest(newRequest);
        }

        this.persistState();
    }

    // Persist if no new changes after 4 seconds
    private debouncedPersist = debounce(() => {
        this.persistState();
    }, 4000);

    public setActiveRequest(request: RequestData | undefined, addToHistory = true) {
        this.activeRequest = request;

        if (request && addToHistory) {
            if (this.historyCurrentIndex === this.historyActiveRequestIds.length - 1) {
                // Move pointer forward if it already was at the end
                this.historyCurrentIndex = this.historyActiveRequestIds.length;
            } else if (this.historyActiveRequestIds.length > 0) {
                // Truncate history if clicking on new request after going back in history
                this.historyCurrentIndex++;
                this.historyActiveRequestIds.length = this.historyCurrentIndex;
            }

            this.historyActiveRequestIds.push(request.id);
        }

        // Dispose previous observer
        this.activeRequestObserverDispose();

        if (this.activeRequest) {
            // Set new observer
            this.activeRequestObserverDispose = observe(this.activeRequest, () => {
                this.debouncedPersist();
            });
        }
    }

    public navigateInHistory(forward: boolean) {
        let requestId: RequestId | null = null;

        if (forward) {
            if (this.historyCurrentIndex + 1 < this.historyActiveRequestIds.length) {
                this.historyCurrentIndex++;
                requestId = this.historyActiveRequestIds[this.historyCurrentIndex];
            }
        } else if (this.historyCurrentIndex > 0) {
            this.historyCurrentIndex--;
            requestId = this.historyActiveRequestIds[this.historyCurrentIndex];
        }

        if (requestId !== null) {
            const index = this.findRequestById(requestId);

            // TODO: Skip over deleted requests and try next one
            if (index !== null && index.request.type !== "group") {
                this.setActiveRequest(index.request, false);
            }
        }
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

        let requestSelected = false;
        let isDeletingActiveRequest = request === this.activeRequest;

        // When deleting a group, check if current active request is in the group
        if (!isDeletingActiveRequest && request.type === "group") {
            isDeletingActiveRequest = this.isActiveRequestInGroup(request);
        }

        if (isDeletingActiveRequest) {
            // First try selecting a request above current
            if (oldIndex.index > 0) {
                for (let i = oldIndex.index - 1; i >= 0; i--) {
                    const requestAbove = oldIndex.requests[i];

                    if (requestAbove.type !== "group") {
                        requestSelected = true;
                        this.setActiveRequest(requestAbove);
                        break;
                    }
                }
            }

            // If we can't, try selecting a request below current
            if (!requestSelected && oldIndex.index + 1 < oldIndex.requests.length) {
                for (let i = oldIndex.index + 1; i < oldIndex.requests.length; i++) {
                    const requestBelow = oldIndex.requests[i];

                    if (requestBelow.type !== "group") {
                        requestSelected = true;
                        this.setActiveRequest(requestBelow);
                        break;
                    }
                }
            }

            // TODO: if we still have no request selected, select closest request from the closest groups?
        }

        // TODO: Select some other closest request
        if (!requestSelected) {
            this.setActiveRequest(undefined);
        }

        const deleted = oldIndex.requests.splice(oldIndex.index, 1);

        if (deleted.length > 0) {
            this.lastDeletedRequestForUndo = oldIndex;
            // TODO: Delete lastDeletedRequestForUndo after like 10 seconds?
        }

        this.persistState();
    }

    public restoreDeletedRequest() {
        const requestIndex = this.lastDeletedRequestForUndo;
        if (requestIndex === undefined) {
            return;
        }

        requestIndex.requests.splice(requestIndex.index, 0, requestIndex.request);
        this.lastDeletedRequestForUndo = undefined;

        if (requestIndex.request.type !== "group") {
            this.activeRequest = requestIndex.request;
        }
    }

    public duplicateRequest(request: RequestData) {
        const oldIndex = this.findRequestById(request.id);

        if (oldIndex === null) {
            return;
        }

        const newRequest = {
            ...request,
            id: uuidv7() as RequestId,
            name: `${request.name} - Duplicate`,
        };

        oldIndex.requests.splice(oldIndex.index + 1, 0, newRequest);

        this.persistState();
    }

    public isActiveRequestInGroup(group: RequestGroup): boolean {
        for (const request of group.requests) {
            if (request === this.activeRequest) {
                return true;
            }

            if (request.type === "group") {
                const found = this.isActiveRequestInGroup(request);
                if (found) {
                    return found;
                }
            }
        }

        return false;
    }

    public findRequestById(
        id: RequestId,
        requests: RequestDataOrGroup[] = this.requests,
    ): RequestWithPositionContext | null {
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

    public moveRequest(who: RequestId, where: RequestId) {
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

        if (this.draggingInsertPosition === "group" && newIndex.request.type === "group") {
            newIndex.request.requests.unshift(request);
        } else {
            const delta = this.draggingInsertPosition === "below" ? 1 : 0;
            newIndex.requests.splice(newIndex.index + delta, 0, request);
        }

        // Persist state
        this.persistState();
    }

    public restoreRequestData(historicalRequest: RequestData) {
        const index = this.findRequestById(historicalRequest.id);

        if (index === null || index.request.type === "group") {
            return;
        }

        const newRequest = observable(toJS(historicalRequest));

        const oldHistory = index.request.history;
        newRequest.history = oldHistory;
        index.requests[index.index] = newRequest;

        if (this.activeRequest === index.request) {
            this.setActiveRequest(newRequest);
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
            selectedRequest: this.activeRequest?.id ?? null,
            substitutionVariables: toJS(this.substitutionVariables),
            layout: {
                directoryWidth: this.gridWidthDirectory,
                responseWidth: this.gridWidthResponse,
            },
            response: {
                prettyPrint: this.responsePrettyPrint,
                lineWrap: this.responseLineWrap,
            },
        };
        window.electron.ipcRenderer.invoke(IpcCall.PersistState, toJS(state));
    }

    public loadPersistedState(): void {
        window.electron.ipcRenderer.invoke(IpcCall.LoadPersistedState).then((state: PersistedState | undefined) =>
            runInAction(() => {
                if (state) {
                    if (state.layout) {
                        this.gridWidthDirectory = state.layout.directoryWidth;
                        this.gridWidthResponse = state.layout.responseWidth;
                    }

                    if (state.response) {
                        this.responsePrettyPrint = state.response.prettyPrint;
                        this.responseLineWrap = state.response.lineWrap;
                    }

                    this.requests = state.requests;

                    if (state.selectedRequest) {
                        const requestIndex = this.findRequestById(state.selectedRequest);

                        if (requestIndex !== null && requestIndex.request.type !== "group") {
                            this.setActiveRequest(requestIndex.request);
                        }
                    }

                    this.protoConfig.roots = observable<ProtoRoot>([]);
                    for (const protoRoot of state.protoRoots) {
                        const root = this.protoConfig.addProtoRoot({ rootPath: protoRoot, protoFiles: [] }, false);
                        // Only the root path is persisted, discover proto files from the root on disk
                        this.protoConfig.refreshProtoRoot(root);
                    }

                    this.substitutionVariables = observable(state.substitutionVariables);
                }
            }),
        );
    }

    public handleHttpResponse(event: HttpResponseEvent) {
        let request = this.activeRequest as RequestDataOrGroup;

        if (!request || request.id !== event.requestId) {
            const index = this.findRequestById(event.requestId);

            if (index === null) {
                return;
            }

            request = index.request;
        }

        if (request.type === "http") {
            request.response = event.response;
            request.isExecuting = false;
            request.history[request.history.length - 1].response = request.response;
        }
    }

    public handleGrpcStreamData(event: GrpcServerStreamDataEvent) {
        let request = this.activeRequest as RequestDataOrGroup;

        if (!request || request.id !== event.requestId) {
            const index = this.findRequestById(event.requestId);

            if (index === null) {
                return;
            }

            request = index.request;
        }

        if (request.type === "grpc" && request.response?.result === "stream") {
            request.response.responses.push(event.response);
        }
    }

    public handleGrpcStreamClose(event: GrpcStreamClosedEvent) {
        let request = this.activeRequest as RequestDataOrGroup;

        if (!request || request.id !== event.requestId) {
            const index = this.findRequestById(event.requestId);

            if (index === null) {
                return;
            }

            request = index.request;
        }

        if (request.type !== "grpc") {
            return;
        }

        request.isExecuting = false;

        if (request?.type === "grpc" && request.response?.result === "stream") {
            request.response.streamOpen = false;
        }
    }

    public handleGrpcStreamError(event: GrpcServerStreamErrorEvent) {
        let request = this.activeRequest as RequestDataOrGroup;

        if (!request || request.id !== event.requestId) {
            const index = this.findRequestById(event.requestId);

            if (index === null) {
                return;
            }

            request = index.request;
        }

        if (request.type !== "grpc") {
            return;
        }

        request.isExecuting = false;

        if (request.response?.result === "stream") {
            request.response.streamOpen = false;
            request.response.responses.push({
                result: "error",
                code: event.code ?? "<unknown>",
                detail: event.detail ?? "",
                time: Date.now(),
            });
        }
    }
}

export class ProtoConfig {
    roots: ProtoRoot[] = [];

    constructor(private context: AppContext) {
        makeAutoObservable(this);
    }

    addProtoRoot(protoRoot: ProtoRoot, persist: boolean) {
        this.roots.push(protoRoot);
        if (persist) {
            this.context.persistState();
        }
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
