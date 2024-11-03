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
import type { HttpRequestData, RequestData, RequestList, ResponseData } from "../../common/request-types";

export class AppContext {
    requests: RequestList = [];
    selectedIndex: number | undefined = undefined;

    get activeRequest() {
        if (this.selectedIndex === undefined) return undefined;

        return this.requests[this.selectedIndex];
    }

    gridWidthDirectory = 10;
    gridWidthResponse = 50;

    protoConfig: ProtoConfig;

    constructor() {
        this.requests = [];
        this.protoConfig = new ProtoConfig();

        makeObservable(this, {
            requests: observable,
            selectedIndex: observable,
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

    public setResponse(response: ResponseData | undefined) {
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

    public persistState(): void {
        const requestsWithoutResponse = this.requests.map((r) => {
            const req = toJS(r);
            req.response = undefined;
            return req;
        });
        const state: PersistedState = {
            requests: requestsWithoutResponse,
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
                } else {
                    // TODO: Remove this, but for now this is useful for debugging
                    const request1: HttpRequestData = {
                        type: "http",
                        name: "Google",
                        url: "https://www.google.com/",
                        params: [
                            {
                                enabled: true,
                                key: "test",
                                value: "123456",
                            },
                        ],
                        headers: [],
                        method: "GET",
                        body: "", // google doesnt like extra data
                    };
                    const request2: HttpRequestData = {
                        type: "http",
                        name: "JSON",
                        url: "https://jsonplaceholder.typicode.com/comments",
                        params: [],
                        headers: [],
                        method: "GET",
                        body: "B",
                    };
                    this.setRequestList([request1, request2]);
                    this.setActiveRequestById(0);
                }
            }),
        );
    }
}

export class ProtoConfig {
    roots: ProtoRoot[] = [];

    constructor() {
        makeObservable(this, {
            roots: observable,

            addProtoRoot: action,
            deleteProtoRoot: action,
        } satisfies ObservableDefinition<ProtoConfig>);
    }

    addProtoRoot(protoRoot: ProtoRoot) {
        this.roots.push(protoRoot);
    }

    deleteProtoRoot(protoRoot: ProtoRoot) {
        const index = this.roots.indexOf(protoRoot);
        console.log("deleting", index);
        if (index >= 0) {
            this.roots.splice(index, 1);
        }
    }
}

type ObservableDefinition<T extends object> = Record<
    keyof T,
    IObservableFactory | IComputedFactory | IActionFactory | undefined
>;
