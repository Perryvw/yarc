import {
    type IActionFactory,
    type IComputedFactory,
    type IObservableFactory,
    action,
    computed,
    isObservable,
    makeObservable,
    observable,
    runInAction,
    toJS,
} from "mobx";
import type { ProtoRoot } from "../../common/grpc";
import { IpcCall } from "../../common/ipc";
import type { PersistedState } from "../../common/persist-state";
import type { HttpRequestData, RequestData, RequestList, HttpResponseData } from "../../common/request-types";

export class AppContext {
    requests: RequestList = [];
    selectedIndex: number | undefined = undefined;
    isExecuting = false;

    get activeRequest() {
        if (this.selectedIndex === undefined) return undefined;

        return this.requests[this.selectedIndex];
    }

    gridWidthDirectory = 10;
    gridWidthResponse = 50;

    protoConfig: ProtoConfig;

    constructor() {
        this.requests = [];
        this.protoConfig = new ProtoConfig(this);

        makeObservable(this, {
            requests: observable,
            selectedIndex: observable,
            isExecuting: observable,
            gridWidthDirectory: observable,
            gridWidthResponse: observable,
            protoConfig: observable,

            activeRequest: computed,

            setActiveRequest: action,
            setActiveRequestById: action,
            addRequest: action,
            setRequestList: action,
            setResponse: action,
            deleteRequest: action,
            duplicateRequest: action,
            moveRequest: action,
            persistState: action,
            loadPersistedState: action,
        } satisfies ObservableDefinition<AppContext>);
    }

    public addRequest(request: RequestData) {
        this.requests.push(isObservable(request) ? request : request);
    }

    public setActiveRequest(request: RequestData) {
        const index = this.requests.indexOf(request);
        this.setActiveRequestById(index);
    }

    public setActiveRequestById(index: number | undefined) {
        if (index === undefined) {
            this.selectedIndex = undefined;
            return;
        }

        this.selectedIndex = index;
    }

    public setRequestList(requests: RequestList) {
        this.requests = requests;
    }

    public setResponse(response: HttpResponseData | undefined) {
        if (this.activeRequest) {
            this.activeRequest.response = response;
        }
    }

    public deleteRequest(request: RequestData) {
        const index = this.requests.indexOf(request);
        if (index >= 0) {
            // Remove request from list
            const newRequests = [...this.requests];
            newRequests.splice(index, 1);
            this.setRequestList(newRequests);
            // Persist state
            this.persistState();

            if (this.requests.length > 0) {
                // Set active request to next event in the list
                this.setActiveRequestById(Math.min(index, this.requests.length - 1));
            } else {
                this.setActiveRequestById(undefined);
            }
        }
    }

    public duplicateRequest(request: RequestData) {
        const index = this.requests.indexOf(request);
        if (index >= 0) {
            // Remove request from list
            const newRequests = [...this.requests];
            const newRequest = { ...request, name: `${request.name} - Duplicate` };
            newRequests.splice(index, 0, newRequest);
            this.setRequestList(newRequests);
            // Persist state
            this.persistState();
        }
    }

    public moveRequest(active: string, over: string) {
        const oldIndex = this.requests.findIndex((item) => item.id === active);
        const newIndex = this.requests.findIndex((item) => item.id === over);

        if (oldIndex >= 0 && newIndex >= 0) {
            const oldActiveRequest = this.activeRequest;
            const newRequests = [...this.requests];
            const [request] = newRequests.splice(oldIndex, 1);
            newRequests.splice(newIndex, 0, request);
            this.setRequestList(newRequests);

            if (oldActiveRequest) {
                this.setActiveRequest(oldActiveRequest);
            }

            // Persist state
            this.persistState();
        }
    }

    public persistState(): void {
        const requestsWithoutResponse = this.requests.map((r) => {
            const req = toJS(r);
            req.response = undefined;
            return req;
        });
        const state: PersistedState = {
            requests: requestsWithoutResponse,
            protoRoots: this.protoConfig.roots.map((r) => r.rootPath),
            layout: {
                directoryWidth: this.gridWidthDirectory,
                repsonseWidth: this.gridWidthResponse,
            },
        };
        window.electron.ipcRenderer.invoke(IpcCall.PersistState, toJS(state));
    }

    public loadPersistedState(): void {
        window.electron.ipcRenderer.invoke(IpcCall.LoadPersistedState).then((state: PersistedState | undefined) =>
            runInAction(() => {
                if (state) {
                    this.gridWidthDirectory = state.layout.directoryWidth;
                    this.gridWidthResponse = state.layout.repsonseWidth;

                    this.setRequestList(state.requests);
                    if (state.requests.length > 0) {
                        this.setActiveRequestById(0);
                    }

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
