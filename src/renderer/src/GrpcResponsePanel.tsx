import { useState } from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { html } from "@codemirror/lang-html";
import { CircleSlash2 } from "lucide-react";
import { observer } from "mobx-react-lite";
import type { GrpcResponse } from "../../common/request-types";
import { ResponseBody, ResponsePanelEmpty, ResponsePanelRoot, Status, StatusCode } from "./ResponsePanel";

const codemirrorTheme = EditorView.theme({
    "&.cm-editor": {
        height: "100%",
    },
});

export const GrpcResponsePanel = observer(({ response }: { response: GrpcResponse | undefined }) => {
    const [prettyPrint, setPrettyPrint] = useState(true);

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

    if (!response.success) {
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

function statusColor(statusCode: number) {
    if (statusCode >= 500) return "status-500";
    if (statusCode >= 400) return "status-400";
    if (statusCode >= 300) return "status-300";
    if (statusCode >= 200) return "status-200";
    return "";
}
