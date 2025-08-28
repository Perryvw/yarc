import * as CodeMirrorLint from "@codemirror/lint";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { json5 } from "codemirror-json5";
import { runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import type { MethodInfo, ProtoContent, ProtoService } from "../../common/grpc";
import { IpcCall } from "../../common/ipc";
import { type GrpcRequestData, GrpcRequestKind } from "../../common/request-types";
import type { AppContext, ProtoConfig } from "./AppContext";
import { type SelectProtoModalResult, SelectProtosModal } from "./modals/select-protos";
import { backgroundHoverColor, errorColor } from "./palette";
import { defaultProtoBody, lintProtoJson } from "./util/proto-lint";
import { substituteVariables } from "./util/substitute-variables";

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
        background-color: ${backgroundHoverColor};
    }
`;

const ProtoMethodBox = styled.button`
    border: unset;
    padding: 5px 10px 5px 10px;
    text-align: left;
    background-color: var(--color-background);
    anchor-name: --proto-method-box;
    cursor: pointer;
    font: inherit;

    &:hover {
        background-color: ${backgroundHoverColor};
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
    font: inherit;
    border: unset;
    width: 100%;

    cursor: pointer;

    &:hover {
        background-color: ${backgroundHoverColor};
    }
`;

const ProtoErrorBox = styled.div`
    background-color: ${errorColor};
    padding: 5px 10px;
`;

const ReflectionToggle = styled.label`
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
`;

const ReflectionButton = styled.button`
    padding: 2px 10px 5px 10px;
    cursor: pointer;
    border: none;
    background-color: var(--color-background);

    &:hover {
        background-color: ${backgroundHoverColor};
    }
`;

interface MethodDescriptor {
    service: string;
    method: MethodInfo;
}

const codemirrorTheme = EditorView.theme({
    "&": {
        fontFamily: "var(--font-monospace)",
    },
    ".cm-scroller": {
        fontFamily: "inherit",
    },
});

export const GrpcRequestPanel = observer(
    ({
        context,
        activeRequest,
        protoConfig,
    }: { context: AppContext; activeRequest: GrpcRequestData; protoConfig: ProtoConfig }) => {
        const [protoModalOpen, setProtoModalOpen] = useState(false);
        const [useReflection, setUseReflection] = useState(false);

        const openProtoModal = useCallback(() => setProtoModalOpen(true), []);
        const closeProtoModal = useCallback(
            (result: SelectProtoModalResult) => {
                setProtoModalOpen(false);
                if (!result.cancelled) {
                    runInAction(() => {
                        activeRequest.protoFile = {
                            protoPath: result.result.protoPath,
                            rootDir: result.result.rootPath,
                        };
                    });
                }
            },
            [activeRequest],
        );

        const [rpcs, setRpcs] = useState<MethodDescriptor[] | undefined>(undefined);
        const [protoError, setError] = useState<string | undefined>(undefined);

        useEffect(() => {
            if (activeRequest.protoFile) {
                window.electron.ipcRenderer
                    .invoke(
                        IpcCall.ReadProtoContent,
                        activeRequest.protoFile.protoPath,
                        activeRequest.protoFile.rootDir,
                    )
                    .then((result: Result<ProtoContent, string>) => {
                        if (result.success) {
                            const rpcs = result.value.services.flatMap((service) =>
                                service.methods.map((rpc) => ({ service: service.name, method: rpc })),
                            );
                            setRpcs(rpcs);
                            setError(undefined);
                        } else {
                            setError(`Error while reading ${activeRequest.protoFile?.protoPath}: ${result.error}`);
                        }
                    });
            }
        }, [activeRequest.protoFile]);

        const onRequestBodyChanged = useCallback(
            (value: string) => {
                runInAction(() => {
                    activeRequest.body = value;
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
                    if (rpc?.method) {
                        if (!rpc.method.requestStream && !rpc.method.serverStream) {
                            activeRequest.kind = GrpcRequestKind.Unary;
                        } else if (!rpc.method.requestStream && rpc.method.serverStream) {
                            activeRequest.kind = GrpcRequestKind.ResponseStreaming;
                        } else if (rpc.method.requestStream && !rpc.method.serverStream) {
                            activeRequest.kind = GrpcRequestKind.RequestStreaming;
                        } else if (rpc.method.requestStream && rpc.method.serverStream) {
                            activeRequest.kind = GrpcRequestKind.Bidirectional;
                        }
                    }
                    if (rpc?.method.requestType) {
                        activeRequest.body = defaultProtoBody(rpc.method.requestType).value;
                    }
                }
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

        const fetchReflectionMethods = useCallback(async () => {
            try {
                const url = substituteVariables(activeRequest.url, context.substitutionVariables);
                const result: Result<ProtoService[], string> = await window.electron.ipcRenderer.invoke(
                    IpcCall.GrpcReflection,
                    url,
                );
                if (result.success) {
                    const reflectionMethods: MethodDescriptor[] = [];
                    for (const service of result.value) {
                        for (const method of service.methods) {
                            reflectionMethods.push({
                                service: service.name,
                                method,
                            });
                        }
                    }
                    setRpcs(reflectionMethods);
                    setError(undefined);
                } else {
                    setRpcs([]);
                    setError(`Error fetching reflection methods: ${result.error}`);
                }
            } catch (err) {
                setRpcs([]);
                setError(`Failed to fetch reflection methods: ${err}`);
            }
        }, [activeRequest.url, context.substitutionVariables]);

        return (
            <RequestPanelRoot>
                <SelectProtosModal open={protoModalOpen} close={closeProtoModal} protoConfig={protoConfig} />
                <GrpcMethodPopover rpcs={rpcs ?? []} onSelectMethod={selectMethod} />
                <ReflectionToggle>
                    <input
                        type="checkbox"
                        checked={useReflection}
                        onChange={(e) => setUseReflection(e.target.checked)}
                    />
                    Use reflection
                </ReflectionToggle>
                {useReflection ? (
                    <ReflectionButton onClick={fetchReflectionMethods}>fetch methods via reflection</ReflectionButton>
                ) : (
                    <ProtoFileBox onClick={openProtoModal}>
                        {activeRequest.protoFile
                            ? shortProtoPath(activeRequest.protoFile.protoPath)
                            : "Select proto file..."}
                    </ProtoFileBox>
                )}
                <ProtoMethodBox
                    popovertarget="grpc-method-popover"
                    disabled={!useReflection && activeRequest.protoFile === undefined}
                >
                    {activeRequest.rpc ? activeRequest.rpc.method : "Select method..."}
                </ProtoMethodBox>
                {protoError && <ProtoErrorBox>{protoError}</ProtoErrorBox>}
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
                        extensions={[codemirrorTheme, linter, json5()]}
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
