import * as esbuild from 'esbuild';
import { esBuildSettings } from './esbuild.common.mjs';

let ctx = await esbuild.context(esBuildSettings);

await ctx.watch();
