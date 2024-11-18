import { expect, test } from "vitest";
import { substituteVariables } from "../src/renderer/src/util/substitute-variables";

test("no variables", () => {
    expect(substituteVariables("hello!", [])).toBe("hello!");
});

test("all variable", () => {
    expect(substituteVariables("{hello}", [{ name: "hello", value: "world" }])).toBe("world");
});

test("substitute multiple variables", () => {
    const substitutions = [
        { name: "abc", value: "hello" },
        { name: "def", value: "world" },
    ];
    expect(substituteVariables("{abc}, {def}!", substitutions)).toBe("hello, world!");
});

test("does not replace unknown variables", () => {
    expect(substituteVariables("{blabla}", [{ name: "hello", value: "world" }])).toBe("{blabla}");
});

test("works in the middle of a string", () => {
    const substitutions = [
        { name: "host", value: "127.0.0.1" },
        { name: "port", value: "8080" },
    ];
    expect(substituteVariables("https://{host}:{port}/path", substitutions)).toBe("https://127.0.0.1:8080/path");
});
