import { ChangeEvent, ChangeEventHandler, useContext, useState } from "react";
import { AppContext } from "./App";

export default function RequestPanel() {

    const context = useContext(AppContext);

    const [requestBody, setRequestBody] = useState(context.requestBody);

    function onRequestBodyChanged(event: ChangeEvent<HTMLTextAreaElement>) {
        context.requestBody = event.target.value;
    }

    return (
        <div style={{
            backgroundColor: "orange",
            height: "100%",
            width: "50%",
            float: "left",
            padding: 5,
            boxSizing: "border-box"
        }}>
            Body<br/>
            <textarea style={{
                    width: "100%",
                    height: 300,
                    resize: "none"
                }}
                value={context.requestBody}
                onChange={onRequestBodyChanged}
            />
        </div>
    )
}