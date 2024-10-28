import { createContext } from "react";
import type { RequestData, ResponseData } from "./common/request-types";

type RequestHandler = (request: RequestData | undefined) => void;
type RequestListHandler = (requests: RequestData[]) => void;
type ResponseHandler = (response: ResponseData | undefined) => void;

export class AppContextImpl {
    activeRequest?: RequestData = undefined;
    response?: ResponseData = undefined;

    requests: RequestData[] = [];

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
    }

    public setRequestList(requests: RequestData[]) {
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
}

export const AppContext = createContext(new AppContextImpl());
