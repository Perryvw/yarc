import { Download, PawPrint, Upload } from "lucide-react";
import styled from "styled-components";

const Container = styled.div`
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 10px;
    overflow: hidden;
    min-width: 0;

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

const SearchInput = styled.input`
    display: flex;
    flex-grow: 1;
    border: 2px solid var(--color-background-contrast);
    border-radius: 64px;
    padding: 6px 12px;
    outline: 0;
    background: unset;
`;

export default function DirectoryHeader({
    importDirectory,
    exportDirectory,
    search,
    setSearch,
}: {
    importDirectory: () => void;
    exportDirectory: () => void;
    search: string;
    setSearch: (search: string) => void;
}) {
    return (
        <Container>
            <PawPrint size={16} />
            <SearchInput
                type="search"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
            <ImportButton title="Import" onClick={importDirectory}>
                <Download />
            </ImportButton>
            <ExportButton title="Export" onClick={exportDirectory}>
                <Upload />
            </ExportButton>
        </Container>
    );
}
