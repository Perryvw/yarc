import { type ChangeEvent, useState } from "react";
import { Play } from "lucide-react";
import styled, { keyframes } from "styled-components";
import { IpcCall } from "../../common/ipc";
import type { KeyValue, RequestData } from "../../common/request-types";
import { observer } from "mobx-react-lite";
import { runInAction, toJS } from "mobx";

const RequestHeaderContainer = styled.div`
    padding: 15px;
    padding-left: 0;
    display: flex;
    gap: 10px;
`;

const RequestMethodAndPath = styled.div`
    display: flex;
    flex-grow: 1;
    border-radius: 5px;
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

    const [params, setParams] = useState(activeRequest?.type === "http" ? activeRequest.params : []);
    const [method, setMethod] = useState(activeRequest?.type === "http" ? activeRequest.method : "grpc");

    function onUrlChange(event: ChangeEvent<HTMLInputElement>) {
        if (activeRequest) {
            activeRequest.url = event.target.value;
        }
    }

    function onMethodChange(event: ChangeEvent<HTMLSelectElement>) {
        if (activeRequest && activeRequest.type === "http") {
            activeRequest.method = event.target.value as typeof activeRequest.method;
            setMethod(event.target.value as typeof activeRequest.method);
        }
    }

    async function onClick() {
        setIsExecuting(true);
        setIsExecutionAnimating(true);

        if (activeRequest && activeRequest.type === "http") {
            const response = await window.electron.ipcRenderer.invoke(IpcCall.HttpRequest, toJS(activeRequest));
            runInAction(() => {
                activeRequest.response = response;
            });
        } else if (activeRequest && activeRequest.type === "grpc") {
            // TODO
        }

        setIsExecuting(false);
    }

    function onButtonAnimationIteration() {
        if (!isExecuting) {
            setIsExecutionAnimating(false);
        }
    }

    function renderParams(params: KeyValue[]) {
        const p = new URLSearchParams(params.map((kv) => [kv.key, kv.value]));
        return p.toString();
    }

    return (
        <RequestHeaderContainer>
            <RequestMethodAndPath>
                {activeRequest?.type === "http" && (
                    <RequestMethod value={method} onChange={onMethodChange}>
                        <option>GET</option>
                        <option>POST</option>
                    </RequestMethod>
                )}
                <RequestPath type="text" value={activeRequest?.url ?? ""} placeholder="url..." onChange={onUrlChange} />
                {renderParams(params)}
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
