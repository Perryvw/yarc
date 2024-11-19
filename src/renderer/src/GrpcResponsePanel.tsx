import { html } from "@codemirror/lang-html";
import { json } from "@codemirror/lang-json";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { CircleSlash2, Ghost } from "lucide-react";
import { autorun, toJS } from "mobx";
import { observer } from "mobx-react-lite";
import { useEffect, useRef, useState } from "react";
import type { GrpcResponse, GrpcResponseData, GrpcServerStreamData } from "../../common/request-types";
import { ResponseBody, ResponsePanelEmpty, ResponsePanelRoot, Status, StatusCode } from "./ResponsePanel";
import styled from "styled-components";
import { backgroundColor, backgroundContrastColor, borderColor } from "./palette";

const codemirrorTheme = EditorView.theme({
    "&.cm-editor": {
        height: "100%",
    },
});

export const GrpcResponsePanel = observer(({ response }: { response: GrpcResponse | undefined }): React.ReactNode => {
    if (!response) {
        return (
            <ResponsePanelRoot>
                <ResponsePanelEmpty>
                    <CircleSlash2 />
                    <i>Send a request to view the response here.</i>
                </ResponsePanelEmpty>
            </ResponsePanelRoot>
        );
    }

    if (response.result === "error") {
        return (
            <ResponsePanelRoot>
                <Status>
                    <div>
                        <StatusCode className={statusColor(500)}>{response.code}</StatusCode>
                    </div>
                    <div>
                        Time: <b>{(response.time / 1000).toFixed(2)}s</b>
                    </div>
                </Status>

                <ResponseBody>{response.detail}</ResponseBody>
            </ResponsePanelRoot>
        );
    }

    if (response.result === "success") {
        return <UnaryResponsePanel response={response} />;
    }

    if (response.result === "stream") {
        return <StreamingResponsePanel response={response} />;
    }
});

const UnaryResponsePanel = observer(({ response }: { response: GrpcResponseData }) => {
    const [prettyPrint, setPrettyPrint] = useState(true);

    return (
        <ResponsePanelRoot>
            <Status>
                <div>
                    <StatusCode className={statusColor(200)}>OK</StatusCode>
                </div>
                <div>
                    Time: <b>{(response.time / 1000).toFixed(2)}s</b>
                </div>
            </Status>

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
        </ResponsePanelRoot>
    );
});

const StreamingHeader = styled(Status)`
    font-weight: bold;

    background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
    background-size: 400% 400%;
    animation: gradient 10s ease infinite;

    @keyframes gradient {
        0% {
            background-position: 0% 50%;
        }
        50% {
            background-position: 100% 50%;
        }
        100% {
            background-position: 0% 50%;
        }
    }
`;

const StreamingResponsePanel = observer(({ response }: { response: GrpcServerStreamData }) => {
    const statusColor = response.error ? "status-500" : "status-200";
    const statusMessage = response.error ? "ERROR" : "FINISHED";

    if (response.error) {
        return (
            <ResponsePanelRoot>
                <Status>
                    <div>
                        <StatusCode className={statusColor}>{response.error.code}</StatusCode>
                    </div>
                </Status>
                <ResponseBody>{response.error.detail}</ResponseBody>
            </ResponsePanelRoot>
        );
    }

    const bottomRef = useRef<null | HTMLDivElement>(null);

    useEffect(() => {
        autorun(() => {
            const responses = response.responses.length; // Make mobx look at this property
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        });
    }, [response.responses.length]);

    return (
        <ResponsePanelRoot>
            {response.streamOpen ? (
                <StreamingHeader>STREAMING SERVER RESPONSES</StreamingHeader>
            ) : (
                <Status>
                    <div>
                        <StatusCode className={statusColor}>{statusMessage}</StatusCode>
                    </div>
                </Status>
            )}

            {response.responses.length > 0 ? (
                <ResponseBody>
                    {response.responses.map((r, i) => (
                        <StreamResponsePanel key={i.toString()} response={r} />
                    ))}
                    <div ref={bottomRef} />
                </ResponseBody>
            ) : (
                <ResponsePanelEmpty>
                    <Ghost />
                    <i>No responses received yet...</i>
                </ResponsePanelEmpty>
            )}
        </ResponsePanelRoot>
    );
});

const StreamResponseHeader = styled.div`
    background-color: ${backgroundColor};
    font-size: 10pt;
    padding: 1px 0px 0px 10px;
    border: solid ${borderColor};
    border-width: 1px 0px 1px 0px;
    color: #bbb;
`;

const StreamResponseBody = styled.div`
    padding: 2px 10px 5px 10px;
`;

function StreamResponsePanel({ response }: { response: GrpcResponseData }) {
    return (
        <div>
            <StreamResponseHeader>{new Date(response.time).toLocaleTimeString()}</StreamResponseHeader>
            <StreamResponseBody>{response.body}</StreamResponseBody>
        </div>
    );
}

function statusColor(statusCode: number) {
    if (statusCode >= 500) return "status-500";
    if (statusCode >= 400) return "status-400";
    if (statusCode >= 300) return "status-300";
    if (statusCode >= 200) return "status-200";
    return "";
}
