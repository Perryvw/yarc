import Directory from "./Directory";
import DirectoryHeader from "./DirectoryHeader";
import RequestHeader from "./RequestHeader";
import RequestPanel from "./RequestPanel";
import ResponsePanel from "./ResponsePanel";
import { AppContext, AppContextImpl } from "./AppContext";
import styled from "styled-components";
import SplitSlider from "./SplitSlider";
import { useContext, useEffect, useState } from "react";
import { ipcRenderer } from "electron";
import { IpcCall, IpcEvent } from "./common/ipc";
import type { PersistedState } from "./common/persist-state";
import type { RequestData } from "./common/request-types";

const AppRoot = styled.div`
    --grid-width-directory: 10%;
    --grid-width-response: 50%;

    display: grid;
    grid-template-columns:
        minmax(min-content, var(--grid-width-directory))
        1px
        auto;
    grid-template-rows: min-content 1fr;
    height: 100%;
    width: 100%;
    background-color: var(--color-background);
    color: var(--color-text);
    font: 16px/1.5 system-ui;

    --font-monospace: "Consolas", monospace;

    --color-text: #fff;
    --color-background: #0c0c0c;
    --color-background-contrast: #161920;
    --color-border: #2b2b2b;
`;

const MainContent = styled.div`
    display: grid;
    grid-template-columns:
        minmax(min-content, var(--grid-width-response))
        1px
        auto;

    min-height: 0;
    border-top-left-radius: 16px;
    border-top: 1px solid hsla(0, 0%, 100%, 0.075);
    border-left: 1px solid hsla(0, 0%, 100%, 0.075);
    background-color: var(--color-background-contrast);
`;

function AppContainer() {
    const context = useContext(AppContext);

    const [gridWidthDirectory, setGridWidthDirectory] = useState(context.gridWidthDirectory);
    const [gridWidthResponse, setGridWidthResponse] = useState(context.gridWidthResponse);
    context.setGridWidthDirectory = setGridWidthDirectory;
    context.setGridWidthResponse = setGridWidthResponse;

    useEffect(() => {
        ipcRenderer.on(IpcEvent.WindowClosing, () => {
            context.persistState();
        });

        ipcRenderer.invoke(IpcCall.LoadPersistedState).then((state: PersistedState | undefined) => {
            if (state) {
                context.setGridWidthDirectory(state.layout.directoryWidth);
                context.setGridWidthResponse(state.layout.repsonseWidth);
                context.setRequestList(state.requests);
            } else {
                // TODO: Remove this, but for now this is useful for debugging
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
                context.setRequestList([request1, request2]);
                context.setActiveRequest(request1);
            }
        });
    }, []);

    return (
        <AppRoot
            style={
                {
                    "--grid-width-directory": `${gridWidthDirectory}%`,
                    "--grid-width-response": `${gridWidthResponse}%`,
                } as React.CSSProperties
            }
        >
            <DirectoryHeader />
            <SplitSlider
                width={gridWidthDirectory}
                setWidth={setGridWidthDirectory}
                style={{
                    gridRow: "span 2",
                }}
            />
            <RequestHeader />
            <Directory />
            <MainContent>
                <RequestPanel />
                <SplitSlider width={gridWidthResponse} setWidth={setGridWidthResponse} />
                <ResponsePanel />
            </MainContent>
        </AppRoot>
    );
}

export default function App() {
    return (
        <AppContext.Provider value={new AppContextImpl()}>
            <AppContainer />
        </AppContext.Provider>
    );
}
