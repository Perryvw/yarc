import Directory from "./Directory";
import DirectoryHeader from "./DirectoryHeader";
import RequestHeader from "./RequestHeader";
import { AppContext } from "./AppContext";
import styled from "styled-components";
import SplitSlider from "./SplitSlider";
import { useEffect } from "react";
import { IpcCall, IpcEvent } from "../../common/ipc";
import type { PersistedState } from "../../common/persist-state";
import type { HttpRequestData } from "../../common/request-types";
import { observer } from "mobx-react-lite";
import { RequestPanel } from "./RequestPanel";
import { ResponsePanel } from "./ResponsePanel";
import { runInAction } from "mobx";

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

const AppContainer = observer(({ context }: { context: AppContext }) => {
    useEffect(() => {
        window.electron.ipcRenderer.on(IpcEvent.WindowClosing, () => {
            context.persistState();
        });

        window.electron.ipcRenderer.invoke(IpcCall.LoadPersistedState).then((state: PersistedState | undefined) => {
            if (state) {
                context.gridWidthDirectory = state.layout.directoryWidth;
                context.gridWidthResponse = state.layout.repsonseWidth;

                context.setRequestList(state.requests);
                context.setActiveRequestById(0);
            } else {
                // TODO: Remove this, but for now this is useful for debugging
                const request1: HttpRequestData = {
                    type: "http",
                    name: "Google",
                    url: "https://www.google.com/",
                    params: [
                        {
                            enabled: true,
                            key: "test",
                            value: "123456",
                        },
                    ],
                    headers: [],
                    method: "GET",
                    body: "", // google doesnt like extra data
                };
                const request2: HttpRequestData = {
                    type: "http",
                    name: "JSON",
                    url: "https://jsonplaceholder.typicode.com/comments",
                    params: [],
                    headers: [],
                    method: "GET",
                    body: "B",
                };
                context.setRequestList([request1, request2]);
                context.setActiveRequestById(0);
            }
        });
    }, []);

    return (
        <AppRoot
            style={
                {
                    "--grid-width-directory": `${context.gridWidthDirectory}%`,
                    "--grid-width-response": `${context.gridWidthResponse}%`,
                } as React.CSSProperties
            }
        >
            <DirectoryHeader />
            <SplitSlider
                width={context.gridWidthDirectory}
                setWidth={(w) => {
                    runInAction(() => {
                        context.gridWidthDirectory = w;
                    });
                }}
                style={{
                    gridRow: "span 2",
                }}
            />
            <RequestHeader activeRequest={context.activeRequest} />
            <Directory context={context} />
            <MainContent>
                <RequestPanel activeRequest={context.activeRequest} />
                <SplitSlider
                    width={context.gridWidthDirectory}
                    setWidth={(w) => {
                        runInAction(() => {
                            context.gridWidthResponse = w;
                        });
                    }}
                />
                <ResponsePanel response={context.activeRequest?.response} />
            </MainContent>
        </AppRoot>
    );
});

export default function App() {
    const context = new AppContext();
    return <AppContainer context={context} />;
}
