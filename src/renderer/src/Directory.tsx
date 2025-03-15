import classNames from "classnames";
import {
    Check,
    ChevronDown,
    ChevronRight,
    ChevronsDown,
    ChevronsDownUp,
    ChevronsLeftRight,
    ChevronsUp,
    CirclePlay,
    Copy,
    Folder,
    FolderOpen,
    FolderX,
    History,
    SquarePen,
    Trash,
    Undo,
    X,
} from "lucide-react";
import { runInAction, toJS } from "mobx";
import { observer } from "mobx-react-lite";
import type React from "react";
import { type ChangeEvent, Fragment, useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import {
    GrpcRequestKind,
    type RequestId,
    type RequestData,
    type RequestDataOrGroup,
    type RequestGroup,
    type RequestList,
} from "../../common/request-types";
import type { AppContext } from "./AppContext";
import { DirectoryButtons } from "./DirectoryButtons";
import { backgroundHoverColor, httpVerbColorPalette } from "./palette";
import { getSubstitutionResult, substituteVariables } from "./util/substitute-variables";

const DirectoryRoot = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
`;

const RequestContainer = styled.div`
    overflow-y: auto;
    scrollbar-gutter: stable;
    scrollbar-color: var(--color-border) var(--color-background);
    scrollbar-width: thin;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
    padding: 5px 6px;
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

const DeletedRequestAlert = styled.div`
    background: ${backgroundHoverColor};
    padding: 10px;

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
        const [showActiveRequestHistory, setShowActiveRequestHistory] = useState(false);

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

        function getFilteredRequests(requests = context.requests) {
            if (!search) {
                return requests;
            }

            const str = search.toUpperCase();
            return getFilteredRequestsInner(str, context.requests);
        }

        function getFilteredRequestsInner(str: string, requests: RequestList) {
            const results: RequestList = [];

            for (const request of requests) {
                if (request.type === "group") {
                    results.push(...getFilteredRequestsInner(str, request.requests));
                } else if (request.name.toUpperCase().includes(str) || request.url.toUpperCase().includes(str)) {
                    results.push(request);
                }
            }

            return results;
        }

        function onPerformUndo(e: React.MouseEvent) {
            e.stopPropagation();

            runInAction(() => {
                context.restoreDeletedRequest();
            });
        }

        function onForgetUndo(e: React.MouseEvent) {
            e.stopPropagation();

            runInAction(() => {
                context.lastDeletedRequestForUndo = undefined;
            });
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
                        "is-dragging": context.isDragging,
                    })}
                >
                    <SortableRequests
                        depth={1}
                        requests={getFilteredRequests()}
                        context={context}
                        deleteRequest={deleteRequest}
                        duplicateRequest={duplicateRequest}
                        selectRequest={selectRequest}
                        showActiveRequestHistory={showActiveRequestHistory}
                        setShowActiveRequestHistory={setShowActiveRequestHistory}
                    />
                </RequestContainer>
                {context.lastDeletedRequestForUndo !== undefined && (
                    <DeletedRequestAlert>
                        <RequestNameLine>
                            <RequestName>
                                Deleted <b>{context.lastDeletedRequestForUndo.request.name}</b>
                            </RequestName>
                            <RequestActions>
                                <RenameButton onClick={onPerformUndo}>
                                    <Undo size={16} />
                                </RenameButton>
                                <DeleteButton onClick={onForgetUndo}>
                                    <X size={16} />
                                </DeleteButton>
                            </RequestActions>
                        </RequestNameLine>
                    </DeletedRequestAlert>
                )}
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
    gap: 0px;
`;

const RequestActions = styled.div`
    display: flex;
    align-items: center;
    gap: 15px;
    height: 20px;
`;

const DraggableLine = styled.div`
    position: relative;

    &.is-drag-over-above,
    &.is-drag-over-below {
        z-index: 2;
    }

    &.is-drag-over-above:after,
    &.is-drag-over-below:after {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        height: 2px;
        background-color: blue;
        border-radius: 10px;
        pointer-events: none;
    }

    &.is-drag-over-above:after {
        top: -3px;
    }

    &.is-drag-over-below:after {
        bottom: -3px;
    }
`;

const RequestGroupDraggableLine = styled(DraggableLine)`
    height: 3px;
`;

const Request = styled(DraggableLine)`
    --method-color: #FFF;
    background: unset;
    text-align: left;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    position: relative;
    border-radius: 10px;
    flex-shrink: 0;

    // :GroupMargins
    border: 1px solid transparent;
    padding: 6px 16px;

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
`;

const RequestGroupArrow = styled.span`
    display: flex;
    color: var(--method-color);
    width: 16px;
    justify-content: flex-end;
    flex-shrink: 0;
`;

const RequestGroupRoot = styled.div`
    & > ${RequestNameLine} {
        border: 1px solid transparent;
        background: var(--color-background);
        position: sticky;
        top: -5px; // padding on the scrollable container
        z-index: 1;
        padding: 6px 6px;
        padding-left: calc(21px * (var(--group-depth) - 1)); // :GroupMargins
        border-radius: 10px;
        cursor: pointer;

        &:hover {
            border-color: var(--color-border);
            background-color: var(--color-background-contrast);
        }

        & > ${RequestActions} {
            opacity: .3;
            gap: 5px;
        }

        &:hover > ${RequestActions} {
            opacity: 1;
        }
    }

    &.is-renaming > ${RequestNameLine} {
        border-style: dashed;
        border-color: blue;
        background-color: var(--color-background-contrast);

        & > ${RequestActions} {
            opacity: 1;
        }
    }

    &.is-drag-over-group > ${RequestNameLine} {
        border: 1px dashed blue;
    }

    .is-dragging & > ${RequestNameLine} * {
        pointer-events: none;
    }
`;

const RequestGroupInner = styled.div`
    & > ${Request} {
        padding-left: calc(16px + 21px * var(--group-depth)); // :GroupMargins
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

const InlineUrl = styled.span`
    margin-right: 7px;
`;

const ReplacedUrlPart = styled.span`
    color: #7bb8d1;
`;

const RequestEntry = observer(
    ({
        context,
        active,
        isDragOver,
        request,
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
        selectRequest: (r: RequestData) => void;
        deleteRequest: (r: RequestData) => void;
        duplicateRequest: (r: RequestData) => void;

        showActiveRequestHistory: boolean;
        setShowActiveRequestHistory: (v: boolean) => void;
    }) => {
        const [isRenaming, setIsRenaming] = useState(false);

        function getCleanerRequestUrl() {
            const parts = getSubstitutionResult(request.url, context.substitutionVariables);
            if (parts.length === 0) {
                return undefined;
            }

            const protocol = parts[0].value.indexOf("://");
            if (protocol > -1) {
                parts[0].value = parts[0].value.substring(protocol + 3);
            }

            const urlParts = parts.map((p, i) =>
                p.isReplaced ? <ReplacedUrlPart key={i.toString()}>{p.value}</ReplacedUrlPart> : p.value,
            );

            if (request.type === "grpc" && request.rpc) {
                return (
                    <>
                        <InlineUrl>{urlParts}</InlineUrl> {request.rpc.service} / {request.rpc.method}
                    </>
                );
            }

            return urlParts;
        }

        function duplicateHandler(e: React.MouseEvent) {
            duplicateRequest(request);
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
            e.dataTransfer.effectAllowed = "move";

            const rect = e.currentTarget.getBoundingClientRect();
            runInAction(() => {
                context.draggingStartClientY = rect.bottom;
                context.isDragging = true;
            });
        };

        const handleDragEnd = (e: React.DragEvent) => {
            runInAction(() => {
                context.isDragging = false;
                context.draggingOverRequestId = null;
            });
        };

        const handleDragEnter = (e: React.DragEvent) => {
            e.preventDefault();

            const rect = e.currentTarget.getBoundingClientRect();
            runInAction(() => {
                context.draggingInsertPosition = context.draggingStartClientY > rect.bottom ? "above" : "below";
                context.draggingOverRequestId = request.id;
            });
        };

        const handleDragOver = (e: React.DragEvent) => {
            e.preventDefault();
        };

        const handleDragLeave = (e: React.DragEvent) => {
            runInAction(() => {
                if (context.draggingOverRequestId === request.id) {
                    context.draggingOverRequestId = null;
                }
            });
        };

        const handleDrop = (e: React.DragEvent) => {
            const movedRequestId = e.dataTransfer.getData("yarc/drag") as RequestId;

            if (!movedRequestId) {
                return;
            }

            context.moveRequest(movedRequestId, request.id);

            // Moving the request element causes dropend event to not fire
            runInAction(() => {
                if (context.draggingOverRequestId === request.id) {
                    context.draggingOverRequestId = null;
                }
            });
        };

        function finishRename() {
            setIsRenaming(false);
            context.persistState();
        }

        function onRenameStart(e: React.MouseEvent) {
            e.stopPropagation();
            setIsRenaming(true);
        }

        function onRenameSave(e: React.MouseEvent) {
            e.stopPropagation();
            finishRename();
        }

        return (
            <Request
                onClick={selectHandler}
                className={classNames({
                    active,
                    "is-drag-over-above": isDragOver && context.draggingInsertPosition === "above",
                    "is-drag-over-below": isDragOver && context.draggingInsertPosition === "below",
                })}
                style={
                    {
                        "--method-color": request.type === "http" && httpVerbColorPalette[request.method],
                    } as React.CSSProperties
                }
                draggable={!isRenaming}
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
                                {request.kind === GrpcRequestKind.Unary && (
                                    <ChevronsLeftRight style={{ color: httpVerbColorPalette.GET }} size={16} />
                                )}
                                {request.kind === GrpcRequestKind.RequestStreaming && (
                                    <ChevronsUp style={{ color: httpVerbColorPalette.PUT }} size={16} />
                                )}
                                {request.kind === GrpcRequestKind.ResponseStreaming && (
                                    <ChevronsDown style={{ color: httpVerbColorPalette.POST }} size={16} />
                                )}
                                {request.kind === GrpcRequestKind.Bidirectional && (
                                    <ChevronsDownUp style={{ color: httpVerbColorPalette.PATCH }} size={16} />
                                )}
                                {request.kind === undefined && <ChevronsLeftRight size={16} />}
                            </RequestMethod>
                        )}
                        {request.type === "http" && <RequestMethod>{request.method}</RequestMethod>}
                        {isRenaming ? (
                            <RenameInput request={request} finishRename={finishRename} />
                        ) : request.name.length > 0 ? (
                            request.name
                        ) : (
                            <i>unnamed</i>
                        )}
                    </RequestName>
                    {!active && request.isExecuting && (
                        <RequestExecuting>
                            <CirclePlay size={24} />
                        </RequestExecuting>
                    )}
                </RequestNameLine>
                {active && (
                    <RequestActions>
                        {isRenaming ? (
                            <RenameButton onClick={onRenameSave}>
                                <Check size={16} />
                            </RenameButton>
                        ) : (
                            <RenameButton onClick={onRenameStart}>
                                <SquarePen size={16} />
                            </RenameButton>
                        )}

                        <DuplicateButton onClick={duplicateHandler}>
                            <Copy size={16} />
                        </DuplicateButton>
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

const RenameInputTextual = styled.input`
    all: unset;
    min-width: 0;
    flex-grow: 1;
    cursor: text;
`;

export const RenameInput = observer(
    ({
        request,
        finishRename,
    }: {
        request: RequestDataOrGroup;
        finishRename: () => void;
    }) => {
        const renameInputRef = useRef<HTMLInputElement>(null);

        useEffect(() => {
            renameInputRef.current?.focus();
        }, []);

        function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
            if (e.key === "Enter" || e.key === "Escape") {
                e.preventDefault();
                finishRename();
            }
        }

        function onInputClick(e: React.MouseEvent) {
            e.stopPropagation();
        }

        function onNameChange(event: ChangeEvent<HTMLInputElement>) {
            runInAction(() => {
                request.name = event.target.value;
            });
        }

        return (
            <RenameInputTextual
                type="text"
                placeholder="unnamed"
                ref={renameInputRef}
                value={request.name}
                onClick={onInputClick}
                onChange={onNameChange}
                onKeyDown={onKeyDown}
            />
        );
    },
);

const RequestGroupEntry = observer(
    ({
        depth,
        isDragOver,
        context,
        request,
        selectRequest,
        deleteRequest,
        duplicateRequest,
        showActiveRequestHistory,
        setShowActiveRequestHistory,
    }: {
        depth: number;
        isDragOver: boolean;
        context: AppContext;
        request: RequestGroup;
        selectRequest: (r: RequestData) => void;
        deleteRequest: (r: RequestDataOrGroup) => void;
        duplicateRequest: (r: RequestData) => void;

        showActiveRequestHistory: boolean;
        setShowActiveRequestHistory: (v: boolean) => void;
    }) => {
        const [isRenaming, setIsRenaming] = useState(false);

        function deleteHandler(e: React.MouseEvent) {
            deleteRequest(request);
            e.stopPropagation();
        }

        function handleNameClick(e: React.MouseEvent) {
            e.preventDefault();

            runInAction(() => {
                request.collapsed = !request.collapsed;
            });
        }

        const handleDragStart = (e: React.DragEvent) => {
            e.dataTransfer.setData("yarc/drag", request.id);
            e.dataTransfer.effectAllowed = "move";

            const rect = e.currentTarget.getBoundingClientRect();
            runInAction(() => {
                context.draggingStartClientY = rect.bottom;
                context.isDragging = true;
            });
        };

        const handleDragEnd = (e: React.DragEvent) => {
            runInAction(() => {
                context.isDragging = false;
                context.draggingOverRequestId = null;
            });
        };

        const handleDragEnter = (e: React.DragEvent) => {
            e.preventDefault();

            runInAction(() => {
                context.draggingInsertPosition = "group";
                context.draggingOverRequestId = request.id;
            });
        };

        const handleDragEnterAbove = (e: React.DragEvent) => {
            e.preventDefault();

            runInAction(() => {
                context.draggingInsertPosition = "above";
                context.draggingOverRequestId = request.id;
            });
        };

        const handleDragOver = (e: React.DragEvent) => {
            e.preventDefault();
        };

        const handleDragLeave = (e: React.DragEvent) => {
            /* TODO: When entering the "drag above" in this group, it will incorrectly set to null
            runInAction(() => {
                if (context.draggingOverRequestId === request.id) {
                    context.draggingOverRequestId = null;
                }
            });
            */
        };

        const handleDrop = (e: React.DragEvent) => {
            const movedRequestId = e.dataTransfer.getData("yarc/drag") as RequestId;

            if (!movedRequestId) {
                return;
            }

            context.moveRequest(movedRequestId, request.id);

            // Moving the request element causes dropend event to not fire
            runInAction(() => {
                if (context.draggingOverRequestId === request.id) {
                    context.draggingOverRequestId = null;
                }
            });
        };

        function finishRename() {
            setIsRenaming(false);
            context.persistState();
        }

        function onRenameStart(e: React.MouseEvent) {
            e.stopPropagation();
            setIsRenaming(true);
        }

        function onRenameSave(e: React.MouseEvent) {
            e.stopPropagation();
            finishRename();
        }

        return (
            <RequestGroupRoot
                className={classNames({
                    "is-drag-over-group": isDragOver && context.draggingInsertPosition === "group",
                    "is-renaming": isRenaming,
                })}
                style={
                    {
                        "--group-depth": depth,
                    } as React.CSSProperties
                }
            >
                <RequestGroupDraggableLine
                    className={classNames({
                        "is-drag-over-above": isDragOver && context.draggingInsertPosition === "above",
                    })}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragEnter={handleDragEnterAbove}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                />
                <RequestNameLine
                    onClick={handleNameClick}
                    draggable={!isRenaming}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <RequestName>
                        <RequestMethod>
                            <RequestGroupArrow>
                                {request.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                            </RequestGroupArrow>
                            {request.collapsed ? (
                                request.requests.length > 0 ? (
                                    <Folder size={16} />
                                ) : (
                                    <FolderX size={16} />
                                )
                            ) : (
                                <FolderOpen size={16} />
                            )}
                        </RequestMethod>
                        {isRenaming ? (
                            <RenameInput request={request} finishRename={finishRename} />
                        ) : request.name.length > 0 ? (
                            request.name
                        ) : (
                            <i>unnamed</i>
                        )}
                    </RequestName>
                    {!request.collapsed && (
                        <RequestActions>
                            {isRenaming ? (
                                <RenameButton onClick={onRenameSave}>
                                    <Check size={16} />
                                </RenameButton>
                            ) : (
                                <RenameButton onClick={onRenameStart}>
                                    <SquarePen size={16} />
                                </RenameButton>
                            )}
                            <DeleteButton onClick={deleteHandler}>
                                <Trash size={16} />
                            </DeleteButton>
                        </RequestActions>
                    )}
                </RequestNameLine>
                {!request.collapsed && (
                    <RequestGroupInner>
                        <SortableRequests
                            depth={depth + 1}
                            requests={request.requests}
                            context={context}
                            deleteRequest={deleteRequest}
                            duplicateRequest={duplicateRequest}
                            selectRequest={selectRequest}
                            showActiveRequestHistory={showActiveRequestHistory}
                            setShowActiveRequestHistory={setShowActiveRequestHistory}
                        />
                    </RequestGroupInner>
                )}
            </RequestGroupRoot>
        );
    },
);

const SortableRequests = observer(
    ({
        depth,
        requests,
        context,
        selectRequest,
        deleteRequest,
        duplicateRequest,
        showActiveRequestHistory,
        setShowActiveRequestHistory,
    }: {
        depth: number;
        requests: RequestList;
        context: AppContext;
        selectRequest: (r: RequestData) => void;
        deleteRequest: (r: RequestDataOrGroup) => void;
        duplicateRequest: (r: RequestData) => void;

        showActiveRequestHistory: boolean;
        setShowActiveRequestHistory: (v: boolean) => void;
    }) => {
        function restoreOldRequestFromHistory(request: RequestData) {
            context.restoreRequestData(request);
        }

        function getRequestDiff(index: number, newRequest: RequestData, oldRequest: RequestData | null) {
            const diff = [`#${index}`];

            if (newRequest.type === "http") {
                if (newRequest.response) {
                    diff.push(newRequest.response.statusCode.toString());
                }

                if (oldRequest?.type === "http") {
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
            }

            return diff.join(", ");
        }

        return (
            <>
                {requests.map((r) => (
                    <Fragment key={r.id}>
                        {r.type === "group" ? (
                            <RequestGroupEntry
                                depth={depth}
                                isDragOver={r.id === context.draggingOverRequestId}
                                request={r}
                                context={context}
                                selectRequest={selectRequest}
                                deleteRequest={deleteRequest}
                                duplicateRequest={duplicateRequest}
                                showActiveRequestHistory={showActiveRequestHistory}
                                setShowActiveRequestHistory={setShowActiveRequestHistory}
                            />
                        ) : (
                            <>
                                <RequestEntry
                                    context={context}
                                    active={r === context.activeRequest}
                                    isDragOver={r.id === context.draggingOverRequestId}
                                    request={r}
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
                                                <RequestUrl>
                                                    {getRequestDiff(i + 1, oldRequest, i > 0 ? r.history[i - 1] : null)}
                                                </RequestUrl>
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
