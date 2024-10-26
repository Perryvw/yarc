import { useContext, useEffect, useState } from "react";
import { AppContext, type RequestData } from "./AppContext";
import styled from "styled-components";
import { ipcRenderer } from "electron";
import { CirclePlus, Delete, Pencil } from "lucide-react";

const DirectoryRoot = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    border-right: 1px solid black;
    min-height: 0;
`;

const RequestContainer = styled.div`
    overflow-y: auto;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    scrollbar-width: thin;
`;

const Request = styled.button`
    border: unset;
    background: unset;
    border-bottom: 1px solid #000;
    text-align: left;
    padding: 10px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;

    &:hover {
        background-color: blue;
    }
`;

const RequestActions = styled.div`
    display: flex;
    gap: 5px;
`;

const NewButton = styled.button`
    border: unset;
    border-top: 1px solid #000;
    background: unset;
    padding: 10px;
    display: flex;
    gap: 5px;
    align-items: center;
    cursor: pointer;

    &:hover {
        background-color: blue;
    }
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
            <RequestContainer>
                {requests.map((r, i) => (
                    <Request key={i.toString()} type="button" onClick={selectRequest(r)}>
                        {r.name}
                        <RequestActions>
                            <Pencil size={16} />
                            <Delete size={16} />
                        </RequestActions>
                    </Request>
                ))}
            </RequestContainer>
            <NewButton type="button" onClick={newRequest}>
                <CirclePlus />
                New
            </NewButton>
        </DirectoryRoot>
    );
}
