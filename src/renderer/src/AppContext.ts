import { createContext } from "react";
import type { RequestData, RequestList, ResponseData } from "../../common/request-types";
import { IpcCall } from "../../common/ipc";
import type { PersistedState } from "../../common/persist-state";

type RequestHandler = (request: RequestData | undefined) => void;
type RequestListHandler = (requests: RequestList) => void;
type ResponseHandler = (response: ResponseData | undefined) => void;

export class AppContextImpl {
    activeRequest?: RequestData = undefined;
    response?: ResponseData = undefined;

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
        this.setResponse(undefined);

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
        this.response = response;
        for (const h of Object.values(this.responseListeners)) {
            h(response);
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
        const state: PersistedState = {
            requests: this.requests,
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
