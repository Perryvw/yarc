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
    gap: 5px;
    border: unset;
    background: unset;
    border-right: 1px solid var(--color-border);
    cursor: pointer;
    padding: 10px;

    &.has-dot:after {
        background: hsl(201, 86%, 67%);
        border-radius: 50%;
        width: 8px;
        height: 8px;
        content: "";
    }

    &:last-child {
        border-right: unset;
    }

    &:hover {
        color: #000;
        background: hsl(201, 86%, 67%);
    }

    &.active {
        box-shadow: inset 0 -3px 0 hsl(201, 86%, 67%);
    }
`;

export { Tabs, Tab };
