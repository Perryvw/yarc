import { Plus, Trash, Trash2 } from "lucide-react";
import { runInAction } from "mobx";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { observer } from "mobx-react-lite";
import styled from "styled-components";
import { commonHeaders } from "../../common/common-headers";
import type { KeyValue } from "../../common/key-values";
import { json } from "@codemirror/lang-json";

const QueryParameters = styled.table`
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;

    & td {
        text-align: center;
        vertical-align: top;
        border-left: 1px solid var(--color-border);
        border-bottom: 1px solid var(--color-border);

        &:first-child {
            border-left: 0;
        }
    }

    & .kv-header td {
        border-left-color: transparent;
    }

    & .text-left {
        text-align: left;
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

export const KeyValuesPanel = observer(
    ({
        name,
        params,
    }: {
        name: string;
        params: KeyValue[];
    }) => {
        function onToggleEnabled(index: number, enabled: boolean) {
            runInAction(() => {
                params[index].enabled = enabled;
            });
        }

        function onToggleJson(index: number, enabled: boolean) {
            runInAction(() => {
                params[index].isJson = enabled;

                try {
                    const obj = JSON.parse(params[index].value);

                    if (obj) {
                        params[index].value = JSON.stringify(obj, null, enabled ? "\t" : 0);
                    }
                } catch {
                    // failed
                }
            });
        }

        function onUpdateKey(index: number, key: string) {
            // If we're updating the virtual empty row, create a new parameter
            if (index === params.length) {
                createNewParam();
            }

            runInAction(() => {
                params[index].key = key;
            });
        }

        function onUpdateValue(index: number, value: string) {
            // If we're updating the virtual empty row, create a new parameter
            if (index === params.length) {
                createNewParam();
            }

            runInAction(() => {
                params[index].value = value;
            });
        }

        function onDeleteParam(index: number) {
            runInAction(() => {
                params.splice(index, 1);
            });
        }

        function createNewParam() {
            runInAction(() => {
                params.push({ enabled: true, key: "", value: "" });
            });
        }

        function clearParams() {
            runInAction(() => {
                params.length = 0;
            });
        }

        function QueryParameter(index: number, kv: KeyValue) {
            return (
                <tr key={index}>
                    <td>
                        {index < params.length && (
                            <QueryParameterCheckbox
                                type="checkbox"
                                checked={kv.enabled}
                                onChange={(ev) => onToggleEnabled(index, ev.target.checked)}
                            />
                        )}
                    </td>
                    <td className="text-left">
                        <QueryParameterKey
                            type="text"
                            placeholder="Key"
                            list={`${name}_kv_datalist`}
                            value={kv.key}
                            onChange={(ev) => onUpdateKey(index, ev.target.value)}
                        />
                    </td>
                    <td className="text-left">
                        {kv.isJson ? (
                            <CodeMirror
                                theme="dark"
                                basicSetup={{ foldGutter: true }}
                                extensions={[json()]}
                                style={{
                                    flexBasis: "100%",
                                    overflow: "hidden",
                                }}
                                value={kv.value}
                                onChange={(value) => onUpdateValue(index, value)}
                            />
                        ) : (
                            <QueryParameterValue
                                placeholder="Value"
                                value={kv.value}
                                onChange={(ev) => onUpdateValue(index, ev.target.value)}
                            />
                        )}
                    </td>
                    <td>
                        <QueryParameterCheckbox
                            type="checkbox"
                            checked={kv.isJson}
                            onChange={(ev) => onToggleJson(index, ev.target.checked)}
                        />
                    </td>
                    <td>
                        {index < params.length && (
                            <QueryParameterDelete type="button" onClick={() => onDeleteParam(index)}>
                                <Trash size={16} />
                            </QueryParameterDelete>
                        )}
                    </td>
                </tr>
            );
        }

        function getParamsToRender() {
            const allParams = [...params];

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
            <>
                <QueryParameters>
                    <tbody>
                        <tr className="kv-header">
                            <td style={{ width: "32px" }}>
                                <QueryParameterDelete type="button" onClick={createNewParam}>
                                    <Plus size={16} />
                                </QueryParameterDelete>
                            </td>
                            <td style={{ width: "50%" }} />
                            <td style={{ width: "50%" }} />
                            <td style={{ width: "32px", fontSize: "6px" }}>JSON</td>
                            <td style={{ width: "32px" }}>
                                <QueryParameterDelete type="button" onClick={clearParams}>
                                    <Trash2 size={16} />
                                </QueryParameterDelete>
                            </td>
                        </tr>
                        {getParamsToRender().map((kv, i) => QueryParameter(i, kv))}
                    </tbody>
                </QueryParameters>
                {name === "headers" && (
                    <datalist id={`${name}_kv_datalist`}>
                        {commonHeaders.map((header) => (
                            <option key={header} value={header} />
                        ))}
                    </datalist>
                )}
            </>
        );
    },
);
