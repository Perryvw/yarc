import { expect, test } from "vitest";
import { substituteVariables } from "../src/renderer/src/util/substitute-variables";

test("no variables", () => {
    expect(substituteVariables("hello!", [])).toBe("hello!");
});

test("all variable", () => {
    expect(substituteVariables("{hello}", [{ enabled: true, key: "hello", value: "world" }])).toBe("world");
});

test("substitute multiple variables", () => {
    const substitutions = [
        { enabled: true, key: "abc", value: "hello" },
        { enabled: true, key: "def", value: "world" },
    ];
    expect(substituteVariables("{abc}, {def}!", substitutions)).toBe("hello, world!");
});

test("does not replace unknown variables", () => {
    expect(substituteVariables("{blabla}", [{ enabled: true, key: "hello", value: "world" }])).toBe("{blabla}");
});

test("works in the middle of a string", () => {
    const substitutions = [
        { enabled: true, key: "host", value: "127.0.0.1" },
        { enabled: true, key: "port", value: "8080" },
    ];
    expect(substituteVariables("https://{host}:{port}/path", substitutions)).toBe("https://127.0.0.1:8080/path");
});

test("multiple options but only one enabled", () => {
    const substitutions = [
        { enabled: false, key: "host", value: "127.0.0.1" },
        { enabled: true, key: "host", value: "myremote" },
        { enabled: false, key: "host", value: "alternate-remote" },
    ];
    expect(substituteVariables("{host}", substitutions)).toBe("myremote");
});
