import type * as CodeMirrorLint from "@codemirror/lint";
import * as fleece from "golden-fleece";
import type * as fleeceAPI from "golden-fleece/types/interfaces";

function assertNever(t: never) {}

export function lintProtoJson(json: string, protoType: ProtoMessageDescriptor): CodeMirrorLint.Diagnostic[] {
    const parsedJson = fleece.parse(json);

    const diagnostics: CodeMirrorLint.Diagnostic[] = [];
    lint(parsedJson, protoType, json, diagnostics);

    return diagnostics;
}

function lint(
    node: fleeceAPI.Value,
    protoDescriptor: ProtoObject,
    text: string,
    diagnostics: CodeMirrorLint.Diagnostic[],
): void {
    if (protoDescriptor.type === "message") {
        if (node.type !== "ObjectExpression") {
            diagnostics.push(errorDiagnostic(node, `Expected a message but got ${node.type.toLowerCase()}`));
        } else {
            lintMessage(node, protoDescriptor, text, diagnostics);
        }
    } else if (protoDescriptor.type === "literal") {
        lintLiteral(node, protoDescriptor, diagnostics);
    } else if (protoDescriptor.type === "repeated") {
        lintRepeated(node, protoDescriptor, text, diagnostics);
    } else if (protoDescriptor.type === "optional") {
        lint(node, protoDescriptor.optionalType, text, diagnostics);
    } else if (protoDescriptor.type === "enum") {
        // Not sure what to do here yet
    } else if (protoDescriptor.type === "oneof") {
        const options = Object.keys(protoDescriptor.fields);
        diagnostics.push(
            errorDiagnostic(node, `Do not set oneof fields directly, set one of the options: ${commaOr(options)}`),
        );
    } else {
        assertNever(protoDescriptor);
    }
}

function lintMessage(
    node: fleeceAPI.ObjectExpression,
    protoDescriptor: ProtoMessageDescriptor,
    text: string,
    diagnostics: CodeMirrorLint.Diagnostic[],
): void {
    const protoFields = Object.entries(protoDescriptor.fields);
    const knownFields = new Map(protoFields);
    const requiredFields = new Set(
        protoFields
            .filter(([name, field]) => field?.type !== "optional" && field?.type !== "oneof")
            .map(([name, field]) => name),
    );
    const seenFields = new Map<string, fleeceAPI.Node>();
    const oneofs = protoFields.filter(([name, field]) => field?.type === "oneof") as Array<[string, ProtoOneOf]>;
    for (const [_, oneof] of oneofs) {
        for (const [name, type] of Object.entries(oneof.fields)) {
            knownFields.set(name, type);
        }
    }

    for (const property of node.properties) {
        if (!property.key.name) continue;

        const protoFieldType = knownFields.get(property.key.name);
        // Check required fields
        if (requiredFields.has(property.key.name)) {
            requiredFields.delete(property.key.name);
        } else if (!protoFieldType) {
            diagnostics.push(errorDiagnostic(property, `Unexpected field ${property.key.name}`));
        }

        if (protoFieldType) {
            lint(property.value, protoFieldType, text, diagnostics);
        }

        seenFields.set(property.key.name, property.key);
    }

    // If there are still expected fields left, add a diagnostic saying they are missing
    if (requiredFields.size > 0) {
        diagnostics.push(
            errorDiagnostic(
                node,
                `Missing required field${requiredFields.size > 1 ? "s" : ""}: ${[...requiredFields.values()].join(", ")}`,
            ),
        );
    }

    // Check oneofs
    for (const [oneOfName, oneof] of oneofs) {
        if (oneof) {
            // Count how many fields were seen
            const seen = [];
            for (const [name, field] of Object.entries(oneof.fields)) {
                if (seenFields.has(name)) {
                    seen.push(seenFields.get(name)!);
                }
            }

            const options = Object.keys(oneof.fields);
            if (seen.length === 0) {
                diagnostics.push(
                    errorDiagnostic(node, `Missing oneof ${oneOfName}, set one of the fields: ${commaOr(options)}`),
                );
            } else if (seen.length > 1) {
                for (const field of seen) {
                    diagnostics.push(
                        errorDiagnostic(
                            field,
                            `Multiple fields of oneof ${oneOfName} specified. Set exactly one of: ${commaOr(options)}`,
                        ),
                    );
                }
            }
        }
    }
}

