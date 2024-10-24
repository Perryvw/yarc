import * as esbuild from 'esbuild';
import { exec } from 'child_process';

exec("npx tsc --outDir out src/electron-app.ts", (error, stdout) => {
  if (error) {
    console.log(error.message);
    console.log(stdout.toString());
  }
});

await esbuild.build({
  entryPoints: ['src/react-app.ts'],
  bundle: true,
  outdir: 'out',
  sourcemap: true,
});
