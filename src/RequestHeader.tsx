import { ChangeEvent, useContext, useState } from "react";
import { AppContext } from "./AppContext";
import { ipcRenderer } from "electron";

export default function RequestHeader() {

    const context = useContext(AppContext);

    const [url, setUrl] = useState(context.request.url);
    const [method, setMethod] = useState(context.request.type === "http" ? context.request.method : "grpc");

    context.setRequestHeader = (r) => {
        setUrl(r.url);
        if (r.type === "http")
        {
            setMethod(r.method);
        }
    };

    function onUrlChange(event: ChangeEvent<HTMLInputElement>) {
        context.request.url = event.target.value;
        setUrl(event.target.value);
    }

    function onMethodChange(event: ChangeEvent<HTMLSelectElement>) {
        if (context.request.type === "http")
        {
            context.request.method = event.target.value as typeof context.request.method;
            setMethod(event.target.value as typeof context.request.method);
        }
    }

    async function onClick() {
        if (context.request.type === "http")
        {
            context.response = await ipcRenderer.invoke("http-request", context.request);
            context.setResponse(context.response);
        }
        else if (context.request.type === "grpc")
        {
            // TODO
        }
    }

    return (
        <div style={{
            backgroundColor: "#313338",
            border: "solid black",
            borderWidth: "0 0 1 0",
            height: 30,
            padding: "10"
        }}>
            <select style={{height: 30}} value={method} onChange={onMethodChange}>
                <option>GET</option>
                <option>POST</option>
            </select>
            <input type="text" value={url} placeholder="url..." onChange={onUrlChange} style={{width: 400, height: 30}} />
            <button onClick={onClick} style={{height: 30}} >Send</button>
        </div>
    )
}
