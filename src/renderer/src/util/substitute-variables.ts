import type { KeyValue } from "../../../common/key-values";

const patternRegex = /\{([^\}]*)\}/g;

export function substituteVariables(str: string, variables: KeyValue[]): string {
    return getSubstitutionResult(str, variables)
        .map((r) => r.value)
        .join("");
}

export interface SubstitutionResultPart {
    isReplaced: boolean;
    value: string;
}

export function getSubstitutionResult(str: string, variables: KeyValue[]): SubstitutionResultPart[] {
    // Find variable pattern
    const matches = str.matchAll(patternRegex);

    let offset = 0;
    const result: SubstitutionResultPart[] = [];

    for (const match of matches) {
        const variableName = match[1];
        if (variableName) {
            const subsVariable = variables.find((v) => v.enabled && v.key === variableName);
            if (subsVariable) {
                // Add all text before
                if (match.index > offset) {
                    result.push({ isReplaced: false, value: str.slice(offset, match.index) });
                }
                // Add replacement
                result.push({ isReplaced: true, value: subsVariable.value });
                // Increment cursor so that it is after the variable we just replaced
                offset = match.index + match[0].length;
            }
        }
    }

    // If there is any text remaining after the last replacement, also add that to the result
    if (offset < str.length) {
        result.push({ isReplaced: false, value: str.substring(offset) });
    }

    return result;
}
