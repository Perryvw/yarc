import { jsonLanguage } from "@codemirror/lang-json";
import * as CodeMirrorLint from "@codemirror/lint";
import CodeMirror from "@uiw/react-codemirror";
import { runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { useCallback, useState } from "react";
import styled from "styled-components";
import type { MethodInfo, ProtoContent } from "../../common/grpc";
import { IpcCall } from "../../common/ipc";
import type { GrpcRequestData } from "../../common/request-types";
import type { ProtoConfig } from "./AppContext";
import { type SelectProtoModalResult, SelectProtosModal } from "./modals/select-protos";
import { defaultProtoObject, lintProtoJson } from "./proto-lint";

const RequestPanelRoot = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px;
    overflow-y: auto;
    min-width: 0;
    border-right: 1px solid hsla(0, 0%, 100%, 0.075);
`;

const ProtoFileBox = styled.div`
    padding: 2px 10px 5px 10px;
    background-color: var(--color-background);
    cursor: pointer;

    &:hover {
        background-color: blue;
    }
`;

const ProtoMethodBox = styled.button`
    border: unset;
    padding: 5px 10px 5px 10px;
    text-align: left;
    background-color: var(--color-background);
    anchor-name: --proto-method-box;
    cursor: pointer;
    font-size: 12pt;

    &:hover {
        background-color: blue;
    }
`;

const GrpcMethodPopoverRoot = styled.div`
    position-anchor: --proto-method-box;
    bottom: unset;
    left: anchor(left);
    right: anchor(right);
    top: anchor(bottom);
    width: auto;
`;

const GrpcMethodPopoverEntry = styled.button`
    border: unset;
    width: 100%;

    cursor: pointer;

    &:hover {
        background-color: blue;
    }
`;

interface MethodDescriptor {
    service: string;
    method: MethodInfo;
}

export const GrpcRequestPanel = observer(
    ({
        activeRequest,
        protoConfig,
        persist,
    }: { activeRequest: GrpcRequestData; protoConfig: ProtoConfig; persist: () => void }) => {
        const [protoModalOpen, setProtoModalOpen] = useState(false);

        const openProtoModal = useCallback(() => setProtoModalOpen(true), []);
        const closeProtoModal = useCallback(
            (result: SelectProtoModalResult) => {
                setProtoModalOpen(false);
                if (!result.cancelled) {
                    runInAction(() => {
                        activeRequest.protoFile = {
                            protoPath: result.protoFile.protoPath,
                            rootDir: result.protoFile.rootPath,
                        };
                    });
                    persist();
                }
            },
            [activeRequest],
        );

        const [rpcs, setRpcs] = useState<MethodDescriptor[] | undefined>(undefined);

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

        const onRequestBodyChanged = useCallback(
            (value: string) => {
                runInAction(() => {
                    activeRequest.body = value;
                    persist();
                });
            },
            [activeRequest],
        );

        const selectMethod = useCallback(
            (method: MethodDescriptor) => {
                activeRequest.rpc = {
                    service: method.service,
                    method: method.method.name,
                };
                if (rpcs) {
                    const rpc = rpcs.find(
                        (rpc) =>
                            rpc.service === activeRequest.rpc?.service && rpc.method.name === activeRequest.rpc.method,
                    );
                    if (rpc?.method.requestType) {
                        activeRequest.body = JSON.stringify(defaultProtoObject(rpc.method.requestType), null, 2);
                    }
                }
                persist();
            },
            [activeRequest, rpcs],
        );

        const activeRpc = rpcs?.find(
            (rpc) => rpc.service === activeRequest.rpc?.service && rpc.method.name === activeRequest.rpc.method,
        );

        const linter = CodeMirrorLint.linter((view) => {
            if (!activeRpc?.method.requestType) return [];

            const content = view.state.doc.toString();
            return lintProtoJson(content, activeRpc.method.requestType);
        });

        return (
            <RequestPanelRoot>
                <SelectProtosModal open={protoModalOpen} close={closeProtoModal} protoConfig={protoConfig} />
                <GrpcMethodPopover rpcs={rpcs ?? []} onSelectMethod={selectMethod} />
                <ProtoFileBox onClick={openProtoModal}>
                    {activeRequest.protoFile
                        ? shortProtoPath(activeRequest.protoFile.protoPath)
                        : "Select proto file..."}
                </ProtoFileBox>
                <ProtoMethodBox popovertarget="grpc-method-popover" disabled={activeRequest.protoFile === undefined}>
                    {activeRequest.rpc ? activeRequest.rpc.method : "Select method..."}
                </ProtoMethodBox>
                {activeRequest.rpc !== undefined && (
                    <CodeMirror
                        theme="dark"
                        basicSetup={{ foldGutter: true }}
                        style={{
                            flexBasis: "100%",
                            overflow: "hidden",
                        }}
                        value={activeRequest.body}
                        onChange={onRequestBodyChanged}
                        extensions={[linter, jsonLanguage]}
                        lang="json"
                    />
                )}
            </RequestPanelRoot>
        );
    },
);

function GrpcMethodPopover({
    rpcs,
    onSelectMethod,
}: { rpcs: MethodDescriptor[]; onSelectMethod: (method: MethodDescriptor) => void }) {
    return (
        <GrpcMethodPopoverRoot popover="auto" id="grpc-method-popover">
            {rpcs.map((r, i) => (
                <GrpcMethodPopoverEntry
                    key={i.toString()}
                    popovertarget="grpc-method-popover"
                    onClick={() => onSelectMethod(r)}
                >{`${r.service} / ${r.method.name}`}</GrpcMethodPopoverEntry>
            ))}
        </GrpcMethodPopoverRoot>
    );
}

function shortProtoPath(protoPath: string): string {
    const parts = protoPath.split(/[\/\\]/);
    return parts[parts.length - 1];
}
