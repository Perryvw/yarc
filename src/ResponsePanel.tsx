import { useContext, useState } from "react";
import { AppContext } from "./AppContext";

export default function ResponsePanel() {

    const context = useContext(AppContext);

    const [response, setResponse] = useState(context.response);
    context.setResponse = setResponse;
    
    return (
        <div style={{
            backgroundColor: "#2b2d31",
            height: "100%",
            width: "50%",
            float: "left",
            padding: 5,
            boxSizing: "border-box"
        }}>
            Status: {response.statusCode}<br />
            Body
            <textarea style={{
                    width: "100%",
                    height: 300,
                    resize: "none",
                }} 
                readOnly
                value={response.body}
            />
        </div>
    )
}