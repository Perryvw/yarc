import { type ChangeEvent, useContext, useState } from "react";
import { AppContext } from "./AppContext";
import { Plus, Trash, Trash2 } from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import styled from "styled-components";

const RequestPanelRoot = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
    min-width: 250px;
`;

const QueryParameters = styled.table`
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    border-top: 1px solid var(--color-border);

    & td {
        text-align: center;
        vertical-align: top;
        border-left: 1px solid var(--color-border);
        border-bottom: 1px solid var(--color-border);

        &:first-child {
            border-left: 0;
        }
    }
`;

const QueryParameterCheckbox = styled.input`
    margin: 0;
    margin-top: 10px;
    width: 16px;
    height: 16px;
`;

const QueryParameterKey = styled.input`
    font: inherit;
    display: flex;
    border-radius: 0;
    border: unset;
    background: unset;
    padding: 5px;
    width: 100%;
    outline: none;

    &:focus {
        box-shadow: inset 0 0 0 1px hsl(201, 86%, 67%);
    }
`;

const QueryParameterValue = styled.textarea`
    font: inherit;
    display: flex;
    border-radius: 0;
    border: unset;
    background: unset;
    padding: 5px;
    width: 100%;
    outline: none;
    resize: none;
    word-break: break-all;
    field-sizing: content;

    &:focus {
        box-shadow: inset 0 0 0 1px hsl(201, 86%, 67%);
    }
`;

const QueryParameterDelete = styled.button`
    border: unset;
    background: unset;
    color: red;
    cursor: pointer;
    padding: 0;
    margin: 0;
    margin-top: 10px;
`;

export default function RequestPanel() {
    const context = useContext(AppContext);

    const [request, setRequest] = useState(context.activeRequest);
    const [requestBody, setRequestBody] = useState(
        request ? (request.type === "http" ? request.body : "protobuf") : "",
    );

    context.setActiveRequest = (r) => {
        setRequest(r);
        if (r.type === "http") {
            setRequestBody(r.body);
        }
    };

    function onRequestBodyChanged(value: string) {
        if (context.activeRequest && context.activeRequest.type === "http") {
            context.activeRequest.body = value;
            setRequestBody(value);
        }
    }

    function QueryParameter() {
        return (
            <tr>
                <td>
                    <QueryParameterCheckbox type="checkbox" checked />
                </td>
                <td>
                    <QueryParameterKey type="text" placeholder="Key" />
                </td>
                <td>
                    <QueryParameterValue placeholder="Value" />
                </td>
                <td>
                    <QueryParameterDelete type="button">
                        <Trash size={16} />
                    </QueryParameterDelete>
                </td>
            </tr>
        );
    }

    return (
        <RequestPanelRoot>
            <div>
                <b>Query Parameters</b>
                <QueryParameters>
                    <tr>
                        <td style={{ width: "32px" }}>
                            <QueryParameterDelete type="button">
                                <Plus size={16} />
                            </QueryParameterDelete>
                        </td>
                        <td style={{ width: "50%" }} />
                        <td style={{ width: "50%", borderLeft: "0" }} />
                        <td style={{ width: "32px" }}>
                            <QueryParameterDelete type="button">
                                <Trash2 size={16} />
                            </QueryParameterDelete>
                        </td>
                    </tr>
                    {QueryParameter()}
                    {QueryParameter()}
                    {QueryParameter()}
                </QueryParameters>
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
            <b>Headers</b>
            todo
        </RequestPanelRoot>
    );
}
