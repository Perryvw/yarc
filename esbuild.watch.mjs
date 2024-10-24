import * as esbuild from 'esbuild';

let ctx = await esbuild.context({
  entryPoints: ['src/react-app.ts'],
  bundle: true,
  outdir: 'out',
  sourcemap: true,
});

await ctx.watch();