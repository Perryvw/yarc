import { html } from "@codemirror/lang-html";
import { json } from "@codemirror/lang-json";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { CircleSlash2 } from "lucide-react";
import { toJS } from "mobx";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import type { GrpcResponse, GrpcResponseData, GrpcServerStreamData } from "../../common/request-types";
import { ResponseBody, ResponsePanelEmpty, ResponsePanelRoot, Status, StatusCode } from "./ResponsePanel";

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

const StreamingResponsePanel = observer(({ response }: { response: GrpcServerStreamData }) => {
    const statusColor = response.error ? "status-500" : !response.streamOpen ? "status-200" : "status-300";
    const statusMessage = response.error ? "ERROR" : response.streamOpen ? "STREAMING" : "FINISHED";

    console.log(toJS(response.responses));

    return (
        <ResponsePanelRoot>
            <Status>
                <div>
                    <StatusCode className={statusColor}>{statusMessage}</StatusCode>
                </div>
            </Status>

            <ResponseBody>
                Messages:
                {response.responses.map((r, i) => (
                    <div key={i.toString()}>
                        {new Date(r.time).toLocaleTimeString()} - {r.body}
                    </div>
                ))}
            </ResponseBody>
        </ResponsePanelRoot>
    );
});

function statusColor(statusCode: number) {
    if (statusCode >= 500) return "status-500";
    if (statusCode >= 400) return "status-400";
    if (statusCode >= 300) return "status-300";
    if (statusCode >= 200) return "status-200";
    return "";
}
