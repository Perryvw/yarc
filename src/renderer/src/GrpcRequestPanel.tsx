import { observer } from "mobx-react-lite";
import styled from "styled-components";
import type { GrpcRequestData } from "../../common/request-types";
import { useState } from "react";
import { SelectProtosModal } from "./modals/select-protos";
import type { ProtoConfig } from "./AppContext";

const RequestPanelRoot = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
    min-width: 250px;
    border-right: 1px solid hsla(0, 0%, 100%, 0.075);
`;

export const GrpcRequestPanel = observer(
    ({ activeRequest, protoConfig }: { activeRequest: GrpcRequestData; protoConfig: ProtoConfig }) => {
        const [protoModalOpen, setProtoModalOpen] = useState(false);

        return (
            <RequestPanelRoot>
                <button type="button" onClick={() => setProtoModalOpen(true)}>
                    Select protos
                </button>
                <SelectProtosModal
                    open={protoModalOpen}
                    close={() => setProtoModalOpen(false)}
                    protoConfig={protoConfig}
                />
            </RequestPanelRoot>
        );
    },
);
