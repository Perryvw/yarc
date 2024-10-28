import { Download, PawPrint, Upload } from "lucide-react";
import styled from "styled-components";
import { IpcCall } from "./common/ipc";
import { ipcRenderer } from "electron";
import { useContext, useState } from "react";
import { AppContext } from "./AppContext";

const Container = styled.div`
    background-color: var(--color-background-contrast);
    border-bottom: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 10px;

    & svg {
        flex-shrink: 0;
    }
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

export default function DirectoryHeader() {
    const context = useContext(AppContext);

    const [requests, setRequests] = useState(context.requests);
    context.addRequestListListener(DirectoryHeader.name, setRequests);

    async function importDirectory() {
        const result = await ipcRenderer.invoke(IpcCall.ImportDirectory);
        if (!result.cancelled) {
            context.setRequestList(result.requests);
            context.setActiveRequest(context.requests[0]);
        }
    }

    async function exportDirectory() {
        await ipcRenderer.invoke(IpcCall.ExportDirectory, requests);
    }

    return (
        <Container>
            <PawPrint size={16} />
            Directory
            <ImportButton title="Import" onClick={importDirectory}>
                <Download />
            </ImportButton>
            <ExportButton title="Export" onClick={exportDirectory}>
                <Upload />
            </ExportButton>
        </Container>
    );
}
