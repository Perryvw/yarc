import { Plus, Trash, Trash2 } from "lucide-react";
import styled from "styled-components";
import type { KeyValue } from "../../common/request-types";
import { useState } from "react";

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

export default function KeyValuesPanel({
    params,
    setParams,
}: { params: KeyValue[]; setParams: (params: KeyValue[]) => void }) {
    const [localParams, setLocalParams] = useState(params);

    function updateParams(updatedParams: KeyValue[]) {
        setLocalParams(updatedParams);
        setParams(updatedParams);
    }

    function onToggleEnabled(index: number, enabled: boolean) {
        const updatedParams = localParams.map((param, i) => (i === index ? { ...param, enabled } : param));
        updateParams(updatedParams);
    }

    function onUpdateKey(index: number, key: string) {
        // If we're updating the virtual empty row, create a new parameter
        if (index === localParams.length) {
            const updatedParams = [...localParams, { enabled: true, key, value: "" }];
            updateParams(updatedParams);
        } else {
            const updatedParams = localParams.map((param, i) => (i === index ? { ...param, key } : param));
            updateParams(updatedParams);
        }
    }

    function onUpdateValue(index: number, value: string) {
        // If we're updating the virtual empty row, create a new parameter
        if (index === localParams.length) {
            const updatedParams = [...localParams, { enabled: true, key: "", value }];
            updateParams(updatedParams);
        } else {
            const updatedParams = localParams.map((param, i) => (i === index ? { ...param, value } : param));
            updateParams(updatedParams);
        }
    }

    function onDeleteParam(index: number) {
        const updatedParams = localParams.filter((_, i) => i !== index);
        updateParams(updatedParams);
    }

    function createNewParam() {
        const updatedParams = [...localParams, { enabled: true, key: "", value: "" }];
        updateParams(updatedParams);
    }

    function clearParams() {
        updateParams([]);
    }

    function QueryParameter(index: number, kv: KeyValue) {
        return (
            <tr key={index}>
                <td>
                    {index < localParams.length && (
                        <QueryParameterCheckbox
                            type="checkbox"
                            checked={kv.enabled}
                            onChange={(ev) => onToggleEnabled(index, ev.target.checked)}
                        />
                    )}
                </td>
                <td>
                    <QueryParameterKey
                        type="text"
                        placeholder="Key"
                        value={kv.key}
                        onChange={(ev) => onUpdateKey(index, ev.target.value)}
                    />
                </td>
                <td>
                    <QueryParameterValue
                        placeholder="Value"
                        value={kv.value}
                        onChange={(ev) => onUpdateValue(index, ev.target.value)}
                    />
                </td>
                <td>
                    {index < localParams.length && (
                        <QueryParameterDelete type="button" onClick={() => onDeleteParam(index)}>
                            <Trash size={16} />
                        </QueryParameterDelete>
                    )}
                </td>
            </tr>
        );
    }

    function getParamsToRender() {
        const allParams = [...localParams];

        if (
            allParams.length === 0 ||
            allParams[allParams.length - 1].key !== "" ||
            allParams[allParams.length - 1].value !== ""
        ) {
            allParams.push({ enabled: true, key: "", value: "" });
        }

        return allParams;
    }

    return (
        <QueryParameters>
            <tbody>
                <tr>
                    <td style={{ width: "32px" }}>
                        <QueryParameterDelete type="button" onClick={createNewParam}>
                            <Plus size={16} />
                        </QueryParameterDelete>
                    </td>
                    <td style={{ width: "50%" }} />
                    <td style={{ width: "50%", borderLeft: "0" }} />
                    <td style={{ width: "32px" }}>
                        <QueryParameterDelete type="button" onClick={clearParams}>
                            <Trash2 size={16} />
                        </QueryParameterDelete>
                    </td>
                </tr>
                {getParamsToRender().map((kv, i) => QueryParameter(i, kv))}
            </tbody>
        </QueryParameters>
    );
}
