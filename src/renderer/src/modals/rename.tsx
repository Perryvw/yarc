import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import type { RequestData, RequestDataOrGroup } from "../../../common/request-types";

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

export type RenameResult = Cancellable<{ request?: RequestDataOrGroup; name: string }>;

export function RenameModal({
    request,
    close,
}: {
    request: RequestDataOrGroup | undefined;
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

    function onClose() {
        if (ref.current?.returnValue !== "save") {
            close({ cancelled: true });
            return;
        }

        close({ cancelled: false, result: { request, name: newName } });
    }

    return (
        <RenameDialog ref={ref} onClose={onClose}>
            <form method="dialog">
                Rename {request?.name}:<br />
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} />
                <br />
                <RenameOkButton value="save">Save</RenameOkButton>
                <RenameCancelButton value="cancel">Cancel</RenameCancelButton>
            </form>
        </RenameDialog>
    );
}
