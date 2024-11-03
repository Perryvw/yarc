import type React from "react";
import { useCallback, useState } from "react";
import styled from "styled-components";
import { ChevronsLeftRight, CirclePlus, Copy, Globe, SquarePen, Trash } from "lucide-react";
import type { GrpcRequestData, HttpRequestData, RequestData } from "../../common/request-types";
import classNames from "classnames";
import { observer } from "mobx-react-lite";
import type { AppContext } from "./AppContext";
import { RenameModal, type RenameResult } from "./modals/rename";
import { runInAction } from "mobx";

const DirectoryRoot = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
`;

const RequestContainer = styled.div`
    overflow-y: auto;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    scrollbar-width: thin;
`;

const NewButton = styled.button`
    border: unset;
    background: unset;
    padding: 10px;
    display: flex;
    gap: 5px;
    align-items: center;
    cursor: pointer;
    anchor-name: --new-request-button;

    & > svg {
        flex-shrink: 0;
    }

    &:hover {
        background-color: blue;
    }
`;

const NewRequestType = styled.button`
    border: unset;
    border-bottom: 1px solid var(--color-border);
    background: unset;
    padding: 10px;
    display: flex;
    gap: 5px;
    align-items: center;
    cursor: pointer;
    display: flex;
    gap: 10px;
    align-items: center;

    &:last-child {
        border-bottom: 0;
    }

    &:hover {
        background-color: blue;
    }
`;

const NewRequestTypePopup = styled.div`
    position-anchor: --new-request-button;
    top: unset;
    left: anchor(left);
    right: anchor(right);
    bottom: anchor(top);
    margin-bottom: 10px;
    background: var(--color-background-contrast);
    border-radius: 10px;
    border: 0;
    padding: 0;
    min-width: 100px;
    display: flex;
    flex-direction: column;

    opacity: 0;
	transform: scale(0) translateY(100px);
    transform-origin: center center;
    transition:
        opacity 0.2s,
        transform 0.2s cubic-bezier(0.3, 1.5, 0.6, 1),
        display 0.2s allow-discrete;

    &:popover-open {
        opacity: 1;
        transform: scale(1) translateY(0);
    }

    @starting-style {
        &:popover-open {
            opacity: 0;
	        transform: scale(0) translateY(100px);
        }
    }
