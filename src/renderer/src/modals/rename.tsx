import { useEffect, useRef, useState } from "react";
import type { RequestData } from "../../../common/request-types";
import styled from "styled-components";

const RenameDialog = styled.dialog`
`;

const RenameCancelButton = styled.button`
    border: unset;
    border-radius: 5px;
    padding: 10px;
    margin: 10px 0px 0px 10px;
    float: right;
`;

const RenameOkButton = styled(RenameCancelButton)`
    background-color: blue;
`;

export type RenameResult = { cancelled: true } | { cancelled: false; name: string };

export function RenameModal({
    request,
    close,
}: {
    request: RequestData | undefined;
    close: (result: RenameResult) => void;
}) {
    const ref = useRef<HTMLDialogElement>(null);

    const [newName, setNewName] = useState(request?.name ?? "");

    useEffect(() => {
        if (request !== undefined) {
            setNewName(request.name);
            ref.current?.showModal();
        } else {
            ref.current?.close();
        }
    }, [request]);

    function cancel() {
        close({ cancelled: true });
    }
    function ok() {
        if (request === undefined) cancel();
        close({ cancelled: false, name: newName });
    }

    return (
        <RenameDialog ref={ref}>
            Rename {request?.name}:<br />
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <br />
            <RenameOkButton type="button" onClick={ok}>
                Ok
            </RenameOkButton>
            <RenameCancelButton type="button" onClick={cancel}>
                Cancel
            </RenameCancelButton>
        </RenameDialog>
    );
}
