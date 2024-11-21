import { runInAction, toJS } from "mobx";
import { observer } from "mobx-react-lite";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { IpcCall, type IpcImportResult } from "../../common/ipc";
import { AppContext } from "./AppContext";
import { Directory } from "./Directory";
import DirectoryHeader from "./DirectoryHeader";
import { GrpcRequestPanel } from "./GrpcRequestPanel";
import { GrpcResponsePanel } from "./GrpcResponsePanel";
import RequestHeader from "./RequestHeader";
import { RequestPanel } from "./RequestPanel";
import { ResponsePanel } from "./ResponsePanel";
import SplitSlider from "./SplitSlider";
import * as palette from "./palette";

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
    font: 14px/1.5 "Inter Variable", system-ui;

    --font-monospace: "JetBrains Mono Variable", "Consolas", monospace;

    --color-text: #fff;
    --color-background: ${palette.backgroundColor};
    --color-background-contrast: ${palette.backgroundContrastColor};
    --color-border: ${palette.borderColor};
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

const AlphaLabel = styled.div`
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    background-color: #e53935;
    color: #fff;
    border-top-left-radius: 5px;
    border-top-right-radius: 5px;
    padding: 5px;
    text-align: center;
    font-size: 12px;
    font-weight: bold;
    line-height: 1;
    z-index: 1000;
    display: inline-block;
    text-transform: uppercase;
`;

const AppContainer = observer(({ context }: { context: AppContext }) => {
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
            context.requests = result.result;
        }
    }, [context]);

    const exportDirectory = useCallback(async () => {
        await window.electron.ipcRenderer.invoke(IpcCall.ExportDirectory, toJS(context.requests));
    }, [context]);

    useEffect(() => {
        function handleMouseButton(e: MouseEvent) {
            switch (e.button) {
                case 3:
                    e.preventDefault();
                    context.navigateInHistory(false);
                    break;
                case 4:
                    e.preventDefault();
                    context.navigateInHistory(true);
                    break;
            }
        }

        window.addEventListener("mouseup", handleMouseButton);

        return () => {
            window.removeEventListener("mouseup", handleMouseButton);
        };
    }, [context]);

    const [search, setSearch] = useState("");

    return (
        <AppRoot
            style={
                {
                    "--grid-width-directory": `${context.gridWidthDirectory}%`,
                    "--grid-width-response": `${context.gridWidthResponse}%`,
                } as React.CSSProperties
            }
        >
            <DirectoryHeader search={search} setSearch={setSearch} />
            <SplitSlider
                width={context.gridWidthDirectory}
                setWidth={setDirectoryWidth}
                style={{
                    gridRow: "span 2",
                }}
            />
            <RequestHeader context={context} />
            <Directory
                context={context}
                search={search}
                importDirectory={importDirectory}
                exportDirectory={exportDirectory}
            />
            {context.activeRequest === undefined ? (
                <MainContent>
                    <div>Hello!</div>
                </MainContent>
            ) : (
                <MainContent>
                    {context.activeRequest.type === "grpc" && (
                        <GrpcRequestPanel activeRequest={context.activeRequest} protoConfig={context.protoConfig} />
                    )}
                    {context.activeRequest.type === "http" && <RequestPanel activeRequest={context.activeRequest} />}
                    <SplitSlider width={context.gridWidthDirectory} setWidth={setResponseWidth} />
                    {context.activeRequest.type === "http" && (
                        <ResponsePanel activeRequest={context.activeRequest} context={context} />
                    )}
                    {context.activeRequest.type === "grpc" && (
                        <GrpcResponsePanel response={context.activeRequest?.response} />
                    )}
                </MainContent>
            )}
            <AlphaLabel>alpha software • design not final • expect bugs</AlphaLabel>
        </AppRoot>
    );
});

export default function App() {
    const context = new AppContext();
    return <AppContainer context={context} />;
}