`;

const RequestName = styled.span`
    flex-grow: 1;
    overflow: hidden;
    position: relative;
    white-space: nowrap;
    mask-image: linear-gradient(270deg, #0000, #000 20px);
`;

export const Directory = observer(({ context }: { context: AppContext }) => {
    const { requests } = context;
    console.log("rendering directory");

    const [renamingRequest, renameModal] = useState<RequestData | undefined>(undefined);

    function newRequest() {
        const newRequest: HttpRequestData = {
            type: "http",
            name: "New request",
            method: "GET",
            params: [],
            headers: [],
            url: "new",
            body: "new",
        };
        context.addRequest(newRequest);
        context.setActiveRequestById(requests.length - 1);
    }

    function newRequestGrpc() {
        const newRequest: GrpcRequestData = {
            type: "grpc",
            name: "New request",
            url: "new",
        };
        context.addRequest(newRequest);
        context.setActiveRequestById(requests.length - 1);
    }

    const renameRequest = useCallback(
        (request: RequestData) => {
            renameModal(request);
        },
        [context],
    );

    function finishRename(result: RenameResult) {
        renameModal(undefined);
        runInAction(() => {
            if (!result.cancelled && context.activeRequest) {
                context.activeRequest.name = result.name;
                context.persistState();
            }
        });
    }

    const selectRequest = useCallback(
        (request: RequestData) => {
            context.setActiveRequest(request);
        },
        [context],
    );

    const deleteRequest = useCallback(
        (request: RequestData) => {
            context.deleteRequest(request);
        },
        [context],
    );

    const duplicateRequest = useCallback(
        (request: RequestData) => {
            context.duplicateRequest(request);
        },
        [context],
    );

    return (
        <DirectoryRoot>
            <RequestContainer>
                {requests.map((r, i) => (
                    <RequestEntry
                        activeRequest={context.activeRequest}
                        key={i.toString()}
                        request={r}
                        renameRequest={renameRequest}
                        selectRequest={selectRequest}
                        deleteRequest={deleteRequest}
                        duplicateRequest={duplicateRequest}
                    />
                ))}
            </RequestContainer>
            <NewRequestTypePopup id="new-request-popover" popover="auto">
                <NewRequestType onClick={newRequestGrpc}>
                    <ChevronsLeftRight />
                    <span>gRPC</span>
                </NewRequestType>
                <NewRequestType onClick={newRequest}>
                    <Globe />
                    <span>HTTP</span>
                </NewRequestType>
            </NewRequestTypePopup>
            <NewButton type="button" popovertarget="new-request-popover">
                <CirclePlus />
                New
            </NewButton>
            <RenameModal request={renamingRequest} close={finishRename} />
        </DirectoryRoot>
    );
});

const Request = styled.div`
    border: unset;
    background: unset;
    text-align: left;
    padding: 6px 10px;
    cursor: pointer;
    display: flex;
    gap: 5px;
    align-items: center;
    margin: 0 10px;
    margin-bottom: 5px;
    position: relative;
    border-radius: 10px;
    overflow: hidden;
    position: relative;
    border: 1px solid transparent;

    &:hover {
        border-color: var(--color-border);
        background-color: var(--color-background-contrast);
    }

    &.active {
        background-color: hsl(96, 46%, 37%);
        border-color: hsl(96, 46%, 37%);
    }
`;

const RequestMethod = styled.span`
    font-size: 12px;
    min-width: 30px;
`;

const RequestActions = styled.div`
    display: flex;
    gap: 5px;
    margin-left: auto;
`;

const RenameButton = styled.button`
    border: unset;
    background: unset;
    padding: 0;
    cursor: pointer;

    &:hover {
        color: blue;
    }
`;

const DuplicateButton = RenameButton;

const DeleteButton = styled(RenameButton)`
    background: unset;
    padding: 0;

    &:hover {
        color: red;
    }
`;

const RequestEntry = observer(
    ({
        activeRequest,
        request,
        renameRequest,
        selectRequest,
        deleteRequest,
        duplicateRequest,
    }: {
        activeRequest: RequestData | undefined;
        request: RequestData;
        renameRequest: (r: RequestData) => void;
        selectRequest: (r: RequestData) => void;
        deleteRequest: (r: RequestData) => void;
        duplicateRequest: (r: RequestData) => void;
    }) => {
        console.log("Rendering request entry");

        function duplicateHandler(e: React.MouseEvent) {
            duplicateRequest(request);
            e.stopPropagation();
        }

        function renameHandler(e: React.MouseEvent) {
            renameRequest(request);
            e.stopPropagation();
        }

        function deleteHandler(e: React.MouseEvent) {
            deleteRequest(request);
            e.stopPropagation();
        }

        const active = request === activeRequest;

        const selectHandler = useCallback(() => {
            selectRequest(request);
        }, [request, selectRequest]);

        return (
            <Request onClick={selectHandler} className={classNames({ active })}>
                {request.type === "grpc" && (
                    <RequestMethod>
                        <ChevronsLeftRight size={16} />
                    </RequestMethod>
                )}
                {request.type === "http" && <RequestMethod>{request.method}</RequestMethod>}
                <RequestName>{request.name}</RequestName>
                {active && (
                    <RequestActions>
                        <DuplicateButton onClick={duplicateHandler}>
                            <Copy size={16} />
                        </DuplicateButton>
                        <RenameButton onClick={renameHandler}>
                            <SquarePen size={16} />
                        </RenameButton>
                        <DeleteButton onClick={deleteHandler}>
                            <Trash size={16} />
                        </DeleteButton>
                    </RequestActions>
                )}
            </Request>
        );
    },
);
