import styled from "styled-components";
import { useEffect, useRef, useState } from "react";

const Container = styled.div`
	cursor: col-resize;
    background-color: var(--color-border);
    position: relative;
`;

const Target = styled.div`
    position: absolute;
    inset: 0px -2px;
    cursor: col-resize;
    background-color: transparent;
    transition: background-color .1s cubic-bezier(0.32, 0, 0.67, 0);
    z-index: 3;

    &.active,
    &:hover {
        background-color: hsl(201, 86%, 67%);
    }
`;

export default function SplitSlider({
    style,
    width,
    setWidth,
}: { style?: React.CSSProperties; width: number; setWidth: (width: number) => void }) {
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const startPosition = useRef({ x: 0, width: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;

            const deltaX = e.clientX - startPosition.current.x;
            const deltaPercent = (deltaX / window.innerWidth) * 100;
            const newWidth = Math.min(99, Math.max(1, startPosition.current.width + deltaPercent));

            setWidth(Number(newWidth.toFixed(1)));
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            document.body.style.cursor = "";
        };

        if (isDragging) {
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, setWidth]);

    function handleMouseDown(e: React.MouseEvent) {
        startPosition.current = {
            x: e.clientX,
            width: width,
        };
        setIsDragging(true);
        document.body.style.cursor = "col-resize";
    }

    return (
        <Container style={style}>
            <Target className={isDragging ? "active" : ""} onMouseDown={handleMouseDown} />
        </Container>
    );
}