function lintRepeated(
    node: fleeceAPI.Value,
    protoDescriptor: ProtoRepeated,
    text: string,
    diagnostics: CodeMirrorLint.Diagnostic[],
) {
    if (node.type !== "ArrayExpression") {
        diagnostics.push(errorDiagnostic(node, `Expected array, but got ${node.type.toLowerCase()}`));
        return;
    }

    for (const elem of node.elements) {
        lint(elem, protoDescriptor.repeatedType, text, diagnostics);
    }
}

function lintLiteral(
    node: fleeceAPI.Value,
    protoDescriptor: ProtoLiteral,
    diagnostics: CodeMirrorLint.Diagnostic[],
): void {
    if (node.type !== "Literal") {
        diagnostics.push(errorDiagnostic(node, `Expected literal value, but got ${node.type.toLowerCase()}`));
        return;
    }

    switch (protoDescriptor.literalType) {
        case "string":
            if (typeof node.value !== "string") {
                diagnostics.push(errorDiagnostic(node, `Expected string but got ${typeof node.value}`));
            }
            break;
        case "double":
        case "float":
        case "int32":
        case "int64":
        case "uint32":
        case "uint64":
        case "sint32":
        case "sint64":
        case "fixed32":
        case "fixed64":
        case "sfixed32":
        case "sfixed64":
            if (typeof node.value !== "number") {
                diagnostics.push(errorDiagnostic(node, `Expected number but got ${typeof node.value}`));
            }
            break;
        case "bool":
            if (typeof node.value !== "boolean") {
                diagnostics.push(errorDiagnostic(node, `Expected boolean but got ${typeof node.value}`));
            }
            break;
        default:
            diagnostics.push(errorDiagnostic(node, `Unknown protobuf type ${protoDescriptor.literalType}`));
    }
}

function commaOr(opts: string[]) {
    if (opts.length < 2) {
        return opts.join("");
    }

    return `${opts.slice(0, -1).join(", ")} or ${opts[opts.length - 1]}`;
}

function errorDiagnostic(node: fleeceAPI.Node, message: string): CodeMirrorLint.Diagnostic {
    return {
        severity: "error",
        message: message,
        from: node.start,
        to: node.end,
    };
}

export function defaultProtoBody(protoDescriptor: ProtoObject, indent = ""): string {
    const INDENT_STEP = "  ";
    if (protoDescriptor.type === "message") {
        let result = "{\n";
        for (const [name, field] of Object.entries(protoDescriptor.fields)) {
            if (field) {
                if (field.type === "oneof") {
                    // Only put in the first oneof
                    const options = Object.entries(field.fields);
                    const [optionName, optionType] = options[0];
                    const comment = `// oneof ${options.map(([name]) => name).join(", ")}`;
                    result += `${indent}${INDENT_STEP}${optionName}: ${defaultProtoBody(optionType, indent + INDENT_STEP)}, ${comment}\n`;
                } else if (field.type === "optional") {
                    result += `${indent}${INDENT_STEP}${name}: ${defaultProtoBody(field.optionalType, indent + INDENT_STEP)}, // Optional\n`;
                } else {
                    result += `${indent}${INDENT_STEP}${name}: ${defaultProtoBody(field, indent + INDENT_STEP)},\n`;
                }
            }
        }
        result += `${indent}}`;
        return result;
    }

    if (protoDescriptor.type === "literal") {
        if (protoDescriptor.literalType === "string") {
            return `""`;
        }
        return "0";
    }

    if (protoDescriptor.type === "repeated") {
        return "[]";
    }
    if (protoDescriptor.type === "enum") {
        return "0";
    }
    if (protoDescriptor.type === "optional") {
        throw "unexpected request for getting optional result"; // Should be handled by the message type
    }
    if (protoDescriptor.type === "oneof") {
        throw "unexpected request for getting oneof result"; // Should be handled by the message type
    }
    assertNever(protoDescriptor);
    return "";
}
