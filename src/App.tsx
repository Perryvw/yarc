import Directory from "./Directory";
import DirectoryHeader from "./DirectoryHeader";
import RequestHeader from "./RequestHeader";
import RequestPanel from "./RequestPanel";
import ResponsePanel from "./ResponsePanel";
import { AppContext, AppContextImpl, type AppContextType } from "./AppContext";
import styled from "styled-components";
import SplitSlider from "./SplitSlider";
import { useContext, useState } from "react";

const AppRoot = styled.div`
    --grid-width-directory: 10%;
    --grid-width-response: 50%;

    display: grid;
    grid-template-columns:
        minmax(min-content, var(--grid-width-directory))
        1px
        minmax(min-content, var(--grid-width-response))
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
    --color-background: #161920;
    --color-background-contrast: #0c0c0c;
    --color-border: #2b2b2b;
`;

function AppContainer() {
    const context = useContext(AppContext);

    const [gridWidthDirectory, setGridWidthDirectory] = useState(context.gridWidthDirectory);
    const [gridWidthResponse, setGridWidthResponse] = useState(context.gridWidthResponse);
    context.setGridWidthDirectory = setGridWidthDirectory;
    context.setGridWidthResponse = setGridWidthResponse;

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
            <RequestPanel />
            <SplitSlider width={gridWidthResponse} setWidth={setGridWidthResponse} />
            <ResponsePanel />
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
