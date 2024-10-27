import { type ChangeEvent, useContext, useState } from "react";
import { AppContext } from "./AppContext";
import { ipcRenderer } from "electron";
import { Play } from "lucide-react";
import styled from "styled-components";
import { IpcCall } from "./common/ipc";

const RequestHeaderContainer = styled.div`
    grid-column: span 2;
    background-color: var(--color-background-contrast);
    padding: 10px;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    gap: 10px;
`;

const RequestMethodAndPath = styled.div`
    display: flex;
    flex-grow: 1;
    background: var(--color-background);
    border-radius: 5px;

    &:focus-within {
        box-shadow: 0 0 0 3px hsl(201, 86%, 67%);
    }

    & option {
        color: #fff;
        background-color: #000;
    }
`;

const RequestMethod = styled.select`
    border: 0;
    padding: 10px;
    outline: 0;
    background: unset;
`;

const RequestPath = styled.input`
    flex-grow: 1;
    border: 0;
    padding: 10px;
    outline: 0;
    background: unset;
`;

const RequestButton = styled.button`
    border: 0;
    color: #000;
    background: hsl(96, 46%, 57%);
    border-radius: 5px;
    padding: 10px 20px;
    display: flex;
    gap: 5px;
    align-items: center;
    cursor: pointer;

    &:hover {
        background: hsl(96, 46%, 40%);
    }
`;

export default function RequestHeader() {
    const context = useContext(AppContext);

    const [url, setUrl] = useState(context.activeRequest?.url ?? "");
    const [method, setMethod] = useState(
        context.activeRequest?.type === "http" ? context.activeRequest.method : "grpc",
    );

    context.setActiveRequestHeader = (r) => {
        setUrl(r.url);
        if (r.type === "http") {
            setMethod(r.method);
        }
    };

    function onUrlChange(event: ChangeEvent<HTMLInputElement>) {
        if (context.activeRequest) {
            context.activeRequest.url = event.target.value;
            setUrl(event.target.value);
        }
    }

    function onMethodChange(event: ChangeEvent<HTMLSelectElement>) {
        if (context.activeRequest && context.activeRequest.type === "http") {
            context.activeRequest.method = event.target.value as typeof context.activeRequest.method;
            setMethod(event.target.value as typeof context.activeRequest.method);
        }
    }

    async function onClick() {
        if (context.activeRequest && context.activeRequest.type === "http") {
            context.response = await ipcRenderer.invoke(IpcCall.HttpRequest, context.activeRequest);
            context.setResponse(context.response);
        } else if (context.activeRequest && context.activeRequest.type === "grpc") {
            // TODO
        }
    }

    return (
        <RequestHeaderContainer>
            <RequestMethodAndPath>
                <RequestMethod value={method} onChange={onMethodChange}>
                    <option>GET</option>
                    <option>POST</option>
                </RequestMethod>
                <RequestPath type="text" value={url} placeholder="url..." onChange={onUrlChange} />
            </RequestMethodAndPath>
            <RequestButton onClick={onClick}>
                <Play size={16} />
                Send
            </RequestButton>
        </RequestHeaderContainer>
    );
}