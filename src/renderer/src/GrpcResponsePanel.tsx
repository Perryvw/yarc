import { json5 } from "codemirror-json5";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { CircleSlash2, Ghost } from "lucide-react";
import { observer } from "mobx-react-lite";
import { useEffect, useRef } from "react";
import type { GrpcError, GrpcResponse, GrpcResponseData, GrpcServerStreamData } from "../../common/request-types";
import { ResponseBody, ResponsePanelEmpty, ResponsePanelRoot, Status, StatusCode } from "./ResponsePanel";
import styled from "styled-components";
import { backgroundColor, borderColor, lightTextColor } from "./palette";

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

const ResponseMetaData = styled.div`

`;

const ResponseMetaDataHeader = styled.i`
    color: ${lightTextColor};
    font-size: 10pt;
    padding-left: 5px;
`;

const ResponseMetaDataRow = styled.div`
    background-color: ${backgroundColor};
    border: solid ${borderColor};
    border-width: 0px 0px 1px 0px;
    padding-left: 5px;
`;

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
        const metadataEntries = response.metadata ? Object.entries(response.metadata) : [];
        return (
            <ResponsePanelRoot>
                <Status>
                    <div>
                        <StatusCode $statusCode={500}>{response.code}</StatusCode>
                    </div>
                    <div>
                        Time: <b>{(response.time / 1000).toFixed(2)}s</b>
                    </div>
                </Status>

                <ResponseBody>{response.detail}</ResponseBody>

                {metadataEntries.length > 2 && (
                    <ResponseMetaData>
                        <ResponseMetaDataHeader>Metadata</ResponseMetaDataHeader>
                        {metadataEntries.map(([name, value], i) => (
                            <ResponseMetaDataRow key={i.toString()}>
                                {name} | {value}
                            </ResponseMetaDataRow>
                        ))}
                    </ResponseMetaData>
                )}
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
    return (
        <ResponsePanelRoot>
            <Status>
                <div>
                    <StatusCode $statusCode={200}>OK</StatusCode>
                </div>
                <div>
                    Time: <b>{(response.time / 1000).toFixed(2)}s</b>
                </div>
            </Status>

            <ResponseBody>
                <CodeMirror
                    readOnly
                    theme="dark"
                    value={response.body}
                    basicSetup={{ foldGutter: true }}
                    extensions={[codemirrorTheme, json5()]}
                    style={{
                        flexBasis: "100%",
                        overflow: "hidden",
                    }}
                />
            </ResponseBody>
        </ResponsePanelRoot>
    );
});

const StreamingStatusCode = styled(StatusCode)`
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
    const responseStatus = response.error ? 500 : 200;
    const statusMessage = response.error ? "ERROR" : "FINISHED";

    if (response.error) {
        return (
            <ResponsePanelRoot>
                <Status>
                    <div>
                        <StatusCode $statusCode={responseStatus}>{response.error.code}</StatusCode>
                    </div>
                </Status>
                <ResponseBody>{response.error.detail}</ResponseBody>
            </ResponsePanelRoot>
        );
    }

    return (
        <ResponsePanelRoot>
            {response.streamOpen ? (
                <Status>
                    <div>
                        <StreamingStatusCode $statusCode={200}>STREAMING SERVER RESPONSES</StreamingStatusCode>
                    </div>
                </Status>
            ) : (
                <Status>
                    <div>
                        <StatusCode $statusCode={responseStatus}>{statusMessage}</StatusCode>
                    </div>
                </Status>
            )}
            <StreamingResponsesList responses={response.responses} />
        </ResponsePanelRoot>
    );
});

const StreamingResponsesList = observer(({ responses }: { responses: Array<GrpcResponseData | GrpcError> }) => {
    const bottomRef = useRef<null | HTMLDivElement>(null);

    useEffect(() => {
        const l = responses.length;
        setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 0);
    }, [responses.length]);

    return (
        <>
            {responses.length > 0 ? (
                <ResponseBody>
                    {responses.map((r, i) => (
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
        </>
    );
});

const StreamResponseHeader = styled.div`
    font-size: 10pt;
    padding: 1px 0px 0px 10px;
    border: solid ${borderColor};
    border-width: 0px 0px 1px 0px;
    color: #bbb;
`;

const StreamResponseBody = styled.div`
`;

const StreamError = styled.div`
    padding: 10px 5px;
`;

function StreamResponsePanel({ response }: { response: GrpcResponseData | GrpcError }) {
    return (
        <div>
            <StreamResponseHeader>{new Date(response.time).toLocaleTimeString()}</StreamResponseHeader>
            <StreamResponseBody>
                {response.result === "success" ? (
                    <CodeMirror
                        readOnly
                        theme="dark"
                        value={response.body}
                        basicSetup={{ foldGutter: true }}
                        extensions={[codemirrorTheme, json5()]}
                        style={{
                            flexBasis: "100%",
                            overflow: "hidden",
                        }}
                    />
                ) : (
                    <StreamError>
                        <StatusCode $statusCode={500}>{response.code}</StatusCode> {response.detail}
                    </StreamError>
                )}
            </StreamResponseBody>
        </div>
    );
}
