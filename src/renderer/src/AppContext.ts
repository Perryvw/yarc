import type { RequestData, RequestList, ResponseData } from "../../common/request-types";
import { IpcCall } from "../../common/ipc";
import type { PersistedState } from "../../common/persist-state";
import { action, computed, makeObservable, observable, toJS } from "mobx";

type RequestHandler = (request: RequestData | undefined) => void;
type RequestListHandler = (requests: RequestList) => void;
type ResponseHandler = (response: ResponseData | undefined) => void;

export class AppContext {
    requests: RequestList = [];
    selectedIndex: number | undefined = undefined;

    get activeRequest() {
        if (this.selectedIndex === undefined) return undefined;

        return this.requests[this.selectedIndex];
    }

    gridWidthDirectory = 10;
    gridWidthResponse = 50;

    constructor() {
        this.requests = [];

        makeObservable(this, {
            requests: observable,
            selectedIndex: observable,
            activeRequest: computed,
            gridWidthDirectory: observable,
            gridWidthResponse: observable,
            setActiveRequest: action,
            setActiveRequestById: action,
            setRequestList: action,
            setResponse: action,
            deleteRequest: action,
        });
    }

    public addRequest(request: RequestData) {
        this.requests.push(request);
    }

    public setActiveRequest(request: RequestData) {
        const index = this.requests.indexOf(request);
        this.setActiveRequestById(index);
    }

    public setActiveRequestById(index: number | undefined) {
        // if (index === undefined) {
        //     this.activeRequest = undefined;
        //     return;
        // }

        // console.log(this.requests);

        // console.log("setting active request", index, this.requests[index]);
        // //this.selectedIndex = index;
        // if (index === undefined) this.activeRequest = undefined;
        // else this.activeRequest = this.requests[index];
        // console.log("active request is", this.activeRequest);

        if (index === undefined) {
            this.selectedIndex = undefined;
            return;
        }

        this.selectedIndex = index;

        // if (request === undefined) {
        //     this.selectedIndex = undefined;
        //     return;
        // }

        // const index = this.requests.indexOf(request);
        // console.log("setting active request", index, request, this.requests);
        // if (index >= 0) {
        //     this.selectedIndex = index;
        // } else {
        //     this.selectedIndex = undefined;
        // }
        // this.activeRequest = request;
        // for (const h of Object.values(this.activeRequestListeners)) {
        //     h(request);
        // }
        // this.setResponse(request?.response);

        // TODO: Only persist when unchanged data is pending
        //this.persistState();
    }

    public setRequestList(requests: RequestList) {
        this.requests = requests;
        // for (const h of Object.values(this.requestListListeners)) {
        //     h(requests);
        // }
    }

    public setResponse(response: ResponseData | undefined) {
        if (this.activeRequest) {
            this.activeRequest.response = response;
            for (const h of Object.values(this.responseListeners)) {
                h(response);
            }
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

    private activeRequestListeners: Record<string, RequestHandler> = {};
    public addActiveRequestListener(key: string, handler: RequestHandler) {
        this.activeRequestListeners[key] = handler;
    }

    private requestListListeners: Record<string, RequestListHandler> = {};
    public addRequestListListener(key: string, handler: RequestListHandler) {
        this.requestListListeners[key] = handler;
    }

    private responseListeners: Record<string, ResponseHandler> = {};
    public addResponseListener(key: string, handler: ResponseHandler) {
        this.responseListeners[key] = handler;
    }

    public persistState(): void {
        const requestsWithoutResponse = this.requests.map((r) => ({ ...r, response: undefined }));
        const state: PersistedState = {
            requests: requestsWithoutResponse,
            layout: {
                directoryWidth: this.gridWidthDirectory,
                repsonseWidth: this.gridWidthResponse,
            },
        };
        window.electron.ipcRenderer.invoke(IpcCall.PersistState, toJS(state));
    }

    public loadPersistedState(): void {}
}
