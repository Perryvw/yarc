import { ArrowBigRight, RefreshCcw, Trash } from "lucide-react";
import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useRef } from "react";
import styled from "styled-components";
import type { ProtoFileDescriptor, ProtoRoot } from "../../../common/grpc";
import { type BrowseProtoResult, IpcCall } from "../../../common/ipc";
import type { ProtoConfig } from "../AppContext";

const SelectProtosDialog = styled.dialog`
    width: 95%;
    height: 95%;
    border: solid 1px grey;
    border-radius: 10px;
`;

const ProtoRootsContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 350px;
`;

const ProtoTreeContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 350px;
    flex-grow: 1;
`;

const ProtoRootsList = styled.div`
    flex-grow: 1;
    border: solid 1px white;
`;

const AddRootButton = styled.button`
    cursor: pointer;
`;

const ProtoEntry = styled.div`
    padding: 5px 10px;
    border-style: solid;
    border-width: 0px 0px 1px 0px;
    border-color: grey;

    &:hover {
        background-color: blue;
    }
`;

const Actions = styled.div`
    display: flex;
    gap: 5px;
    margin-left: auto;
`;

const RefreshButton = styled.button`
    border: unset;
    background: unset;
    padding: 0;
    cursor: pointer;

    &:hover {
        color: green;
    }
`;

const DeleteButton = styled(RefreshButton)`
    background: unset;
    padding: 0;

    &:hover {
        color: red;
    }
`;

const ProtoTree = styled.div`
    border: solid 1px white;
    flex-grow: 1;
    overflow: scroll;
`;

const ProtoTreeEntry = styled.div`
`;

const ProtoTreeEntryHeader = styled.div`
    padding: 10px;
    background-color: grey;
`;

const ProtoTreeEntryNoFile = styled.div`
    white-space: nowrap;
    padding: 3px 10px 3px 30px;
    border-style: solid;
    border-color: grey;
    border-width: 0px 0px 1px 0px;
`;

const ProtoTreeEntryFile = styled.div`
    white-space: nowrap;
    padding: 3px 10px 3px 30px;
    border-style: solid;
    border-color: grey;
    border-width: 0px 0px 1px 0px;

    cursor: pointer;

    &:hover {
        background-color: blue;
    }
`;

const SelectProtoButton = styled.div`
    background-color: green;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    float: right;
`;

export type SelectProtoModalResult = Cancellable<ProtoFileDescriptor>;

export const SelectProtosModal = observer(
    ({
        open,
        close,
        protoConfig,
    }: {
        open: boolean;
        close: (result: SelectProtoModalResult) => void;
        protoConfig: ProtoConfig;
    }) => {
        const ref = useRef<HTMLDialogElement>(null);

        useEffect(() => {
            if (open) {
                ref.current?.showModal();
            } else {
                ref.current?.close();
            }
        }, [open]);

        const addRoot = useCallback(async () => {
            const result: BrowseProtoResult = await window.electron.ipcRenderer.invoke(IpcCall.BrowseProtoDirectory);
            if (!result.cancelled) {
                protoConfig.addProtoRoot(result.result, true);
            }
        }, [protoConfig]);

        const deleteRoot = useCallback(
            async (root: ProtoRoot) => {
                protoConfig.deleteProtoRoot(root);
            },
            [protoConfig],
        );

        return (
            <SelectProtosDialog ref={ref} onClose={() => close({ cancelled: true })}>
                <div style={{ display: "flex", height: "calc(100% - 30px)" }}>
                    <ProtoRootsContainer>
                        Proto roots
                        <ProtoRootsList>
                            {protoConfig.roots.map((root, i) => (
                                <ProtoRootEntry key={i.toString()} root={root} deleteRequest={deleteRoot} />
                            ))}
                        </ProtoRootsList>
                        <AddRootButton type="button" onClick={addRoot}>
                            Add root...
                        </AddRootButton>
                    </ProtoRootsContainer>
                    <ProtoTreeContainer>
                        Select proto file:
                        <ProtoTree>
                            {protoConfig.roots.map((root, i) => (
                                <ProtoTreeEntry key={i.toString()}>
                                    <ProtoTreeEntryHeader>{root.rootPath}</ProtoTreeEntryHeader>
                                    {root.protoFiles.length === 0 ? (
                                        <ProtoTreeEntryNoFile>No proto files found</ProtoTreeEntryNoFile>
                                    ) : (
                                        root.protoFiles.map((f, j) => (
                                            <ProtoTreeEntryFile
                                                key={j.toString()}
                                                onClick={() =>
                                                    close({
                                                        cancelled: false,
                                                        result: {
                                                            protoPath: f,
                                                            rootPath: root.rootPath,
                                                        },
                                                    })
                                                }
                                            >
                                                {f}
                                                <SelectProtoButton>
                                                    <ArrowBigRight />
                                                </SelectProtoButton>
                                            </ProtoTreeEntryFile>
                                        ))
                                    )}
                                </ProtoTreeEntry>
                            ))}
                        </ProtoTree>
                    </ProtoTreeContainer>
                </div>
                <button type="button" onClick={() => close({ cancelled: true })}>
                    Close
                </button>
            </SelectProtosDialog>
        );
    },
);

const ProtoRootEntry = observer(
    ({ root, deleteRequest }: { root: ProtoRoot; deleteRequest: (root: ProtoRoot) => void }) => {
        return (
            <ProtoEntry>
                {root.rootPath}
                <Actions>
                    <RefreshButton>
                        <RefreshCcw size={16} />
                    </RefreshButton>
                    <DeleteButton onClick={() => deleteRequest(root)}>
                        <Trash size={16} />
                    </DeleteButton>
                </Actions>
            </ProtoEntry>
        );
    },
);
