import classNames from "classnames";
import { ChevronDown, ChevronsLeftRight, ChevronUp, CirclePlay, Copy, History, SquarePen, Trash } from "lucide-react";
import { runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import type React from "react";
import { Fragment, useCallback, useRef, useState } from "react";
import styled from "styled-components";
import type { RequestData, RequestDataOrGroup, RequestGroup, RequestList } from "../../common/request-types";
import type { AppContext } from "./AppContext";
import { DirectoryButtons } from "./DirectoryButtons";
import { httpVerbColorPalette } from "./HttpVerb";
import { RenameModal, type RenameResult } from "./modals/rename";

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
    position: relative;
    padding: 5px 0;
`;

const RequestHistory = styled.div`
    display: flex;
    gap: 5px;
    border-left: 2px solid blue;
    margin-left: 20px;
    margin-right: 10px;
    margin-bottom: 20px;
    flex-direction: column-reverse;
`;

const RequestHistoryButton = styled.button`
    border: 0;
    background: unset;
    text-align: left;
    cursor: pointer;
    padding: 5px 10px;
    white-space: nowrap;

    &:hover {
        background: blue;
    }
`;

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "medium",
});

export const Directory = observer(
    ({
        context,
        search,
        importDirectory,
        exportDirectory,
    }: {
        context: AppContext;
        search: string;
        importDirectory: () => void;
        exportDirectory: () => void;
    }) => {
        console.log("rendering directory");

        const [isDragging, setIsDragging] = useState(false);
        const [draggingOverRequestId, setDraggingOverRequestId] = useState<string | null>(null);
        const [showActiveRequestHistory, setShowActiveRequestHistory] = useState(false);
        const [renamingRequest, renameModal] = useState<RequestDataOrGroup | undefined>(undefined);

        const renameRequest = useCallback(
            (request: RequestDataOrGroup) => {
                renameModal(request);
            },
            [context],
        );

        function finishRename(result: RenameResult) {
            renameModal(undefined);
            runInAction(() => {
                if (!result.cancelled && result.request) {
                    result.request.name = result.name;
                    context.persistState();
                }
            });
        }

        const selectRequest = useCallback(
            (request: RequestData) => {
                setShowActiveRequestHistory(false);
                context.setActiveRequest(request);
            },
            [context],
        );

        const deleteRequest = useCallback(
            (request: RequestDataOrGroup) => {
                setShowActiveRequestHistory(false);
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

        function handleDragStart() {
            setIsDragging(true);
        }

        function handleDragEnd() {
            setIsDragging(false);
            setDraggingOverRequestId(null);
            console.log("drag end");
        }

        function handleDragEnter(request: RequestDataOrGroup) {
            setDraggingOverRequestId(request.id);
        }

        function handleDragLeave(request: RequestDataOrGroup) {
            if (draggingOverRequestId === request.id) {
                setDraggingOverRequestId(null);
            }
        }

        return (
            <DirectoryRoot>
                <DirectoryButtons
                    context={context}
                    importDirectory={importDirectory}
                    exportDirectory={exportDirectory}
                />

                <RequestContainer
                    className={classNames({
                        "is-dragging": isDragging,
                    })}
                >
                    <SortableRequests
                        requests={context.requests}
                        context={context}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        deleteRequest={deleteRequest}
                        duplicateRequest={duplicateRequest}
                        renameRequest={renameRequest}
                        selectRequest={selectRequest}
                        showActiveRequestHistory={showActiveRequestHistory}
                        setShowActiveRequestHistory={setShowActiveRequestHistory}
                        draggingOverRequestId={draggingOverRequestId}
                    />
                </RequestContainer>
                <RenameModal request={renamingRequest} close={finishRename} />
            </DirectoryRoot>
        );
    },
);

const RequestNameLine = styled.span`
    display: flex;
    gap: 5px;
    align-items: center;
`;

const RequestName = styled.span`
    display: flex;
    gap: 5px;
    align-items: center;
    flex-grow: 1;
    overflow: hidden;
    position: relative;
    white-space: nowrap;
    mask-image: linear-gradient(270deg, #0000, #000 20px);
`;

const RequestExecuting = styled.span`
    display: contents;
    color: green;

    & svg {
        flex-shrink: 0;
    }
`;

const RequestUrl = styled(RequestName)`
    font-size: 12px;
    line-height: 1;
    color: #999;
    height: 20px;
`;

const RequestActions = styled.div`
    display: flex;
    gap: 15px;
    height: 20px;
`;

const RequestGroupRoot = styled.div`
    border: 1px solid transparent;
    border-radius: 10px;
    border-left: 1px solid red;
    padding: 6px 4px;
    margin-left: 6px;

    &.is-drag-over-group {
        border: 1px dashed blue;
    }

    & > ${RequestNameLine},
    & > ${RequestActions} {
        padding: 0 10px;
    }
`;

const Request = styled.div`
    --method-color: #FFF;
    background: unset;
    text-align: left;
    padding: 6px 14px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    margin: 0 6px;
    margin-bottom: 5px;
    position: relative;
    border-radius: 10px;
    position: relative;
    border: 1px solid transparent;
    flex-shrink: 0;
    position: relative;

    transform: translate(0, 0); // TODO: This is a fix for rounded corners while dragging

    // TODO: This an unhinged selector, find a better way to do this
    .is-dragging & * {
        pointer-events: none;
    }

    &.active,
    &:hover {
        border-color: var(--color-border);
        background-color: var(--color-background-contrast);
    }

    &.active ${RequestName} {
        color: var(--method-color);
    }

    &:before {
        position: absolute;
        content: "";
        width: 3px;
        height: 60%;
        background-color: var(--method-color);
        left: 0;
        top: 20%;
        border-radius: 12px;
        opacity: 0;
        transition: opacity .4s;
    }

    &.active:before {
        opacity: 1;
    }

    &.is-drag-over:after {
        content: "";
        position: absolute;
        top: -5px;
        left: 0;
        right: 0;
        height: 2px;
        background-color: blue;
        border-radius: 10px;
        pointer-events: none;
    }
`;

const RequestMethod = styled.span`
    display: flex;
    color: var(--method-color);
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
    &:hover {
        color: red;
    }
`;

const HistoryButton = styled(RenameButton)`
    display: flex;
    align-items: center;
    gap: 2px;
    margin-left: auto;
`;

const RequestEntry = observer(
    ({
        context,
        active,
        isDragOver,
        request,
        onDragStart,
        onDragEnd,
        onDragEnter,
        onDragLeave,
        renameRequest,
        selectRequest,
        deleteRequest,
        duplicateRequest,
        showActiveRequestHistory,
        setShowActiveRequestHistory,
    }: {
        context: AppContext;
        active: boolean;
        isDragOver: boolean;
        request: RequestData;
        onDragStart: () => void;
        onDragEnd: () => void;
        onDragEnter: (r: RequestData) => void;
        onDragLeave: (r: RequestData) => void;
        renameRequest: (r: RequestData) => void;
        selectRequest: (r: RequestData) => void;
        deleteRequest: (r: RequestData) => void;
        duplicateRequest: (r: RequestData) => void;

        showActiveRequestHistory: boolean;
        setShowActiveRequestHistory: (v: boolean) => void;
    }) => {
        console.log("Rendering request entry");

        function getCleanerRequestUrl() {
            let url = request.url;
            const protocol = url.indexOf("://");

            if (protocol > -1) {
                url = url.substring(protocol + 3);
            }

            return url;
        }

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

        function showHistoryHandler(e: React.MouseEvent) {
            setShowActiveRequestHistory(!showActiveRequestHistory);
            e.stopPropagation();
        }

        const selectHandler = useCallback(() => {
            selectRequest(request);
        }, [request, selectRequest]);

        const handleDragStart = (e: React.DragEvent) => {
            e.dataTransfer.setData("yarc/drag", request.id);
            //e.dataTransfer.setDragImage(e.target, 0, 0);
            e.dataTransfer.effectAllowed = "move";

            console.log("dragging", request.id);

            onDragStart();
        };

        const handleDragEnd = (e: React.DragEvent) => {
            onDragEnd();
        };

        const handleDragEnter = (e: React.DragEvent) => {
            e.preventDefault();
            onDragEnter(request);
        };

        const handleDragOver = (e: React.DragEvent) => {
            e.preventDefault();
        };

        const handleDragLeave = (e: React.DragEvent) => {
            onDragLeave(request);
        };

        const handleDrop = (e: React.DragEvent) => {
            const movedRequestId = e.dataTransfer.getData("yarc/drag");

            if (!movedRequestId) {
                return;
            }

            console.log("dropped", movedRequestId, "on", request.id);

            context.moveRequest(movedRequestId, request.id);

            onDragEnd(); // Moving the request element causes dropend event to not fire
        };

        return (
            <Request
                onClick={selectHandler}
                className={classNames({ active, "is-drag-over": isDragOver })}
                style={
                    {
                        "--method-color": request.type === "http" && httpVerbColorPalette[request.method],
                    } as React.CSSProperties
                }
                draggable="true"
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <RequestNameLine>
                    <RequestName>
                        {request.type === "grpc" && (
                            <RequestMethod>
                                <ChevronsLeftRight size={16} />
                            </RequestMethod>
                        )}
                        {request.type === "http" && <RequestMethod>{request.method}</RequestMethod>} {request.name}
                    </RequestName>
                    {!active && request.isExecuting && (
                        <RequestExecuting>
                            <CirclePlay size={24} />
                        </RequestExecuting>
                    )}
                </RequestNameLine>
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
                        {request.history.length > 0 && (
                            <HistoryButton onClick={showHistoryHandler}>
                                <History size={16} />
                                History
                            </HistoryButton>
                        )}
                    </RequestActions>
                )}
                {!active && <RequestUrl>{getCleanerRequestUrl() || "No URL"}</RequestUrl>}
            </Request>
        );
    },
);

const RequestGroupEntry = observer(
    ({
        active,
        isDragOver,
        context,
        request,
        onDragStart,
        onDragEnd,
        onDragEnter,
        onDragLeave,
        renameRequest,
        selectRequest,
        deleteRequest,
        duplicateRequest,
        showActiveRequestHistory,
        setShowActiveRequestHistory,
        draggingOverRequestId,
    }: {
        active: boolean;
        isDragOver: boolean;
        context: AppContext;
        request: RequestGroup;
        onDragStart: () => void;
        onDragEnd: () => void;
        onDragEnter: (r: RequestDataOrGroup) => void;
        onDragLeave: (r: RequestDataOrGroup) => void;
        renameRequest: (r: RequestDataOrGroup) => void;
        selectRequest: (r: RequestData) => void;
        deleteRequest: (r: RequestDataOrGroup) => void;
        duplicateRequest: (r: RequestData) => void;

        showActiveRequestHistory: boolean;
        setShowActiveRequestHistory: (v: boolean) => void;
        draggingOverRequestId: string | null;
    }) => {
        console.log("Rendering request group entry");

        function renameHandler(e: React.MouseEvent) {
            renameRequest(request);
            e.stopPropagation();
        }

        function deleteHandler(e: React.MouseEvent) {
            deleteRequest(request);
            e.stopPropagation();
        }

        const handleNameClick = useCallback(() => {
            request.collapsed = !request.collapsed;
        }, [request]);

        const handleDragStart = (e: React.DragEvent) => {
            e.dataTransfer.setData("yarc/drag", request.id);
            //e.dataTransfer.setDragImage(e.target, 0, 0);
            e.dataTransfer.effectAllowed = "move";

            console.log("dragging group", request.id);

            onDragStart();
        };

        const handleDragEnd = (e: React.DragEvent) => {
            onDragEnd();
        };

        const handleDragEnter = (e: React.DragEvent) => {
            e.preventDefault();
            onDragEnter(request);
        };

        const handleDragOver = (e: React.DragEvent) => {
            e.preventDefault();
        };

        const handleDragLeave = (e: React.DragEvent) => {
            onDragLeave(request);
        };

        const handleDrop = (e: React.DragEvent) => {
            const movedRequestId = e.dataTransfer.getData("yarc/drag");

            if (!movedRequestId) {
                return;
            }

            console.log("dropped", movedRequestId, "on group", request.id);

            context.moveRequest(movedRequestId, request.id);

            onDragEnd(); // Moving the request element causes dropend event to not fire
        };

        return (
            <RequestGroupRoot className={classNames({ active, "is-drag-over-group": isDragOver })}>
                <RequestNameLine
                    onClick={handleNameClick}
                    draggable="true"
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    {!request.collapsed && <ChevronDown size={20} />}
                    {request.collapsed && <ChevronUp size={20} />}
                    <RequestName>{request.name}</RequestName>
                </RequestNameLine>

                {!request.collapsed && (
                    <RequestActions>
                        <RenameButton onClick={renameHandler}>
                            <SquarePen size={16} />
                        </RenameButton>
                        <DeleteButton onClick={deleteHandler}>
                            <Trash size={16} />
                        </DeleteButton>
                    </RequestActions>
                )}

                {!request.collapsed && (
                    <SortableRequests
                        requests={request.requests}
                        context={context}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                        onDragEnter={onDragEnter}
                        onDragLeave={onDragLeave}
                        deleteRequest={deleteRequest}
                        duplicateRequest={duplicateRequest}
                        renameRequest={renameRequest}
                        selectRequest={selectRequest}
                        showActiveRequestHistory={showActiveRequestHistory}
                        setShowActiveRequestHistory={setShowActiveRequestHistory}
                        draggingOverRequestId={draggingOverRequestId}
                    />
                )}
            </RequestGroupRoot>
        );
    },
);

const SortableRequests = observer(
    ({
        requests,
        context,
        onDragStart,
        onDragEnd,
        onDragEnter,
        onDragLeave,
        renameRequest,
        selectRequest,
        deleteRequest,
        duplicateRequest,
        showActiveRequestHistory,
        setShowActiveRequestHistory,
        draggingOverRequestId,
    }: {
        requests: RequestList;
        context: AppContext;
        onDragStart: () => void;
        onDragEnd: () => void;
        onDragEnter: (r: RequestDataOrGroup) => void;
        onDragLeave: (r: RequestDataOrGroup) => void;
        renameRequest: (r: RequestDataOrGroup) => void;
        selectRequest: (r: RequestData) => void;
        deleteRequest: (r: RequestDataOrGroup) => void;
        duplicateRequest: (r: RequestData) => void;

        showActiveRequestHistory: boolean;
        setShowActiveRequestHistory: (v: boolean) => void;
        draggingOverRequestId: string | null;
    }) => {
        // function getFilteredRequests() {
        //     if (search) {
        //         const str = search.toUpperCase();

        //         return requests.filter(
        //             (r) =>
        //                 r.type !== "group" && (r.name.toUpperCase().includes(str) || r.url.toUpperCase().includes(str)),
        //         );
        //     }

        //     return requests;
        // }

        function restoreOldRequestFromHistory(request: RequestData) {
            context.restoreRequestData(request);
        }

        function getRequestDiff(newRequest: RequestData, oldRequest: RequestData) {
            const diff = [];

            if (newRequest.type === "http" && oldRequest.type === "http") {
                if (newRequest.response) {
                    diff.push(newRequest.response.statusCode);
                }

                if (newRequest.method !== oldRequest.method) {
                    diff.push(`${oldRequest.method} » ${newRequest.method}`);
                }

                if (newRequest.url !== oldRequest.url) {
                    diff.push("url");
                }

                if (newRequest.body !== oldRequest.body) {
                    diff.push("body");
                }

                /*
                if (newRequest.bodyForm !== oldRequest.bodyForm) {
                    diff.push("body");
                }

                if (newRequest.params !== oldRequest.params) {
                    diff.push("params");
                }

                if (newRequest.headers !== oldRequest.headers) {
                    diff.push("headers");
                }
                */
            }

            if (diff.length === 0) {
                return "";
            }

            return diff.join(", ");
        }

        return (
            <>
                {requests.map((r) => (
                    <Fragment key={r.id}>
                        {r.type === "group" ? (
                            <RequestGroupEntry
                                active={false}
                                isDragOver={r.id === draggingOverRequestId}
                                request={r}
                                context={context}
                                onDragStart={onDragStart}
                                onDragEnd={onDragEnd}
                                onDragEnter={onDragEnter}
                                onDragLeave={onDragLeave}
                                renameRequest={renameRequest}
                                selectRequest={selectRequest}
                                deleteRequest={deleteRequest}
                                duplicateRequest={duplicateRequest}
                                showActiveRequestHistory={showActiveRequestHistory}
                                setShowActiveRequestHistory={setShowActiveRequestHistory}
                                draggingOverRequestId={draggingOverRequestId}
                            />
                        ) : (
                            <>
                                <RequestEntry
                                    context={context}
                                    active={r === context.activeRequest}
                                    isDragOver={r.id === draggingOverRequestId}
                                    request={r}
                                    onDragStart={onDragStart}
                                    onDragEnd={onDragEnd}
                                    onDragEnter={onDragEnter}
                                    onDragLeave={onDragLeave}
                                    renameRequest={renameRequest}
                                    selectRequest={selectRequest}
                                    deleteRequest={deleteRequest}
                                    duplicateRequest={duplicateRequest}
                                    showActiveRequestHistory={showActiveRequestHistory}
                                    setShowActiveRequestHistory={setShowActiveRequestHistory}
                                />
                                {showActiveRequestHistory && context.activeRequest === r && (
                                    <RequestHistory>
                                        {r.history.map((oldRequest, i) => (
                                            <RequestHistoryButton
                                                type="button"
                                                key={i.toString()}
                                                onClick={() => restoreOldRequestFromHistory(oldRequest)}
                                            >
                                                <RequestName>
                                                    {dateFormatter.format(oldRequest.lastExecute)}
                                                </RequestName>
                                                {i > 0 && (
                                                    <RequestUrl>
                                                        {getRequestDiff(oldRequest, r.history[i - 1])}
                                                    </RequestUrl>
                                                )}
                                            </RequestHistoryButton>
                                        ))}
                                    </RequestHistory>
                                )}
                            </>
                        )}
                    </Fragment>
                ))}
            </>
        );
    },
);
