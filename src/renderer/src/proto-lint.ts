import { jsonLanguage } from "@codemirror/lang-json";
import type * as CodeMirrorLint from "@codemirror/lint";
import type * as tokenizer from "@lezer/common/dist";

function assertNever(t: never) {}

export function lintProtoJson(json: string, protoType: ProtoMessageDescriptor): CodeMirrorLint.Diagnostic[] {
    const parsedJson = jsonLanguage.parser.parse(json);
    const cursor = parsedJson.cursor(); // JsonText

    if (cursor.firstChild()) {
        const diagnostics: CodeMirrorLint.Diagnostic[] = [];
        lint(cursor.node, protoType, json, diagnostics);
        return diagnostics;
    }

    return [];
}

function lint(
    node: tokenizer.SyntaxNode,
    protoDescriptor: ProtoObject,
    text: string,
    diagnostics: CodeMirrorLint.Diagnostic[],
): void {
    if (protoDescriptor.type === "message") {
        if (node.type.name !== "Object") {
            diagnostics.push(errorDiagnostic(node.node, `Expected a message but got ${node.type.name.toLowerCase()}`));
        } else {
            lintMessage(node.node, protoDescriptor, text, diagnostics);
        }
    } else if (protoDescriptor.type === "literal") {
        lintLiteral(node.node, protoDescriptor, diagnostics);
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
    node: tokenizer.SyntaxNode,
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
    const seenFields = new Map<string, tokenizer.SyntaxNode>();
    const oneofs = protoFields.filter(([name, field]) => field?.type === "oneof") as Array<[string, ProtoOneOf]>;
    for (const [_, oneof] of oneofs) {
        for (const [name, type] of Object.entries(oneof.fields)) {
            knownFields.set(name, type);
        }
    }

    const members = node.getChildren("Property");

    for (const member of members) {
        if (member.name === "Property") {
            const cursor = member.cursor();
            if (cursor.firstChild()) {
                let nameNode: tokenizer.SyntaxNode | undefined;
                let valueNode: tokenizer.SyntaxNode | undefined;
                do {
                    if (cursor.node.type) {
                        if (cursor.node.name === "PropertyName") {
                            nameNode = cursor.node;
                        } else if (cursor.node.type) {
                            valueNode = cursor.node;
                            break;
                        }
                    }
                } while (cursor.nextSibling());

                if (nameNode && valueNode) {
                    const fieldName = text.substring(nameNode.from + 1, nameNode.to - 1); // Remove quotes
                    const protoFieldType = knownFields.get(fieldName);
                    // Check required fields
                    if (requiredFields.has(fieldName)) {
                        requiredFields.delete(fieldName);
                    } else if (!protoFieldType) {
                        diagnostics.push(errorDiagnostic(member, `Unexpected field ${fieldName}`));
                    }

                    if (protoFieldType) {
                        lint(valueNode, protoFieldType, text, diagnostics);
                    }

                    seenFields.set(fieldName, nameNode);
                }
                cursor.parent();
            }
        }
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
    node: tokenizer.SyntaxNode,
    protoDescriptor: ProtoRepeated,
    text: string,
    diagnostics: CodeMirrorLint.Diagnostic[],
) {
    if (node.type.name !== "Array") {
        diagnostics.push(errorDiagnostic(node, `Expected array, but got ${node.type.name.toLowerCase()}`));
        return;
    }

    const cursor = node.cursor();
    if (cursor.firstChild()) {
        do {
            if (cursor.node.type.name !== "[" && cursor.node.type.name !== "]") {
                // recursively lint children
                lint(cursor.node, protoDescriptor.repeatedType, text, diagnostics);
            }
        } while (cursor.nextSibling());
    }
}

function lintLiteral(
    node: tokenizer.SyntaxNode,
    protoDescriptor: ProtoLiteral,
    diagnostics: CodeMirrorLint.Diagnostic[],
): void {
    let expectedJsonType: string | undefined;
    switch (protoDescriptor.literalType) {
        case "string":
            expectedJsonType = "String";
            break;
    }

    if (!expectedJsonType) {
        diagnostics.push(errorDiagnostic(node, `Unknown protobuf type ${protoDescriptor.literalType}`));
    }

    if (protoDescriptor.literalType === "string" && node.type.name !== "String") {
        diagnostics.push(
            errorDiagnostic(
                node,
                `Expected type ${protoDescriptor.literalType} but got ${node.type.name.toLowerCase()}`,
            ),
        );
    }
}

function commaOr(opts: string[]) {
    if (opts.length < 2) {
        return opts.join("");
    }

    return `${opts.slice(0, -1).join(", ")} or ${opts[opts.length - 1]}`;
}

function errorDiagnostic(node: tokenizer.SyntaxNode, message: string): CodeMirrorLint.Diagnostic {
    return {
        severity: "error",
        message: message,
        from: node.from,
        to: node.to,
    };
}

export function defaultProtoObject(protoDescriptor: ProtoObject): unknown {
    if (protoDescriptor.type === "message") {
        const obj: Record<string, unknown> = {};
        for (const [name, field] of Object.entries(protoDescriptor.fields)) {
            if (field) {
                if (field.type === "oneof") {
                    // Only put in the first oneof
                    const options = Object.entries(field.fields);
                    const [optionName, optionType] = options[0];
                    obj[optionName] = defaultProtoObject(optionType);
                } else {
                    obj[name] = defaultProtoObject(field);
                }
            }
        }
        return obj;
    }

    if (protoDescriptor.type === "literal") {
        if (protoDescriptor.literalType === "string") {
            return "";
        }
        return 0;
    }

    if (protoDescriptor.type === "repeated") {
        return [];
    }
    if (protoDescriptor.type === "optional") {
        return defaultProtoObject(protoDescriptor.optionalType);
    }
    if (protoDescriptor.type === "enum") {
        return 0;
    }
    if (protoDescriptor.type === "oneof") {
        return "oneof";
    }
    assertNever(protoDescriptor);
}
