import { ChangeEvent, useContext, useState } from "react";
import { AppContext } from "./AppContext";

export default function RequestPanel() {

    const context = useContext(AppContext);

    const [request, setRequest] = useState(context.request);
    const [requestBody, setRequestBody] = useState(request.body);

    context.setRequest = (r) => {
        setRequest(r);
        setRequestBody(r.body);
    };

    function onRequestBodyChanged(event: ChangeEvent<HTMLTextAreaElement>) {
        context.request.body = event.target.value;
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