export function debounce(func: () => void, delayMs: number): () => void {
    let calls = 0;
    let counter = 0;

    const timerCallback = () => {
        ++counter;
        if (counter === calls) {
            func();
        }
    };

    return () => {
        ++calls;
        setTimeout(timerCallback, delayMs);
    };
}
