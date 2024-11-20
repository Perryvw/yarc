import type { KeyValue } from "../../../common/key-values";

const patternRegex = /\{([^\}]*)\}/g;

export function substituteVariables(str: string, variables: KeyValue[]): string {
    // Find variable pattern
    const matches = str.matchAll(patternRegex);

    let offset = 0;
    const result = [];

    for (const match of matches) {
        const variableName = match[1];
        if (variableName) {
            const subsVariable = variables.find((v) => v.enabled && v.key === variableName);
            if (subsVariable) {
                result.push(str.slice(offset, match.index));
                result.push(subsVariable.value);
                offset = match.index + match[0].length;
            }
        }
    }

    result.push(str.substring(offset));

    return result.join("");
}
