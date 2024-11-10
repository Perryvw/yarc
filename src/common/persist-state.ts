import type { RequestList } from "./request-types";

export interface PersistedState {
    requests: RequestList;
    protoRoots: string[];
    layout: {
        directoryWidth: number;
        responseWidth: number;
    };
}

export type PersistedStateWithWindow = PersistedState & {
    window: {
        maximized: boolean;
        position: number[];
        size: number[];
    };
};
