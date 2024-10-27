import Directory from "./Directory";
import DirectoryHeader from "./DirectoryHeader";
import RequestHeader from "./RequestHeader";
import RequestPanel from "./RequestPanel";
import ResponsePanel from "./ResponsePanel";
import { AppContext, type AppContextType } from "./AppContext";
import styled from "styled-components";

const AppRoot = styled.div`
    display: grid;
    grid-template-columns: 10% 40% 50%;
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

export default function App() {
    const initialContext: AppContextType = {
        requests: [],
        activeRequest: undefined,
        response: {
            statusCode: 0,
            headers: {},
            body: "initial response",
        },
        setRequestList() {},
        setActiveRequestHeader() {},
        setActiveRequest() {},
        setResponse() {},
        setDirectoryheaderList() {},
    };

    return (
        <AppContext.Provider value={initialContext}>
            <AppRoot>
                <DirectoryHeader />
                <RequestHeader />
                <Directory />
                <RequestPanel />
                <ResponsePanel />
            </AppRoot>
        </AppContext.Provider>
    );
}
