import { useContext, useState } from "react";
import { AppContext } from "./App";

export default function ResponsePanel() {

    const context = useContext(AppContext);

    const [responseBody, setResponseBody] = useState(context.responseBody);
    
    return (
        <div style={{
            backgroundColor: "cyan",
            height: "100%",
            width: "50%",
            float: "left",
            padding: 5,
            boxSizing: "border-box"
        }}>
            Response
            <textarea style={{
                    width: "100%",
                    height: 300,
                    resize: "none",
                }} 
                readOnly
                value={responseBody}
            />
        </div>
    )
}