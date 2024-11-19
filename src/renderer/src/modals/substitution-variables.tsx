import { Plus } from "lucide-react";
import { runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { type ChangeEvent, useCallback, useEffect, useRef } from "react";
import styled from "styled-components";
import type { AppContext, SubstitutionVariable } from "../AppContext";
import { backgroundHoverColorAlternate } from "../palette";

const Modal = styled.dialog`
    width: 95%;
    height: 95%;
    border: solid 1px grey;
    border-radius: 10px;
`;

const CloseButton = styled.button`
    position: absolute;
    bottom: 10px;
    right: 10px;
    padding: 5px 15px;
`;

const AddButton = styled.button`
    border: unset;
    background: unset;
    padding: 10px;
    display: flex;
    gap: 5px;
    align-items: center;
    cursor: pointer;
    background-color: rgb(255 255 255 / .03);
    border-radius: 50%;

    & > svg {
        flex-shrink: 0;
    }

    &:hover {
        background-color: ${backgroundHoverColorAlternate};
    }
`;

const RemoveButton = styled.button`
    border: unset;
    background: unset;
    padding: 5px;
    text-color: red;
    color: red;
    cursor: pointer;
    background-color: rgb(255 255 255 / .03);
    border-radius: 50%;

    & > svg {
        flex-shrink: 0;
    }

    &:hover {
        background-color: ${backgroundHoverColorAlternate};
    }
`;

export const SubstitutionVariablesModal = observer(
    ({
        context,
        substitutionVariables,
        open,
        close,
    }: {
        context: AppContext;
        substitutionVariables: SubstitutionVariable[];
        open: boolean;
        close: () => void;
    }) => {
        const ref = useRef<HTMLDialogElement>(null);

        useEffect(() => {
            if (open) {
                ref.current?.showModal();
            } else {
                ref.current?.close();
            }
        }, [open]);

        const addVariable = useCallback(() => {
            runInAction(() => {
                context.substitutionVariables.push({ name: "", value: "" });
            });
        }, [context.substitutionVariables]);

        const removeVariable = useCallback(
            (index: number) => {
                runInAction(() => {
                    context.substitutionVariables.splice(index, 1);
                });
            },
            [context.substitutionVariables],
        );

        return (
            <Modal ref={ref} onClose={close}>
                These variables will be replaced in request URLs:
                {substitutionVariables.map((v, i) => (
                    <VariableEntry key={i.toString()} variable={v} remove={() => removeVariable(i)} />
                ))}
                <AddButton onClick={addVariable}>
                    <Plus />
                </AddButton>
                <CloseButton onClick={close}>Close</CloseButton>
            </Modal>
        );
    },
);

export const VariableEntry = observer(
    ({ variable, remove }: { variable: SubstitutionVariable; remove: () => void }) => {
        const onNameChange = useCallback(
            (value: ChangeEvent<HTMLInputElement>) => {
                runInAction(() => {
                    variable.name = value.target.value;
                });
            },
            [variable],
        );
        const onValueChange = useCallback(
            (value: ChangeEvent<HTMLInputElement>) => {
                runInAction(() => {
                    variable.value = value.target.value;
                });
            },
            [variable],
        );

        return (
            <div>
                <input type="text" value={variable.name} onChange={onNameChange} />
                <input type="text" value={variable.value} onChange={onValueChange} />
                <RemoveButton onClick={remove}>X</RemoveButton>
            </div>
        );
    },
);
