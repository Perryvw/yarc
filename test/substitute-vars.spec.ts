import { expect, test } from "vitest";
import { substituteVariables } from "../src/renderer/src/util/substitute-variables";

test("no variables", () => {
    expect(substituteVariables("hello!", [])).toBe("hello!");
});

test("all variable", () => {
    expect(substituteVariables("{hello}", [{ key: "hello", value: "world" }])).toBe("world");
});

test("substitute multiple variables", () => {
    const substitutions = [
        { key: "abc", value: "hello" },
        { key: "def", value: "world" },
    ];
    expect(substituteVariables("{abc}, {def}!", substitutions)).toBe("hello, world!");
});

test("does not replace unknown variables", () => {
    expect(substituteVariables("{blabla}", [{ key: "hello", value: "world" }])).toBe("{blabla}");
});

test("works in the middle of a string", () => {
    const substitutions = [
        { key: "host", value: "127.0.0.1" },
        { key: "port", value: "8080" },
    ];
    expect(substituteVariables("https://{host}:{port}/path", substitutions)).toBe("https://127.0.0.1:8080/path");
});
