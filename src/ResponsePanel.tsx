import { useContext, useState } from "react";
import { AppContext } from "./AppContext";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { html } from "@codemirror/lang-html";
import styled from "styled-components";
import { CircleSlash2 } from "lucide-react";

const ResponsePanelRoot = styled.div`
    display: flex;
    flex-direction: column;
    border-left: 1px solid var(--color-border);
    min-height: 0;
`;

const ResponsePanelEmpty = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    color: #999;
    margin-top: 10%;
`;

const Status = styled.div`
    padding: 10px;
    display: flex;
    gap: 20px;
`;

const StatusCode = styled.b`
    border-radius: 16px;
    background: rgb(107 114 128);
    color: #fff;
    padding: 0 10px;
    display: inline-flex;

    &.status-500 {
        background: rgb(220 38 38);
    }

    &.status-400 {
        background: rgb(249 115 22);
    }

    &.status-300 {
        background: rgb(59 130 246);
    }

    &.status-200 {
        background: rgb(22 163 74);
    }
`;

const Tabs = styled.div`
    display: flex;
    border-top: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
`;

const Tab = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-basis: 100%;
    border: unset;
    background: unset;
    border-right: 1px solid var(--color-border);
    cursor: pointer;
    padding: 10px;

    &:last-child {
        border-right: unset;
    }

    &:hover {
        background: #666;
    }

    &.active {
        box-shadow: inset 0 -3px 0 hsl(201, 86%, 67%);
    }
`;

const ResponseBody = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
`;

const ResponseHeaders = styled.div`
    font-family: var(--font-monospace);
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: scroll;
    user-select: text;
`;

const ResponseHeader = styled.div`
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid var(--color-border);
`;

const ResponseHeaderKey = styled.div`
    word-break: break-all;
    font-weight: bold;
    padding: 10px;
    padding-bottom: 0;
`;

const ResponseHeaderValue = styled.textarea`
    border: unset;
    background: unset;
    field-sizing: content;
    resize: none;
    word-break: break-all;
    width: 100%;
    padding: 10px;
    outline: none;

    &:focus {
        box-shadow: inset 0 0 0 3px hsl(201, 86%, 67%);
    }
`;

const ResponseTextarea = styled.textarea`
    font-family: var(--font-monospace);
    padding: 10px;
    border: 0;
    background: inherit;
    resize: none;
    flex-grow: 1;
`;

export default function ResponsePanel() {
    const context = useContext(AppContext);

    const [tab, setTab] = useState<"body" | "headers">("body");
    const [prettyPrint, setPrettyPrint] = useState(true);
    const [response, setResponse] = useState(context.response);
    context.setResponse = setResponse;

    function changeTab(tab: "body" | "headers") {
        setTab(tab);
    }

    function statusColor() {
        if (response.statusCode >= 500) return "status-500";
        if (response.statusCode >= 400) return "status-400";
        if (response.statusCode >= 300) return "status-300";
        if (response.statusCode >= 200) return "status-200";
        return "";
    }

    function formatHeader(value: string | string[]) {
        if (!Array.isArray(value)) {
            return <ResponseHeaderValue readOnly value={value} />;
        }

        return (
            <>
                {value.map((v) => (
                    <ResponseHeaderValue readOnly key={v} value={v} />
                ))}
            </>
        );
    }

    if (!response.statusCode) {
        return (
            <ResponsePanelRoot>
                <ResponsePanelEmpty>
                    <CircleSlash2 />
                    <i>Send a request to view the response here.</i>
                </ResponsePanelEmpty>
            </ResponsePanelRoot>
        );
    }

    const codemirrorTheme = EditorView.theme({
        "&.cm-editor": {
            height: "100%",
        },
    });

    return (
        <ResponsePanelRoot>
            <Status>
                <div>
                    Status: <StatusCode className={statusColor()}>{response.statusCode}</StatusCode>
                </div>
                <div>
                    Size: <b>{response.body.length}</b>
                </div>
                <div>
                    Time: <b>0</b>
                </div>
            </Status>

            <Tabs>
                <Tab type="button" className={tab === "body" ? "active" : ""} onClick={() => changeTab("body")}>
                    Response
                </Tab>
                <Tab type="button" className={tab === "headers" ? "active" : ""} onClick={() => changeTab("headers")}>
                    Headers
                </Tab>
            </Tabs>

            {tab === "body" && (
                <ResponseBody>
                    <div>
                        <label>
                            <input
                                type="checkbox"
                                onClick={() => setPrettyPrint(!prettyPrint)}
                                defaultChecked={prettyPrint}
                            />
                            Pretty print
                        </label>
                    </div>
                    <CodeMirror
                        readOnly
                        theme="dark"
                        value={response.body}
                        basicSetup={{ foldGutter: true }}
                        extensions={[codemirrorTheme, json(), html()]}
                        style={{
                            flexBasis: "100%",
                            overflow: "hidden",
                        }}
                    />
                </ResponseBody>
            )}

            {tab === "headers" && (
                <ResponseHeaders>
                    {Object.keys(response.headers).map((key) => (
                        <ResponseHeader key={key}>
                            <ResponseHeaderKey>{key}</ResponseHeaderKey>
                            {formatHeader(response.headers[key])}
                        </ResponseHeader>
                    ))}
                </ResponseHeaders>
            )}
        </ResponsePanelRoot>
    );
}
