import { ChangeEvent, useContext, useState } from "react";
import { AppContext } from "./AppContext";

export default function RequestPanel() {

    const context = useContext(AppContext);

    const [request, setRequest] = useState(context.request);
    const [requestBody, setRequestBody] = useState(request.type === "http" ? request.body : "protobuf");

    context.setRequest = (r) => {
        setRequest(r);
        if (r.type === "http")
        {
            setRequestBody(r.body);
        }
    };

    function onRequestBodyChanged(event: ChangeEvent<HTMLTextAreaElement>) {
        if (context.request.type === "http")
        {
            context.request.body = event.target.value;
        }
        setRequestBody(event.target.value);
    }

    return (
        <div style={{
            backgroundColor: "#2b2d31",
            height: "100%",
            width: "50%",
            float: "left",
            padding: 5,
            boxSizing: "border-box",
            border: "solid black",
            borderWidth: "0 1 0 0",
        }}>
            Body<br/>
            <textarea style={{
                    width: "100%",
                    height: 300,
                    resize: "none"
                }}
                value={requestBody}
                onChange={onRequestBodyChanged}
            />
        </div>
    )
}