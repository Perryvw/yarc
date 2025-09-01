import { describe, expect, test } from "vitest";
import { parseProtoFile } from "../src/electron/Communication/proto";

describe("myproto.proto", async () => {
    const content = assertSuccess(await parseProtoFile("myproto.proto", `${__dirname}/protos`));
    const greeterService = content.services[0];

    test("has expected service", () => {
        expect(content.services).toHaveLength(1);
        expect(greeterService.name).toBe("greet.Greeter");
    });

    test("has expected methods", () => {
        const methodNames = greeterService.methods.map((m) => m.name);
        expect(methodNames).toEqual(
            expect.arrayContaining(["SayHello", "StreamHello", "BiDirectionalStream", "TestNested"]),
        );
    });

    test("server/request streaming", () => {
        const sayHello = greeterService.methods.find((m) => m.name === "SayHello");
        expect(sayHello?.requestStream).toBe(false);
        expect(sayHello?.serverStream).toBe(false);

        const streamHello = greeterService.methods.find((m) => m.name === "StreamHello");
        expect(streamHello?.requestStream).toBe(false);
        expect(streamHello?.serverStream).toBe(true);

        const biDirectional = greeterService.methods.find((m) => m.name === "BiDirectionalStream");
        expect(biDirectional?.requestStream).toBe(true);
        expect(biDirectional?.serverStream).toBe(true);
    });

    test("SayHello request type", () => {
        const sayHello = greeterService.methods.find((m) => m.name === "SayHello")!;
        const requestType = sayHello.requestType!;

        expect(requestType).toBeDefined();
        expect(requestType).toEqual({
            type: "message",
            name: "HelloRequest",
            fields: {
                name: {
                    id: 1,
                    name: "name",
                    type: { type: "literal", literalType: "string" },
                },
            },
        });
    });

    test("SayHello response type", () => {
        const sayHello = greeterService.methods.find((m) => m.name === "SayHello")!;
        const responseType = sayHello.responseType!;

        expect(responseType).toBeDefined();
        expect(responseType).toEqual({
            type: "message",
            name: "HelloReply",
            fields: {
                message: {
                    id: 1,
                    name: "message",
                    type: { type: "literal", literalType: "string" },
                },
            },
        });
    });

    test("nested response type", () => {
        const testNested = greeterService.methods.find((m) => m.name === "TestNested");
        const requestType = testNested?.requestType!;

        const helloRequestType = {
            type: "message",
            name: "HelloRequest",
            fields: {
                name: {
                    id: 1,
                    name: "name",
                    type: { type: "literal", literalType: "string" },
                },
            },
        };

        const helloReplyType = {
            type: "message",
            name: "HelloReply",
            fields: {
                message: {
                    id: 1,
                    name: "message",
                    type: { type: "literal", literalType: "string" },
                },
            },
        };

        expect(requestType).toEqual({
            type: "message",
            name: "NestedRequest",
            fields: {
                reply: {
                    id: 1,
                    name: "reply",
                    type: helloReplyType,
                },
                request2: {
                    id: 2,
                    name: "request2",
                    type: { type: "optional", optionalType: helloRequestType },
                },
                testoneof: {
                    id: 0,
                    name: "testoneof",
                    type: {
                        type: "oneof",
                        fields: {
                            reply3: {
                                id: 3,
                                name: "reply3",
                                type: helloReplyType,
                            },
                            request4: {
                                id: 4,
                                name: "request4",
                                type: helloRequestType,
                            },
                        },
                    },
                },
                replies: {
                    id: 5,
                    name: "replies",
                    type: { type: "repeated", repeatedType: helloReplyType },
                },
            },
        });
    });

    test("test enums", () => {
        const testEnums = greeterService.methods.find((m) => m.name === "TestEnums");
        const requestType = testEnums?.requestType!;

        expect(requestType).toBeDefined();
        expect(requestType).toEqual({
            type: "message",
            name: "MessageWithEnums",
            fields: {
                globalEnum: {
                    id: 0,
                    name: "globalEnum",
                    type: {
                        type: "enum",
                        name: "GlobalEnum",
                        values: [
                            { name: "A", value: 0 },
                            { name: "B", value: 1 },
                            { name: "C", value: 2 },
                        ],
                    },
                },
                nestedEnum: {
                    id: 1,
                    name: "nestedEnum",
                    type: {
                        type: "optional",
                        optionalType: {
                            type: "enum",
                            name: "NestedEnum",
                            values: [
                                { name: "X", value: 0 },
                                { name: "Y", value: 1 },
                                { name: "Z", value: 2 },
                            ],
                        },
                    },
                },
            },
        });
    });
});

