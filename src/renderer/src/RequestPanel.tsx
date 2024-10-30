import { useContext, useState } from "react";
import { AppContext } from "./AppContext";
import CodeMirror from "@uiw/react-codemirror";
import styled from "styled-components";
import KeyValuesPanel from "./KeyValuesPanel";
import { Tab, Tabs } from "./Tabs";
import classNames from "classnames";

const RequestPanelRoot = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
    min-width: 250px;
    border-right: 1px solid hsla(0, 0%, 100%, 0.075);
`;

export default function RequestPanel() {
    const context = useContext(AppContext);

    const [activeRequest] = useState(context.activeRequest);

    const [requestBody, setRequestBody] = useState(
        activeRequest ? (activeRequest.type === "http" ? activeRequest.body : "protobuf") : "",
    );

    const [tab, setTab] = useState<"parameters" | "body" | "headers">("parameters");

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
            <Tabs>
                <Tab
                    type="button"
                    className={classNames({
                        active: tab === "parameters",
                    })}
                    onClick={() => setTab("parameters")}
                >
                    Parameters
                </Tab>
                <Tab
                    type="button"
                    className={classNames({
                        active: tab === "body",
                        "has-dot": requestBody?.length > 0,
                    })}
                    onClick={() => setTab("body")}
                >
                    Body
                </Tab>
                <Tab
                    type="button"
                    className={classNames({
                        active: tab === "headers",
                    })}
                    onClick={() => setTab("headers")}
                >
                    Headers
                </Tab>
            </Tabs>

            {tab === "parameters" && (
                <div>
                    <KeyValuesPanel />
                </div>
            )}

            {tab === "body" && (
                <div>
                    Type:
                    <button type="button">application/json</button>
                    <button type="button">application/x-www-form-urlencoded</button>
                    <KeyValuesPanel />
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
                </div>
            )}

            {tab === "headers" && (
                <div>
                    <KeyValuesPanel />
                </div>
            )}
        </RequestPanelRoot>
    );
}
