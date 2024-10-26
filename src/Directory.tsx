import { useContext, useEffect } from "react";
import { AppContext, RequestData } from "./AppContext";
import styled from 'styled-components';

const DirectoryRoot = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
    width: 250;
    height: 100%;
    padding: 10px;
    border-right: 1px solid black;
`;

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
        <DirectoryRoot>
            Requests list
            <button onClick={loadRequest(request1)}>Request A</button>
            <button onClick={loadRequest(request2)}>Request B</button>
        </DirectoryRoot>
    )
}