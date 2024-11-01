import { Download, PawPrint, Upload } from "lucide-react";
import styled from "styled-components";
import { IpcCall, type IpcImportResult } from "../../common/ipc";
import { useState } from "react";

const Container = styled.div`
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

export default function DirectoryHeader({
    importDirectory,
    exportDirectory,
}: { importDirectory: () => void; exportDirectory: () => void }) {
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
