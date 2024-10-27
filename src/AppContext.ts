import { createContext } from "react";
import type { RequestData, ResponseData } from "./common/request-types";

export interface AppContextType {
    requests: RequestData[];

    activeRequest?: RequestData;
    response: ResponseData;

    setRequestList: (requests: RequestData[]) => void;
    setDirectoryheaderList: (requests: RequestData[]) => void;

    setActiveRequestHeader: (request: RequestData) => void;
    setActiveRequest: (request: RequestData) => void;
    setResponse: (request: ResponseData) => void;
}
export const AppContext = createContext<AppContextType>(null!);
