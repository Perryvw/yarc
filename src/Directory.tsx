import { useContext, useEffect } from "react";
import { AppContext, RequestData } from "./AppContext";

export default function Directory() {

    const context = useContext(AppContext);

    const loadRequest = (request: RequestData) => () => {
        context.request = request;

        context.setRequestHeader(request);
        context.setRequest(request);
    }

    const request1: RequestData = {
        type: "http",
        url: "https://www.google.com/",
        method: "GET",
        body: "" // google doesnt like extra data
    };
    const request2: RequestData = {
        type: "http",
        url: "https://www.bing.com/",
        method: "GET",
        body: "B"
    };

    // Set default request to request 1
    useEffect(() => {
        loadRequest(request1)();
    }, []);

    return (
        <div style={{
            backgroundColor: "#1e1f22",
            width: 250,
            height: "100%",
            padding: 5,
            boxSizing: "border-box",
            border: "solid black",
            borderWidth: "0 1 0 0",
        }}>
            Requests list
            <br />
            <button onClick={loadRequest(request1)}>Request A</button>
            <br />
            <button onClick={loadRequest(request2)}>Request B</button>
        </div>
    )
}