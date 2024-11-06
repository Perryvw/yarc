import { DndContext, type DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import classNames from "classnames";
import { ChevronsLeftRight, Copy, SquarePen, Trash, History } from "lucide-react";
import { runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import type React from "react";
import { useCallback, useState } from "react";
import styled from "styled-components";
import type { RequestData } from "../../common/request-types";
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
        const { requests } = context;
        console.log("rendering directory");

        const [showActiveRequestHistory, setShowActiveRequestHistory] = useState(false);
        const [renamingRequest, renameModal] = useState<RequestData | undefined>(undefined);

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
                setShowActiveRequestHistory(false);
                context.setActiveRequest(request);
            },
            [context],
        );

        const deleteRequest = useCallback(
            (request: RequestData) => {
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

        const sensors = useSensors(
            useSensor(PointerSensor, {
                activationConstraint: {
                    distance: 8,
                },
            }),
        );

        const handleDragEnd = useCallback(
            (event: DragEndEvent) => {
                const { active, over } = event;

                if (over && active.id !== over.id) {
                    context.moveRequest(active.id as string, over.id as string);
                }
            },
            [context],
        );

        function getFilteredRequests() {
            if (search) {
                const str = search.toUpperCase();

                return requests.filter((r) => r.name.toUpperCase().includes(str) || r.url.toUpperCase().includes(str));
            }

            return requests;
        }

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
            <DirectoryRoot>
                <DirectoryButtons
                    context={context}
                    importDirectory={importDirectory}
                    exportDirectory={exportDirectory}
                />

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis]}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={requests} strategy={verticalListSortingStrategy}>
                        <RequestContainer>
                            {getFilteredRequests().map((r) => (
                                <>
                                    <RequestEntry
                                        active={context.activeRequest === r}
                                        key={r.id}
                                        request={r}
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
                            ))}
                        </RequestContainer>
                    </SortableContext>
                </DndContext>
                <RenameModal request={renamingRequest} close={finishRename} />
            </DirectoryRoot>
        );
    },
);

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

const RequestUrl = styled(RequestName)`
    font-size: 12px;
    line-height: 1;
    color: #999;
    height: 20px;
`;

const Request = styled.div`
    --method-color: #FFF;
    border: unset;
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
    overflow: hidden;
    position: relative;
    border: 1px solid transparent;
    flex-shrink: 0;
    position: relative;

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

const RequestMethod = styled.span`
    display: flex;
    color: var(--method-color);
`;

const RequestActions = styled.div`
    display: flex;
    gap: 15px;
    height: 20px;
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
        active,
        request,
        renameRequest,
        selectRequest,
        deleteRequest,
        duplicateRequest,
        showActiveRequestHistory,
        setShowActiveRequestHistory,
    }: {
        active: boolean;
        request: RequestData;
        renameRequest: (r: RequestData) => void;
        selectRequest: (r: RequestData) => void;
        deleteRequest: (r: RequestData) => void;
        duplicateRequest: (r: RequestData) => void;

        showActiveRequestHistory: boolean;
        setShowActiveRequestHistory: (v: boolean) => void;
    }) => {
        console.log("Rendering request entry");

        const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: request.id });
        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            "--method-color": request.type === "http" && httpVerbColorPalette[request.method],
        };

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

        return (
            <Request
                onClick={selectHandler}
                className={classNames({ active })}
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
            >
                <RequestName>
                    {request.type === "grpc" && (
                        <RequestMethod>
                            <ChevronsLeftRight size={16} />
                        </RequestMethod>
                    )}
                    {request.type === "http" && <RequestMethod>{request.method}</RequestMethod>} {request.name}
                </RequestName>
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
