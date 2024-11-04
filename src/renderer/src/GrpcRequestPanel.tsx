import CodeMirror from "@uiw/react-codemirror";
import { runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { type ChangeEvent, useCallback, useState } from "react";
import styled from "styled-components";
import type { MethodInfo, ProtoContent } from "../../common/grpc";
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

        const flattenedRoots = protoConfig.roots.flatMap((r) =>
            r.protoFiles.map((p) => ({ protoPath: p, rootPath: r.rootPath })),
        );

        const onProtoFileChange = useCallback(
            (e: ChangeEvent<HTMLSelectElement>) => {
                runInAction(() => {
                    const protoRoot = flattenedRoots[Number(e.target.value)];
                    activeRequest.protoFile = {
                        rootDir: protoRoot.rootPath,
                        protoPath: protoRoot.protoPath,
                    };
                    persist();
                });
            },
            [activeRequest],
        );

        const [rpcs, setRpcs] = useState<Array<{ service: string; method: MethodInfo }> | undefined>(undefined);
        if (activeRequest.protoFile && !rpcs) {
            window.electron.ipcRenderer
                .invoke(IpcCall.ReadProtoContent, activeRequest.protoFile.protoPath, activeRequest.protoFile.rootDir)
                .then((protoContent: ProtoContent) => {
                    const rpcs = protoContent.services.flatMap((service) =>
                        service.methods.map((rpc) => ({ service: service.name, method: rpc })),
                    );
                    setRpcs(rpcs);
                });
        }

        const onRpcChange = useCallback(
            (e: ChangeEvent<HTMLSelectElement>) => {
                runInAction(() => {
                    if (rpcs) {
                        const rpc = rpcs[Number(e.target.value)];
                        activeRequest.rpc = {
                            service: rpc.service,
                            method: rpc.method.name,
                        };
                        persist();
                    }
                });
            },
            [rpcs, activeRequest],
        );

        const onRequestBodyChanged = useCallback(
            (value: string) => {
                runInAction(() => {
                    activeRequest.body = value;
                    persist();
                });
            },
            [activeRequest],
        );

        const selectedRoot = flattenedRoots.findIndex((r) => r.protoPath === activeRequest.protoFile?.protoPath);

        const selectedRpc =
            (rpcs &&
                activeRequest.rpc &&
                rpcs?.findIndex(
                    (rpc) =>
                        rpc.service === activeRequest.rpc?.service && rpc.method.name === activeRequest.rpc?.method,
                )) ??
            -1;

        return (
            <RequestPanelRoot>
                <SelectProtosModal open={protoModalOpen} close={closeProtoModal} protoConfig={protoConfig} />
                <button type="button" onClick={openProtoModal}>
                    Select protos
                </button>
                Proto file:
                <br />
                Current: {activeRequest.protoFile?.protoPath ?? "<no proto file>"}
                <select onChange={onProtoFileChange} defaultValue={selectedRoot}>
                    <option value={-1} disabled>
                        Change proto file...
                    </option>
                    {flattenedRoots.map((r, i) => (
                        <option key={i.toString()} value={i}>
                            {r.protoPath}
                        </option>
                    ))}
                </select>
                RPC:
                <br />
                Current: {activeRequest.rpc ? `${activeRequest.rpc.service} / ${activeRequest.rpc.method}` : "<no rpc>"}
                <select
                    onChange={onRpcChange}
                    disabled={activeRequest.protoFile === undefined}
                    defaultValue={selectedRpc}
                >
                    <option value={-1} disabled>
                        Change Method...
                    </option>
                    {rpcs?.map((rpc, i) => (
                        <option key={i.toString()} value={i}>{`${rpc.service} / ${rpc.method.name}`}</option>
                    ))}
                </select>
                <CodeMirror
                    theme="dark"
                    basicSetup={{ foldGutter: true }}
                    style={{
                        flexBasis: "100%",
                        overflow: "hidden",
                    }}
                    value={activeRequest.body}
                    onChange={onRequestBodyChanged}
                />
            </RequestPanelRoot>
        );
    },
);
