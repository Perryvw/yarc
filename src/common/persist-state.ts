import type { RequestList } from "./request-types";

export interface PersistedState {
    requests: RequestList;
    protoRoots: string[];
    selectedRequest: string | null;
    substitutionVariables: Array<{ name: string; value: string }>;
    layout: {
        directoryWidth: number;
        responseWidth: number;
    };
    response: {
        prettyPrint: boolean;
        lineWrap: boolean;
    };
}

export type PersistedStateWithWindow = PersistedState & {
    window: {
        maximized: boolean;
        position: number[];
        size: number[];
    };
};
