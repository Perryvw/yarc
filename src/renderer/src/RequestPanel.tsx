import { useContext, useState } from "react";
import { AppContext } from "./AppContext";
import CodeMirror from "@uiw/react-codemirror";
import styled from "styled-components";
import KeyValuesPanel from "./KeyValuesPanel";
import { ChevronUp } from "lucide-react";

const RequestPanelRoot = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
    min-width: 250px;
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
            <RequestSection open>
                <RequestSectionHeader>
                    <RequestSectionHeaderName>Parameters</RequestSectionHeaderName>
                    <ChevronUp size={20} className="chevron" />
                </RequestSectionHeader>
                <KeyValuesPanel />
            </RequestSection>

            <RequestSection open>
                <RequestSectionHeader>
                    <RequestSectionHeaderName className={requestBody?.length > 0 ? "has-dot" : ""}>
                        Body
                    </RequestSectionHeaderName>
                    <ChevronUp size={20} className="chevron" />
                </RequestSectionHeader>
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
            </RequestSection>

            <RequestSection open>
                <RequestSectionHeader>
                    <RequestSectionHeaderName>Headers</RequestSectionHeaderName>
                    <ChevronUp size={20} className="chevron" />
                </RequestSectionHeader>
                <KeyValuesPanel />
            </RequestSection>
        </RequestPanelRoot>
    );
}
