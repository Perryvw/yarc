import { runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { type ChangeEvent, useCallback, useState } from "react";
import styled from "styled-components";
import type { ProtoContent } from "../../common/grpc";
import { IpcCall } from "../../common/ipc";
import type { GrpcRequestData } from "../../common/request-types";
import type { ProtoConfig } from "./AppContext";
import { SelectProtosModal } from "./modals/select-protos";

const RequestPanelRoot = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
    min-width: 0;
    border-right: 1px solid hsla(0, 0%, 100%, 0.075);
`;

export const GrpcRequestPanel = observer(
    ({
        activeRequest,
        protoConfig,
        persist,
    }: { activeRequest: GrpcRequestData; protoConfig: ProtoConfig; persist: () => void }) => {
        const [protoModalOpen, setProtoModalOpen] = useState(false);

        const openProtoModal = useCallback(() => setProtoModalOpen(true), []);
        const closeProtoModal = useCallback(() => {
            setProtoModalOpen(false);
        }, [protoConfig]);

        const onProtoFileChange = useCallback(
            (e: ChangeEvent<HTMLSelectElement>) => {
                runInAction(() => {
                    const [rootI, fileI] = e.target.value.split("/");
                    const protoRoot = protoConfig.roots[Number(rootI)];
                    activeRequest.protoFile = {
                        rootDir: protoRoot.rootPath,
                        protoPath: protoRoot.protoFiles[Number(fileI)],
                    };
                    persist();
                });
            },
            [activeRequest],
        );

        const [rpcs, setRpcs] = useState<Array<{ service: string; method: string }> | undefined>(undefined);
        if (activeRequest.protoFile && !rpcs) {
            window.electron.ipcRenderer
                .invoke(IpcCall.ReadProtoContent, activeRequest.protoFile.protoPath, activeRequest.protoFile.rootDir)
                .then((protoContent: ProtoContent) => {
                    console.log(protoContent);
                    const rpcs = protoContent.services.flatMap((service) =>
                        service.method.map((rpc) => ({ service: service.name, method: rpc })),
                    );
                    setRpcs(rpcs);
                });
        }

        const onRpcChange = useCallback(
            (e: ChangeEvent<HTMLSelectElement>) => {
                runInAction(() => {
                    if (rpcs) {
                        const rpc = rpcs[Number(e.target.value)];
                        activeRequest.rpc = rpc;
                        console.log("persist");
                        persist();
                    } else {
                        console.log("no rpcs???");
                    }
                });
            },
            [rpcs, activeRequest],
        );

        return (
            <RequestPanelRoot>
                <SelectProtosModal open={protoModalOpen} close={closeProtoModal} protoConfig={protoConfig} />
                <button type="button" onClick={openProtoModal}>
                    Select protos
                </button>
                Proto file:
                <br />
                Current: {activeRequest.protoFile?.protoPath ?? "<no proto file>"}
                <select onChange={onProtoFileChange} defaultValue={-1}>
                    <option value={-1} disabled>
                        Change proto file...
                    </option>
                    {protoConfig.roots.flatMap((r, i) =>
                        r.protoFiles.map((p, j) => (
                            <option key={j.toString()} value={`${i}/${j}`}>
                                {p}
                            </option>
                        )),
                    )}
                </select>
                RPC:
                <br />
                Current: {activeRequest.rpc ? `${activeRequest.rpc.service} / ${activeRequest.rpc.method}` : "<no rpc>"}
                <select
                    id="rpcs"
                    onChange={onRpcChange}
                    disabled={activeRequest.protoFile === undefined}
                    defaultValue={
                        rpcs?.findIndex(
                            (rpc) =>
                                rpc.service === activeRequest.rpc?.service && rpc.method === activeRequest.rpc.method,
                        ) ?? -1
                    }
                >
                    <option value={-1} disabled>
                        Change Method...
                    </option>
                    {rpcs?.map((rpc, i) => (
                        <option key={i.toString()} value={i}>{`${rpc.service} / ${rpc.method}`}</option>
                    ))}
                </select>
            </RequestPanelRoot>
        );
    },
);
