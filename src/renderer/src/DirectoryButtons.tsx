import { ChevronsLeftRight, CirclePlus, Download, Folder, Globe, Upload } from "lucide-react";
import { observer } from "mobx-react-lite";
import styled from "styled-components";
import { v7 as uuidv7 } from "uuid";
import type { GrpcRequestData, HttpRequestData, RequestData, RequestGroup } from "../../common/request-types";
import type { AppContext } from "./AppContext";

const DirectoryButtonsContainer = styled.div`
    display: flex;
    gap: 5px;
    padding: 5px;
    padding-bottom: 10px;
`;

const Button = styled.button`
    border: unset;
    background: unset;
    padding: 10px;
    display: flex;
    gap: 5px;
    align-items: center;
    cursor: pointer;
    background-color: rgb(255 255 255 / .03);
    border-radius: 50%;

    & > svg {
        flex-shrink: 0;
    }

    &:hover {
        background-color: blue;
    }
`;

const NewButton = styled(Button)`
    anchor-name: --new-request-button;
    margin-left: auto;
    border-radius: 64px;
`;

const ExportButton = styled(Button)``;
const ImportButton = styled(Button)``;

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
    bottom: unset;
    left: anchor(left);
    right: anchor(right);
    top: anchor(bottom);
    background: var(--color-background-contrast);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    padding: 0;
    min-width: 100px;
    display: flex;
    flex-direction: column;

    opacity: 0;
	transform: scale(0) translateY(-100px);
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

export const DirectoryButtons = observer(
    ({
        context,
        importDirectory,
        exportDirectory,
    }: {
        context: AppContext;
        importDirectory: () => void;
        exportDirectory: () => void;
    }) => {
        function newRequest() {
            const newRequest: HttpRequestData = {
                type: "http",
                id: uuidv7(),
                name: "New request",
                method: "GET",
                params: [],
                headers: [],
                bodyForm: [],
                url: "",
                body: "",
                lastExecute: Date.now(),
                isExecuting: false,
                history: [],
            };
            context.addRequest(newRequest);
        }

        function newRequestGrpc() {
            const newRequest: GrpcRequestData = {
                type: "grpc",
                id: uuidv7(),
                name: "New request",
                url: "new",
                body: "{\n\t\n}",
                lastExecute: Date.now(),
                isExecuting: false,
                history: [],
            };
            context.addRequest(newRequest);
        }

        function newGroup() {
            const group: RequestGroup = {
                type: "group",
                id: uuidv7(),
                name: "Group",
                collapsed: false,
                requests: [],
            };
            context.addRequest(group);
        }

        return (
            <DirectoryButtonsContainer>
                <NewRequestTypePopup id="new-request-popover" popover="auto">
                    <NewRequestType onClick={newRequestGrpc}>
                        <ChevronsLeftRight />
                        <span>gRPC</span>
                    </NewRequestType>
                    <NewRequestType onClick={newRequest}>
                        <Globe />
                        <span>HTTP</span>
                    </NewRequestType>
                    <NewRequestType onClick={newGroup}>
                        <Folder />
                        <span>Group</span>
                    </NewRequestType>
                </NewRequestTypePopup>
                <ImportButton title="Import" onClick={importDirectory}>
                    <Download />
                </ImportButton>
                <ExportButton title="Export" onClick={exportDirectory}>
                    <Upload />
                </ExportButton>
                <NewButton type="button" popovertarget="new-request-popover">
                    <CirclePlus />
                    New
                </NewButton>
            </DirectoryButtonsContainer>
        );
    },
);
