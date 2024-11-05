import { type ChangeEvent, useState } from "react";
import { Play } from "lucide-react";
import styled, { keyframes } from "styled-components";
import { IpcCall } from "../../common/ipc";
import type { GrpcResponse, HttpResponseData, KeyValue, RequestData } from "../../common/request-types";
import { observer } from "mobx-react-lite";
import { runInAction, toJS } from "mobx";
import { httpVerbColorPalette } from "./HttpVerb";

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
    padding: 6px 12px;
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

const RequestHeader = observer(({ activeRequest }: { activeRequest: RequestData | undefined }) => {
    const [isExecuting, setIsExecuting] = useState(false);
    const [isExecutionAnimating, setIsExecutionAnimating] = useState(false);

    function onUrlChange(event: ChangeEvent<HTMLInputElement>) {
        if (activeRequest) {
            runInAction(() => {
                activeRequest.url = event.target.value;

                if (activeRequest.type === "http") {
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
        setIsExecuting(true);
        setIsExecutionAnimating(true);

        if (activeRequest && activeRequest.type === "http") {
            const response: HttpResponseData = await window.electron.ipcRenderer.invoke(
                IpcCall.HttpRequest,
                toJS(activeRequest),
            );
            runInAction(() => {
                activeRequest.response = response;
            });
        } else if (activeRequest && activeRequest.type === "grpc") {
            // TODO
            const response: GrpcResponse = await window.electron.ipcRenderer.invoke(
                IpcCall.GrpcRequest,
                toJS(activeRequest),
            );
            runInAction(() => {
                activeRequest.response = response;
            });
        }

        setIsExecuting(false);
    }

    function onButtonAnimationIteration() {
        if (!isExecuting) {
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
                    <Play size={16} />
                </RequestButton>
            </RequestMethodAndPath>
        </RequestHeaderContainer>
    );
});
export default RequestHeader;
