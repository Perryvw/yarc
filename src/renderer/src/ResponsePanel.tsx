import { html } from "@codemirror/lang-html";
import { json } from "@codemirror/lang-json";
import CodeMirror, { EditorState, EditorView } from "@uiw/react-codemirror";
import { CircleSlash2, Loader } from "lucide-react";
import { runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import styled from "styled-components";
import type { RequestData } from "../../common/request-types";
import type { AppContext } from "./AppContext";
import { Tab, Tabs } from "./Tabs";
import { statusCodeColor } from "./util/status-code";

export const ResponsePanelRoot = styled.div`
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
`;

export const ResponsePanelEmpty = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: #999;
    padding: 10px;
    margin-top: 100px;
    font-variant-numeric: tabular-nums;
`;

export const Status = styled.div`
    padding: 10px;
    display: flex;
    justify-content: space-between;
    gap: 20px;
    border-bottom: 1px solid var(--color-border);
`;

export const StatusCode = styled.b<{ $statusCode: number }>`
    border-radius: 16px;
    background: ${(props) => statusCodeColor(props.$statusCode)};
    color: #fff;
    padding: 0 10px;
    display: inline-flex;
`;

export const ResponseBody = styled.div`
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    min-height: 0;
    overflow: auto;
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
    font: inherit;
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

const codemirrorTheme = EditorView.theme({
    "&": {
        fontFamily: "var(--font-monospace)",
    },
    ".cm-scroller": {
        fontFamily: "inherit",
    },
    "&.cm-editor": {
        height: "100%",
    },
});

export const ResponsePanel = observer(
    ({
        activeRequest,
        context,
    }: {
        activeRequest: RequestData;
        context: AppContext;
    }) => {
        const [tab, setTab] = useState<"body" | "headers">("body");
        const [runningRequestTime, setRunningRequestTime] = useState(-1);

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

        useEffect(() => {
            if (!activeRequest.isExecuting) {
                return;
            }

            setRunningRequestTime(Date.now() - activeRequest.lastExecute);

            const intervalId = setInterval(() => {
                setRunningRequestTime(Date.now() - activeRequest.lastExecute);
            }, 100);

            return () => {
                clearInterval(intervalId);
                setRunningRequestTime(-1);
            };
        }, [activeRequest, activeRequest.isExecuting]);

        if (runningRequestTime >= 0) {
            return (
                <ResponsePanelRoot>
                    <ResponsePanelEmpty>
                        <Loader />
                        <i>
                            Executing… <b>{(runningRequestTime / 1000).toFixed(2)}s</b>
                        </i>
                    </ResponsePanelEmpty>
                </ResponsePanelRoot>
            );
        }

        if (activeRequest.type !== "http" || !activeRequest.response) {
            return (
                <ResponsePanelRoot>
                    <ResponsePanelEmpty>
                        <CircleSlash2 />
                        <i>Send a request to view the response here.</i>
                    </ResponsePanelEmpty>
                </ResponsePanelRoot>
            );
        }

        const response = activeRequest.response;

        function getContentType() {
            const typeRaw = response.headers["content-type"];

            if (!typeRaw) {
                return null;
            }

            let type = "";

            if (Array.isArray(typeRaw)) {
                type = typeRaw[0];
            } else {
                type = typeRaw;
            }

            const contentType = type.split(";", 1);
            return contentType[0];
        }

        const contentType = getContentType();
        const isHtml = contentType === "text/html";
        // TODO: Check for more json responses like application/vnd.github+json
        const isJson = contentType === "application/json";

        function getResponseBody() {
            if (context.responsePrettyPrint) {
                try {
                    if (isJson) {
                        const obj = JSON.parse(response.body);

                        if (obj) {
                            return JSON.stringify(obj, null, "\t");
                        }
                    }
                } catch {
                    // failed
                }
            }

            return response.body;
        }

        const extensions = [codemirrorTheme, EditorState.tabSize.of(2)];

        if (context.responseLineWrap) {
            extensions.push(EditorView.lineWrapping);
        }

        if (isJson) {
            extensions.push(json());
        } else if (isHtml) {
            extensions.push(html());
        }

        function onChangePrettyPrint() {
            runInAction(() => {
                context.responsePrettyPrint = !context.responsePrettyPrint;
            });
        }

        function onChangeLineWrap() {
            runInAction(() => {
                context.responseLineWrap = !context.responseLineWrap;
            });
        }

        return (
            <ResponsePanelRoot>
                <Status>
                    <div>
                        Status: <StatusCode $statusCode={response.statusCode}>{response.statusCode}</StatusCode>
                    </div>
                    <div>
                        Size: <b>{bytesToSize1024(response.body.length)}</b>
                    </div>
                    <div>
                        Time: <b>{(response.time / 1000).toFixed(2)}s</b>
                    </div>
                </Status>

                <Tabs>
                    <Tab type="button" className={tab === "body" ? "active" : ""} onClick={() => setTab("body")}>
                        Response
                    </Tab>
                    <Tab type="button" className={tab === "headers" ? "active" : ""} onClick={() => setTab("headers")}>
                        Headers
                    </Tab>
                </Tabs>

                {tab === "body" && (
                    <ResponseBody>
                        <div>
                            <label>
                                <input
                                    type="checkbox"
                                    onChange={onChangePrettyPrint}
                                    defaultChecked={context.responsePrettyPrint}
                                />
                                Pretty print
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    onClick={onChangeLineWrap}
                                    defaultChecked={context.responseLineWrap}
                                />
                                Wrap lines
                            </label>
                        </div>
                        <CodeMirror
                            readOnly
                            theme="dark"
                            value={getResponseBody()}
                            basicSetup={{ foldGutter: true }}
                            extensions={extensions}
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
    },
);

function bytesToSize1024(bytes: number) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    const units = ["B", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return `${(bytes / 1024 ** i).toFixed(2)} ${units[i]}`;
}
