import { useContext, useEffect, useState } from "react";
import { AppContext, type RequestData } from "./AppContext";
import styled from "styled-components";
import { ipcRenderer } from "electron";

const DirectoryRoot = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
    width: 250;
    height: 100%;
    padding: 10px;
    border-right: 1px solid black;
`;

const NewButton = styled.button`
    border: 0;
    background: blue;
    border-radius: 5px;
    padding: 10px 20px;
    display: flex;
    gap: 5px;
    align-items: center;
    cursor: pointer;
`;

export default function Directory() {
    const context = useContext(AppContext);

    const request1: RequestData = {
        type: "http",
        name: "Google",
        url: "https://www.google.com/",
        method: "GET",
        body: "", // google doesnt like extra data
    };
    const request2: RequestData = {
        type: "http",
        name: "Bing",
        url: "https://www.bing.com/",
        method: "GET",
        body: "B",
    };

    const [requests, setRequests] = useState<RequestData[]>([request1, request2]);

    const selectRequest = (request: RequestData) => () => {
        context.request = request;

        context.setRequestHeader(request);
        context.setRequest(request);
    };

    function newRequest() {
        const newRequest: RequestData = {
            type: "http",
            name: "New request",
            method: "GET",
            url: "new",
            body: "new",
        };
        setRequests([...requests, newRequest]);
    }

    // Set default request to request 1
    useEffect(() => {
        ipcRenderer.invoke("load-request-list").then((requests) => {
            //alert(requests.toString());
            //setRequests(requests);
        });
        //selectRequest(request1)();
    }, []);

    return (
        <DirectoryRoot>
            <button type="button">Import</button>
            <button type="button">Export</button>
            Requests list
            {requests.map((r, i) => <button key={i.toString()} type="button" onClick={selectRequest(r)}>{r.name}</button>)}
            <NewButton type="button" style={{backgroundColor: "blue"}} onClick={newRequest}>
                New
            </NewButton>
        </DirectoryRoot>
    );
}
