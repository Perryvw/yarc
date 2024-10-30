import { useContext, useState } from "react";
import { AppContext } from "./AppContext";
import CodeMirror from "@uiw/react-codemirror";
import styled from "styled-components";
import KeyValuesPanel from "./KeyValuesPanel";

const RequestPanelRoot = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
    min-width: 250px;
    padding: 20px;
    border-right: 1px solid hsla(0, 0%, 100%, 0.075);
`;

export default function RequestPanel() {
    const context = useContext(AppContext);

    const [activeRequest] = useState(context.activeRequest);

    const [requestBody, setRequestBody] = useState(
        activeRequest ? (activeRequest.type === "http" ? activeRequest.body : "protobuf") : "",
    );

    context.addActiveRequestListener(RequestPanel.name, (r) => {
        if (r) {
            if (r.type === "http") {
                setRequestBody(r.body);
            } else {
                setRequestBody("");
            }
        } else {
            setRequestBody("");
        }
    });

    function onRequestBodyChanged(value: string) {
        if (context.activeRequest && context.activeRequest.type === "http") {
            context.activeRequest.body = value;
            setRequestBody(value);
        }
    }

    return (
        <RequestPanelRoot>
            <div>
                <b>Query Parameters</b>
                <KeyValuesPanel />
            </div>
            <b>Body - raw payload / structured form submit</b>
            <CodeMirror
                theme="dark"
                basicSetup={{ foldGutter: true }}
                style={{
                    flexBasis: "100%",
                    overflow: "hidden",
                }}
                value={requestBody}
                onChange={onRequestBodyChanged}
            />

            <KeyValuesPanel />

            <b>Headers</b>
            <KeyValuesPanel />
        </RequestPanelRoot>
    );
}