describe("sibling1/nestedproto1.proto", async () => {
    const content = assertSuccess(await parseProtoFile("sibling1/nestedproto1.proto", `${__dirname}/protos`));
    const nestedService = content.services[0];

    test("has expected service", () => {
        expect(nestedService).toBeDefined();
        expect(nestedService.name).toBe("NestedService");
    });

    test("has correctly resolved types", () => {
        const sayHello = nestedService.methods.find((m) => m.name === "SayHello");

        expect(sayHello).toBeDefined();
        expect(sayHello?.requestType).toEqual({
            type: "message",
            name: "MessageUsingParent",
            fields: {
                helloRequest: {
                    id: 1,
                    name: "helloRequest",
                    type: {
                        type: "message",
                        name: "HelloRequest",
                        fields: {
                            name: {
                                id: 1,
                                name: "name",
                                type: { type: "literal", literalType: "string" },
                            },
                        },
                    },
                },
            },
        });
        expect(sayHello?.responseType).toEqual({
            type: "message",
            name: "MessageUsingSibling",
            fields: {
                sibling: {
                    id: 1,
                    name: "sibling",
                    type: {
                        type: "message",
                        name: "SiblingMessage",
                        fields: {
                            oneofthese: {
                                id: 0,
                                name: "oneofthese",
                                type: {
                                    type: "oneof",
                                    fields: {
                                        b: { id: 1, name: "b", type: { type: "literal", literalType: "bool" } },
                                        i: { id: 2, name: "i", type: { type: "literal", literalType: "int32" } },
                                    },
                                },
                            },
                            doubles: {
                                id: 3,
                                name: "doubles",
                                type: { type: "repeated", repeatedType: { type: "literal", literalType: "double" } },
                            },
                        },
                    },
                },
            },
        });
    });
});

test("proto with invalid syntax", async () => {
    const result = await parseProtoFile("invalidsyntax.proto", `${__dirname}/protos`);
    if (result.success) {
        expect(result.success).toBe(false);
    } else {
        expect(result.error).toContain("illegal token");
    }
});

test("proto with missing types", async () => {
    const result = await parseProtoFile("invalidsemantics.proto", `${__dirname}/protos`);
    if (result.success) {
        expect(result.success).toBe(false);
    } else {
        expect(result.error).toContain("Error: no such type: NotExistingRequest");
    }
});

test("proto with not-existing import", async () => {
    const result = await parseProtoFile("non-existing-import.proto", `${__dirname}/protos`);
    if (result.success) {
        expect(result.success).toBe(false);
    } else {
        expect(result.error).toContain("no such file or directory");
        expect(result.error).toContain("this-proto-does-not-exist.proto");
    }
});

test("using well-known types", async () => {
    const result = assertSuccess(await parseProtoFile("using-well-known-types.proto", `${__dirname}/protos`));
    expect(result.services).toHaveLength(1);
    expect(result.services[0].methods[0].name).toBe("Empty");
});

function assertSuccess<T, TErr>(result: Result<T, TErr>): T {
    if (result.success) {
        return result.value;
    }
    expect(result.error).toBe(undefined);
    throw "Failed";
}
