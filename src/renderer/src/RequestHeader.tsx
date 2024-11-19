import { CircleStop, Play } from "lucide-react";
import { observable, runInAction, toJS } from "mobx";
import { observer } from "mobx-react-lite";
import { type ChangeEvent, useCallback, useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import { IpcCall } from "../../common/ipc";
import type { GrpcRequestData, GrpcResponse, HttpRequestData, KeyValue } from "../../common/request-types";
import type { AppContext } from "./AppContext";
import { httpVerbColorPalette } from "./palette";
import { debounce } from "./util/debounce";
import { substituteVariables } from "./util/substitute-variables";

const RequestHeaderContainer = styled.div`
    padding: 15px;
    padding-left: 0;
    display: flex;
    gap: 10px;
    min-width: 0;
    overflow: hidden;
`;

const RequestMethodAndPath = styled.div`
    display: flex;
    flex-grow: 1;
    border: 2px solid var(--color-background-contrast);
    border-radius: 64px;

    & option {
        color: #fff;
        background-color: #000;
    }
`;

const RequestMethod = styled.select`
    font: inherit;
    border: 0;
    padding: 6px;
    padding-left: 10px;
    padding-right: 0;
    outline: 0;
    background: unset;
`;

const RequestPath = styled.input`
    font: inherit;
    flex-grow: 1;
    border: 0;
    padding: 8px 12px;
    outline: 0;
    background: unset;
`;

const pulseKeyframes = keyframes`
    0% {
        box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.6);
    }
    70% {
        box-shadow: 0 0 0 10px rgba(46, 204, 113, 0);
    }
    100% {
        box-shadow: 0 0 0 0 rgba(46, 204, 113, 0);
    }
`;

const RequestButton = styled.button`
    border: 0;
    color: #000;
    background-color: hsl(96, 46%, 57%);
    border-radius: 50%;
    margin: 2px;
    padding: 10px;
    display: flex;
    gap: 5px;
    align-items: center;
    cursor: pointer;
    transition:
        background-color 0.2s ease-out,
        transform 0.2s ease-out,
        box-shadow 0.2s ease-out;

    &.is-executing {
        animation: ${pulseKeyframes} 1s ease-in-out infinite;
    }

    &.is-executing,
    &:hover {
        background-color: hsl(96, 46%, 40%);
        transform: scale(1.1);
    }
`;

const RequestHeader = observer(({ context }: { context: AppContext }) => {
    const { activeRequest } = context;
    const [isExecutionAnimating, setIsExecutionAnimating] = useState(false);

    function onUrlChange(event: ChangeEvent<HTMLInputElement>) {
        if (activeRequest) {
            runInAction(() => {
                activeRequest.url = event.target.value;

                if (activeRequest.type === "http") {
                    try {
                        const url = new URL(event.target.value);

                        const newParams = [] as KeyValue[];

                        for (const [key, value] of url.searchParams) {
                            newParams.push({
                                enabled: true,
                                key,
                                value,
                            });
                        }

                        activeRequest.params = newParams;
                    } catch (e) {
                        // url does not parse
                    }
                }
            });
        }
    }

    function onMethodChange(event: ChangeEvent<HTMLSelectElement>) {
        if (activeRequest && activeRequest.type === "http") {
            runInAction(() => {
                activeRequest.method = event.target.value as typeof activeRequest.method;
            });
        }
    }

    async function onClick() {
        const request = activeRequest;

        if (!request) {
            return;
        }

        if (request.isExecuting) {
            alert("abort request!");
            return;
        }

        const jsRequest = toJS(request);
        jsRequest.url = substituteVariables(request.url, context.substitutionVariables);
        jsRequest.response = undefined;
        jsRequest.history = [];

        runInAction(() => {
            request.isExecuting = true;
            request.lastExecute = Date.now();
        });

        setIsExecutionAnimating(true);

        if (request.type === "http") {
            runInAction(() => {
                const requestForHistory = observable(jsRequest) as HttpRequestData;
                request.history.push(requestForHistory);
            });

            await window.electron.ipcRenderer.invoke(IpcCall.HttpRequest, jsRequest);
        } else if (request.type === "grpc") {
            const requestForHistory = observable(jsRequest) as GrpcRequestData;
            const response: GrpcResponse = await window.electron.ipcRenderer.invoke(IpcCall.GrpcRequest, jsRequest);
            runInAction(() => {
                request.isExecuting = false;
                request.response = response;
                requestForHistory.response = response;
            });
        }
    }

    // biome-ignore lint/correctness/useExhaustiveDependencies(onClick): onClick changes every re-render
    useEffect(() => {
        async function handleKeydown(e: KeyboardEvent) {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();

                if (
                    e.target !== null &&
                    ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes((e.target as HTMLElement).tagName)
                ) {
                    return;
                }

                if (activeRequest) {
                    await onClick();
                }
            }
        }

        window.addEventListener("keydown", handleKeydown);

        return () => {
            window.removeEventListener("keydown", handleKeydown);
        };
    }, [activeRequest]);

    function onButtonAnimationIteration() {
        if (!activeRequest?.isExecuting) {
            setIsExecutionAnimating(false);
        }
    }

    function getFullUrl() {
        if (!activeRequest) {
            return "";
        }

        let url = activeRequest.url;

        if (activeRequest.type !== "http") {
            return url;
        }

        // :UrlHasDirtyQueryString
        // If the url already contains a query string (maybe need to parse it to detect properly or have a dirty flag?)
        // then do not render the url params until the actually change
        if (url.includes("?")) {
            return url;
        }

        const p = new URLSearchParams(activeRequest.params.filter((p) => p.enabled).map((kv) => [kv.key, kv.value]));

        if (p.size > 0) {
            url += `?${p}`;
        }

        return url;
    }

    return (
        <RequestHeaderContainer>
            <RequestMethodAndPath>
                {activeRequest?.type === "http" && (
                    <RequestMethod value={activeRequest.method} onChange={onMethodChange}>
                        {Object.keys(httpVerbColorPalette).map((verb) => (
                            <option
                                key={verb}
                                style={{
                                    color: httpVerbColorPalette[verb],
                                }}
                            >
                                {verb}
                            </option>
                        ))}
                    </RequestMethod>
                )}
                <RequestPath type="text" value={getFullUrl()} placeholder="url..." onChange={onUrlChange} />
                <RequestButton
                    type="button"
                    className={isExecutionAnimating ? "is-executing" : ""}
                    onClick={onClick}
                    onAnimationIteration={onButtonAnimationIteration}
                >
                    {activeRequest?.isExecuting ? <CircleStop size={16} /> : <Play size={16} />}
                </RequestButton>
            </RequestMethodAndPath>
        </RequestHeaderContainer>
    );
});
export default RequestHeader;
