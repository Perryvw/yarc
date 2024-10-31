import { createContext } from "react";
import type { RequestData, RequestList, ResponseData } from "../../common/request-types";
import { IpcCall } from "../../common/ipc";
import type { PersistedState } from "../../common/persist-state";

type RequestHandler = (request: RequestData | undefined) => void;
type RequestListHandler = (requests: RequestList) => void;
type ResponseHandler = (response: ResponseData | undefined) => void;

export class AppContextImpl {
    activeRequest?: RequestData = undefined;

    requests: RequestList = [];

    gridWidthDirectory = 10;
    gridWidthResponse = 50;
    setGridWidthDirectory: (width: number) => void;
    setGridWidthResponse: (width: number) => void;

    constructor() {
        this.requests = [];
        this.setGridWidthDirectory = () => {};
        this.setGridWidthResponse = () => {};
    }

    public setActiveRequest(request: RequestData | undefined) {
        this.activeRequest = request;
        for (const h of Object.values(this.activeRequestListeners)) {
            h(request);
        }
        this.setResponse(request?.response);

        // TODO: Only persist when unchanged data is pending
        this.persistState();
    }

    public setRequestList(requests: RequestList) {
        this.requests = requests;
        for (const h of Object.values(this.requestListListeners)) {
            h(requests);
        }
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
                this.setActiveRequest(this.requests[Math.min(index, this.requests.length - 1)]);
            } else {
                this.setActiveRequest(undefined);
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
        window.electron.ipcRenderer.invoke(IpcCall.PersistState, state);
    }

    public loadPersistedState(): void {}
}

export const AppContext = createContext(new AppContextImpl());
