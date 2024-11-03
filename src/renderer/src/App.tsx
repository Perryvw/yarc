import { Directory } from "./Directory";
import DirectoryHeader from "./DirectoryHeader";
import RequestHeader from "./RequestHeader";
import { AppContext } from "./AppContext";
import styled from "styled-components";
import SplitSlider from "./SplitSlider";
import { useCallback, useEffect } from "react";
import { IpcCall, IpcEvent, type IpcImportResult } from "../../common/ipc";
import { observer } from "mobx-react-lite";
import { RequestPanel } from "./RequestPanel";
import { ResponsePanel } from "./ResponsePanel";
import { runInAction, toJS } from "mobx";
import { GrpcRequestPanel } from "./GrpcRequestPanel";

const AppRoot = styled.div`
    --grid-width-directory: 10%;
    --grid-width-response: 50%;

    display: grid;
    grid-template-columns:
        var(--grid-width-directory)
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
        var(--grid-width-response)
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

        context.loadPersistedState();
        context.setActiveRequestById(0);
    }, [context]);

    const setDirectoryWidth = useCallback(
        (w: number) => {
            runInAction(() => {
                context.gridWidthDirectory = w;
            });
        },
        [context],
    );

    const setResponseWidth = useCallback(
        (w: number) => {
            runInAction(() => {
                context.gridWidthResponse = w;
            });
        },
        [context],
    );

    const importDirectory = useCallback(async () => {
        const result: IpcImportResult = await window.electron.ipcRenderer.invoke(IpcCall.ImportDirectory);
        if (!result.cancelled) {
            context.setRequestList(result.requests);
            if (result.requests.length > 0) {
                context.setActiveRequestById(0);
            }
        }
    }, [context]);

    const exportDirectory = useCallback(async () => {
        await window.electron.ipcRenderer.invoke(IpcCall.ExportDirectory, toJS(context.requests));
    }, [context]);

    return (
        <AppRoot
            style={
                {
                    "--grid-width-directory": `${context.gridWidthDirectory}%`,
                    "--grid-width-response": `${context.gridWidthResponse}%`,
                } as React.CSSProperties
            }
        >
            <DirectoryHeader importDirectory={importDirectory} exportDirectory={exportDirectory} />
            <SplitSlider
                width={context.gridWidthDirectory}
                setWidth={setDirectoryWidth}
                style={{
                    gridRow: "span 2",
                }}
            />
            <RequestHeader activeRequest={context.activeRequest} />
            <Directory context={context} />
            <MainContent>
                {context.activeRequest?.type === "grpc" ? (
                    <GrpcRequestPanel activeRequest={context.activeRequest} protoConfig={context.protoConfig} />
                ) : (
                    <RequestPanel activeRequest={context.activeRequest} />
                )}
                <SplitSlider width={context.gridWidthDirectory} setWidth={setResponseWidth} />
                <ResponsePanel response={context.activeRequest?.response} />
            </MainContent>
        </AppRoot>
    );
});

export default function App() {
    const context = new AppContext();
    return <AppContainer context={context} />;
}
