import type { SubstitutionVariable } from "../AppContext";

const patternRegex = /\{([^\}]*)\}/g;

export function substituteVariables(str: string, variables: SubstitutionVariable[]): string {
    // Find variable pattern
    const matches = str.matchAll(patternRegex);

    let offset = 0;
    const result = [];

    for (const match of matches) {
        const variableName = match[1];
        if (variableName) {
            const subsVariable = variables.find((v) => v.key === variableName);
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
