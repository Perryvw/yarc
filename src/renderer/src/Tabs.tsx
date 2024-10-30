import styled from "styled-components";

const Tabs = styled.div`
    display: flex;
    border-bottom: 1px solid var(--color-border);
`;

const Tab = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-basis: 100%;
    border: unset;
    background: unset;
    border-right: 1px solid var(--color-border);
    cursor: pointer;
    padding: 10px;

    &:last-child {
        border-right: unset;
    }

    &:hover {
        background: #666;
    }

    &.active {
        box-shadow: inset 0 -3px 0 hsl(201, 86%, 67%);
    }
`;

export { Tabs, Tab };
