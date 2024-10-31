import type React from "react";
import { useContext, useEffect, useRef, useState } from "react";
import { AppContext } from "./AppContext";
import styled from "styled-components";
import { ChevronsLeftRight, CirclePlus, Globe, Pencil, Trash } from "lucide-react";
import type { GrpcRequestData, HttpRequestData, RequestData } from "../../common/request-types";
import classNames from "classnames";

const DirectoryRoot = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
    padding: 0 20px;
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

export default function Directory() {
    const context = useContext(AppContext);

    const [requests, setRequests] = useState(context.requests);
    context.addRequestListListener(Directory.name, setRequests);

    const [, setActiveRequest] = useState(context.activeRequest);
    context.addActiveRequestListener(Directory.name, setActiveRequest);

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
        context.setRequestList([...requests, newRequest]);
        context.setActiveRequest(newRequest);
    }

    function newRequestGrpc() {
        const newRequest: GrpcRequestData = {
            type: "grpc",
            name: "New request",
            url: "new",
        };
        context.setRequestList([...requests, newRequest]);
        context.setActiveRequest(newRequest);
    }

    function renameRequest(request: RequestData) {
        renameModal(request);
    }

    function finishRename(result: RenameResult) {
        renameModal(undefined);
        if (!result.cancelled && context.activeRequest) {
            context.activeRequest.name = result.name;
            context.persistState();
        }
    }

    return (
        <DirectoryRoot>
            <RequestContainer>
                {requests.map((r, i) => (
                    <RequestEntry key={i.toString()} request={r} rename={renameRequest} />
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
}

type RenameResult = { cancelled: true } | { cancelled: false; name: string };
function RenameModal({
    request,
    close,
}: {
    request: RequestData | undefined;
    close: (result: RenameResult) => void;
}) {
    const ref = useRef<HTMLDialogElement>(null);

    const [newName, setNewName] = useState(request?.name ?? "");

    useEffect(() => {
        if (request !== undefined) {
            setNewName(request.name);
            ref.current?.showModal();
        } else {
            ref.current?.close();
        }
    }, [request]);

    function cancel() {
        close({ cancelled: true });
    }
    function ok() {
        if (request === undefined) cancel();
        close({ cancelled: false, name: newName });
    }

    return (
        <dialog ref={ref}>
            Rename {request?.name}:<br />
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <br />
            <button type="button" onClick={ok}>
                Ok
            </button>
            <button type="button" onClick={cancel}>
                Cancel
            </button>
        </dialog>
    );
}

const Request = styled.div`
    border: unset;
    background: unset;
    border: 1px solid transparent;
    border-bottom-color: var(--color-border);
    text-align: left;
    padding: 10px;
    cursor: pointer;
    display: flex;
    gap: 5px;
    align-items: center;

    &:hover {
        background-color: blue;
    }

    &.active {
        border-radius: 10px;
        background-color: hsl(96, 46%, 37%);
        border-color: hsla(0, 0%, 100%, 0.075);
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

const DeleteButton = styled(RenameButton)`
    background: unset;
    padding: 0;

    &:hover {
        color: red;
    }
`;

function RequestEntry({ request, rename }: { request: RequestData; rename: (r: RequestData) => void }) {
    const context = useContext(AppContext);

    function selectRequest() {
        context.setActiveRequest(request);
    }

    function renameRequest(e: React.MouseEvent) {
        rename(request);
        e.stopPropagation();
    }

    const deleteRequest = (e: React.MouseEvent) => {
        context.deleteRequest(request);
        e.stopPropagation();
    };

    return (
        <Request onClick={selectRequest} className={classNames({ active: request === context.activeRequest })}>
            {request.type === "grpc" && (
                <RequestMethod>
                    <ChevronsLeftRight size={16} />
                </RequestMethod>
            )}
            {request.type === "http" && <RequestMethod>{request.method}</RequestMethod>}
            {request.name}
            {request === context.activeRequest && (
                <RequestActions>
                    <RenameButton onClick={renameRequest}>
                        <Pencil size={16} />
                    </RenameButton>
                    <DeleteButton onClick={deleteRequest}>
                        <Trash size={16} />
                    </DeleteButton>
                </RequestActions>
            )}
        </Request>
    );
}
