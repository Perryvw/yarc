import { useEffect, useRef } from "react";
import styled from "styled-components";

const SelectProtosDialog = styled.dialog`
    width: 95%;
    height: 95%;
`;

const ProtoRootsContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: calc(100% - 30px);
    width: 300px;
`;

const ProtoRootsList = styled.div`
    flex-grow: 1;
    border: solid 1px white;
`;

const AddRootButton = styled.button`
`;

export function SelectProtosModal({
    open,
    close,
}: {
    open: boolean;
    close: () => void;
}) {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        if (open) {
            ref.current?.showModal();
        } else {
            ref.current?.close();
        }
    }, [open]);

    return (
        <SelectProtosDialog ref={ref}>
            <ProtoRootsContainer>
                Proto roots
                <ProtoRootsList />
                <AddRootButton type="button">Add root...</AddRootButton>
            </ProtoRootsContainer>
            <button type="button" onClick={close}>
                Close
            </button>
        </SelectProtosDialog>
    );
}
