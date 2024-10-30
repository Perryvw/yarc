import type { RequestList } from "./request-types";

export interface PersistedState {
    requests: RequestList;
    layout: {
        directoryWidth: number;
        repsonseWidth: number;
    };
}

export type PersistedStateWithWindow = PersistedState & {
    window: {
        maximized: boolean;
        position: number[];
        size: number[];
    };
};
