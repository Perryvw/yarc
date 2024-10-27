import { type ChangeEvent, useContext, useState } from "react";
import { AppContext } from "./AppContext";
import { ipcRenderer } from "electron";
import { Play } from "lucide-react";
import styled from "styled-components";

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

    const [url, setUrl] = useState(context.request.url);
    const [method, setMethod] = useState(context.request.type === "http" ? context.request.method : "grpc");

    context.setRequestHeader = (r) => {
        setUrl(r.url);
        if (r.type === "http") {
            setMethod(r.method);
        }
    };

    function onUrlChange(event: ChangeEvent<HTMLInputElement>) {
        context.request.url = event.target.value;
        setUrl(event.target.value);
    }

    function onMethodChange(event: ChangeEvent<HTMLSelectElement>) {
        if (context.request.type === "http") {
            context.request.method = event.target.value as typeof context.request.method;
            setMethod(event.target.value as typeof context.request.method);
        }
    }

    async function onClick() {
        if (context.request.type === "http") {
            context.response = await ipcRenderer.invoke("http-request", context.request);
            context.setResponse(context.response);
        } else if (context.request.type === "grpc") {
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
