import React, { useContext, useState } from "react";
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

export default function Directory() {
    const context = useContext(AppContext);

    const [requests, setRequests] = useState(context.requests);
    context.addRequestListListener(Directory.name, setRequests);

    const [, setActiveRequest] = useState(context.activeRequest);
    context.addActiveRequestListener(Directory.name, setActiveRequest);

    const selectRequest = (request: RequestData) => () => {
        context.setActiveRequest(request);
    };

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

    const renameRequest = (request: RequestData) => (e: React.MouseEvent) => {
        alert(`Rename ${request.name}`);
        e.stopPropagation();
    };

    const deleteRequest = (request: RequestData) => (e: React.MouseEvent) => {
        context.deleteRequest(request);
        e.stopPropagation();
    };

    return (
        <DirectoryRoot>
            <RequestContainer>
                {requests.map((r, i) => (
                    <Request
                        key={i.toString()}
                        onClick={selectRequest(r)}
                        className={classNames({ active: r === context.activeRequest })}
                    >
                        {r.type === "grpc" && (
                            <RequestMethod>
                                <ChevronsLeftRight size={16} />
                            </RequestMethod>
                        )}
                        {r.type === "http" && <RequestMethod>{r.method}</RequestMethod>}
                        {r.name}
                        {r === context.activeRequest && (
                            <RequestActions>
                                <RenameButton onClick={renameRequest(r)}>
                                    <Pencil size={16} />
                                </RenameButton>
                                <DeleteButton onClick={deleteRequest(r)}>
                                    <Trash size={16} />
                                </DeleteButton>
                            </RequestActions>
                        )}
                    </Request>
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
        </DirectoryRoot>
    );
}
