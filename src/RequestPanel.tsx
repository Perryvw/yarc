import { ChangeEvent, useContext, useState } from "react";
import { AppContext } from "./AppContext";
import styled from "styled-components";

const RequestPanelRoot = styled.div`
    display: flex;
    flex-direction: column;
    padding: 10px;
    gap: 10px;
`;

export default function RequestPanel() {
    const context = useContext(AppContext);

    const [request, setRequest] = useState(context.request);
    const [requestBody, setRequestBody] = useState(
        request.type === "http" ? request.body : "protobuf",
    );

    context.setRequest = (r) => {
        setRequest(r);
        if (r.type === "http") {
            setRequestBody(r.body);
        }
    };

    function onRequestBodyChanged(event: ChangeEvent<HTMLTextAreaElement>) {
        if (context.request.type === "http") {
            context.request.body = event.target.value;
        }
        setRequestBody(event.target.value);
    }

    return (
        <RequestPanelRoot>
            Body
            <textarea
                style={{
                    width: "100%",
                    height: 300,
                    resize: "none",
                }}
                value={requestBody}
                onChange={onRequestBodyChanged}
            />
        </RequestPanelRoot>
    );
}
