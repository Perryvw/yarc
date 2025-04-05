import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { ChevronUp } from "lucide-react";
import { runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { json } from "@codemirror/lang-json";
import { useEffect } from "react";
import styled from "styled-components";
import type { HttpRequestData } from "../../common/request-types";
import { KeyValuesPanel } from "./KeyValuesPanel";

const RequestPanelRoot = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
    min-width: 0;
    border-right: 1px solid hsla(0, 0%, 100%, 0.075);
`;

const RequestSection = styled.details`
    margin: 20px;

    & > summary .chevron {
        margin-left: auto;
    }

    &[open] > summary .chevron {
        transform: rotate(180deg);
    }
`;

const RequestSectionHeader = styled.summary`
    display: flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
    margin-bottom: 10px;
`;

const RequestSectionHeaderName = styled.div`
    display: flex;
    align-items: center;
    gap: 5px;

    &.has-dot:after {
        background: hsl(201, 86%, 67%);
        border-radius: 50%;
        width: 8px;
        height: 8px;
        content: "";
    }
`;

const codemirrorTheme = EditorView.theme({
    "&": {
        fontFamily: "var(--font-monospace)",
    },
    ".cm-scroller": {
        fontFamily: "inherit",
    },
});

export const RequestPanel = observer(({ activeRequest }: { activeRequest: HttpRequestData }) => {
    function onRequestBodyChanged(value: string) {
        runInAction(() => {
            activeRequest.body = value;
        });
    }

    // biome-ignore lint/correctness/useExhaustiveDependencies: only change url when params change, but this is still buggy.
    useEffect(() => {
        // :UrlHasDirtyQueryString
        if (!activeRequest.url.includes("?")) {
            return;
        }

        try {
            const url = new URL(activeRequest.url);
            url.search = "";

            runInAction(() => {
                activeRequest.url = url.toString();
            });
        } catch (e) {
            //
        }
    }, [activeRequest.params]);

    function setRequestBodyType(contentType: string) {
        runInAction(() => {
            const existing = activeRequest.headers.find((x) => x.key === "Content-Type");

            if (existing) {
                existing.enabled = true;
                existing.value = contentType;
                return;
            }

            activeRequest.headers.push({
                enabled: true,
                key: "Content-Type",
                value: contentType,
            });
        });
    }

    function isKeyValuesBodyForm() {
        const contentType = activeRequest.headers.find((x) => x.key === "Content-Type");

        return !contentType || contentType.value === "application/x-www-form-urlencoded";
    }

    return (
        <RequestPanelRoot>
            <RequestSection open>
                <RequestSectionHeader>
                    <RequestSectionHeaderName className={activeRequest.params.length > 0 ? "has-dot" : ""}>
                        Parameters
                    </RequestSectionHeaderName>
                    <ChevronUp size={20} className="chevron" />
                </RequestSectionHeader>
                <KeyValuesPanel name="query-parameters" params={activeRequest.params} />
            </RequestSection>

            <RequestSection open>
                <RequestSectionHeader>
                    <RequestSectionHeaderName
                        className={activeRequest.body.length > 0 || activeRequest.bodyForm.length > 0 ? "has-dot" : ""}
                    >
                        Body
                    </RequestSectionHeaderName>
                    <ChevronUp size={20} className="chevron" />
                </RequestSectionHeader>
                <div>
                    Type:
                    <button type="button" onClick={() => setRequestBodyType("application/x-www-form-urlencoded")}>
                        x-www-form-urlencoded
                    </button>
                    <button type="button" onClick={() => setRequestBodyType("application/json")}>
                        json
                    </button>
                </div>

                {isKeyValuesBodyForm() ? (
                    <KeyValuesPanel name="form-parameters" params={activeRequest.bodyForm} />
                ) : (
                    <CodeMirror
                        theme="dark"
                        basicSetup={{ foldGutter: true }}
                        style={{
                            flexBasis: "100%",
                            overflow: "hidden",
                        }}
                        extensions={[codemirrorTheme, json()]}
                        value={activeRequest.body}
                        onChange={onRequestBodyChanged}
                    />
                )}
            </RequestSection>

            <RequestSection open>
                <RequestSectionHeader>
                    <RequestSectionHeaderName className={activeRequest.headers.length > 0 ? "has-dot" : ""}>
                        Headers
                    </RequestSectionHeaderName>
                    <ChevronUp size={20} className="chevron" />
                </RequestSectionHeader>
                <KeyValuesPanel name="headers" params={activeRequest.headers} />
            </RequestSection>
        </RequestPanelRoot>
    );
});
