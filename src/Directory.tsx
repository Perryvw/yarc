import { useContext, useEffect, useState } from "react";
import { AppContext } from "./AppContext";
import styled from "styled-components";
import { ipcRenderer } from "electron";
import { CirclePlus, Delete, Pencil } from "lucide-react";
import { IpcCall } from "./common/ipc";
import type { RequestData } from "./common/request-types";

const DirectoryRoot = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    border-right: 1px solid var(--color-border);
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
    border-bottom: 1px solid var(--color-border);
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
    border-top: 1px solid var(--color-border);
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
        name: "JSON",
        url: "https://jsonplaceholder.typicode.com/comments",
        method: "GET",
        body: "B",
    };
    context.requests = [request1, request2];

    const [requests, setRequests] = useState<RequestData[]>(context.requests);
    context.setRequestList = (l) => {
        setRequests(l);
        selectRequest(l[0]);
    };

    const selectRequest = (request: RequestData) => () => {
        context.activeRequest = request;

        context.setActiveRequestHeader(request);
        context.setActiveRequest(request);
    };

    function newRequest() {
        const newRequest: RequestData = {
            type: "http",
            name: "New request",
            method: "GET",
            url: "new",
            body: "new",
        };
        context.requests = [...requests, newRequest];
        setRequests(context.requests);
        context.setDirectoryheaderList(context.requests);
        console.log(context.requests);
    }

    // Set default request to request 1
    useEffect(() => {
        ipcRenderer.invoke(IpcCall.LoadRequestList).then((requests) => {
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
