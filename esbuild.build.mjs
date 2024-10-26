import * as esbuild from "esbuild";
import { exec } from "child_process";
import { esBuildSettings } from "./esbuild.common.mjs";

exec("npx tsc --outDir out src/electron/electron-app.ts", (error, stdout) => {
    if (error) {
        console.log(error.message);
        console.log(stdout.toString());
    }
});

await esbuild.build(esBuildSettings);
