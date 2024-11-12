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

    test("SayHello request type", () => {
        const sayHello = greeterService.methods.find((m) => m.name === "SayHello")!;
        const requestType = sayHello.requestType!;

        expect(requestType).toBeDefined();
        expect(requestType).toEqual({
            type: "message",
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
            fields: {
                message: { type: "literal", literalType: "string" },
            },
        });
    });
});
