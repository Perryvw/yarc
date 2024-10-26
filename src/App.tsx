import Directory from "./Directory";
import RequestHeader from "./RequestHeader";
import RequestPanel from "./RequestPanel";
import ResponsePanel from "./ResponsePanel";
import { AppContext, type AppContextType } from "./AppContext";
import { Download, PawPrint, Upload } from "lucide-react";
import styled from "styled-components";

const AppRoot = styled.div`
    display: grid;
    grid-template-columns: 250px 1fr 1fr;
    grid-template-rows: min-content 1fr;
    height: 100%;
    width: 100%;
    background-color: #1e1f22;
    color: #fff;
    font: 16px/1.5 system-ui;
`;

const DirectoryHeader = styled.div`
    background-color: #313338;
    border-right: 1px solid black;
    border-bottom: 1px solid black;
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 10px;
`;

const ExportButton = styled.button`
    border: unset;
    background: unset;
    padding: 0;
    cursor: pointer;

    &:hover {
        color: blue;
    }
`;

const ImportButton = styled(ExportButton)`
    border: 0;
    margin-left: auto;
`;

export default function App() {
    const initialContext: AppContextType = {
        request: {
            type: "http",
            name: "initial",
            url: "initialUrl",
            method: "GET",
            body: "initial request",
        },
        response: {
            statusCode: 0,
            body: "initial response",
        },
        setRequestHeader() {},
        setRequest() {},
        setResponse() {},
    };

    return (
        <AppContext.Provider value={initialContext}>
            <AppRoot>
                <DirectoryHeader>
                    <PawPrint size={16} />
                    Directory
                    <ImportButton title="Import">
                        <Upload />
                    </ImportButton>
                    <ExportButton title="Export">
                        <Download />
                    </ExportButton>
                </DirectoryHeader>
                <RequestHeader />
                <Directory />
                <RequestPanel />
                <ResponsePanel />
            </AppRoot>
        </AppContext.Provider>
    );
}
