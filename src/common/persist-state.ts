import type { KeyValue } from "./key-values";
import type { RequestList } from "./request-types";

export interface PersistedState {
    requests: RequestList;
    protoRoots: string[];
    selectedRequest: string | null;
    substitutionVariables: KeyValue[];
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
