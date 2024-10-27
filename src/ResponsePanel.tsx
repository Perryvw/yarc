import { useContext, useState } from "react";
import { AppContext } from "./AppContext";
import styled from "styled-components";

const ResponsePanelRoot = styled.div`
    display: flex;
    flex-direction: column;
    padding: 10px;
    gap: 10px;
    border-left: 1px solid var(--color-border);
`;

const ResponseTextarea = styled.textarea`
    font-family: "Consolas";
    padding: 5px;
    border: 0;
    background: inherit;
    resize: none;
    flex-grow: 1;
`;

export default function ResponsePanel() {
    const context = useContext(AppContext);

    const [response, setResponse] = useState(context.response);
    context.setResponse = setResponse;

    return (
        <ResponsePanelRoot>
            Status: {response.statusCode}
            <br />
            Body
            <ResponseTextarea readOnly value={response.body} />
        </ResponsePanelRoot>
    );
}
