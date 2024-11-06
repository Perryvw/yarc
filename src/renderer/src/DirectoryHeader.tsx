import styled from "styled-components";

const Container = styled.div`
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px;
    overflow: hidden;
    min-width: 0;

    & svg {
        flex-shrink: 0;
    }
`;

const SearchInput = styled.input`
    display: flex;
    flex-grow: 1;
    border: 2px solid var(--color-background-contrast);
    border-radius: 64px;
    padding: 12px 12px;
    outline: 0;
    background: unset;
    min-width: 0;
`;

export default function DirectoryHeader({
    search,
    setSearch,
}: {
    search: string;
    setSearch: (search: string) => void;
}) {
    return (
        <Container>
            <SearchInput
                type="search"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
        </Container>
    );
}
