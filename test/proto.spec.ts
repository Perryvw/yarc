import { describe, expect, test } from "vitest";
import { parseProtoFile } from "../src/electron/Communication/proto";

describe("myproto.proto", async () => {
    const content = await parseProtoFile("myproto.proto", `${__dirname}/protos`);
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
                name: { type: "literal", literalType: "string" },
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
                message: { type: "literal", literalType: "string" },
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
                name: { type: "literal", literalType: "string" },
            },
        };

        const helloReplyType = {
            type: "message",
            name: "HelloReply",
            fields: {
                message: { type: "literal", literalType: "string" },
            },
        };

        expect(requestType).toEqual({
            type: "message",
            name: "NestedRequest",
            fields: {
                reply: helloReplyType,
                request2: { type: "optional", optionalType: helloRequestType },
                testoneof: {
                    type: "oneof",
                    fields: {
                        reply3: helloReplyType,
                        request4: helloRequestType,
                    },
                },
                replies: { type: "repeated", repeatedType: helloReplyType },
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
                    type: "enum",
                    name: "GlobalEnum",
                    values: [
                        { name: "A", value: 0 },
                        { name: "B", value: 1 },
                        { name: "C", value: 2 },
                    ],
                },
                nestedEnum: {
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
        });
    });
});

describe("sibling1/nestedproto1.proto", async () => {
    const content = await parseProtoFile("sibling1/nestedproto1.proto", `${__dirname}/protos`);
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
                    type: "message",
                    name: "HelloRequest",
                    fields: {
                        name: { type: "literal", literalType: "string" },
                    },
                },
            },
        });
        expect(sayHello?.responseType).toEqual({
            type: "message",
            name: "MessageUsingSibling",
            fields: {
                sibling: {
                    type: "message",
                    name: "SiblingMessage",
                    fields: {
                        oneofthese: {
                            type: "oneof",
                            fields: {
                                b: { type: "literal", literalType: "bool" },
                                i: { type: "literal", literalType: "int32" },
                            },
                        },
                        doubles: { type: "repeated", repeatedType: { type: "literal", literalType: "double" } },
                    },
                },
            },
        });
    });
});
