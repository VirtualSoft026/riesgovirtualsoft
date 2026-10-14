import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const entry = path.resolve(here, '../src/entry.js');
const outfile = path.resolve(here, 'dist/riskops.bundle.js');

const result = await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: 'iife',
    globalName: 'RiskOps',
    platform: 'browser',
    target: ['es2019'],
    minify: false,
    sourcemap: false,
    legalComments: 'none',
    logLevel: 'info',
    metafile: true
});

const inputs = Object.keys(result.metafile.inputs).length;
console.log(`BUNDLE_OK ${path.relative(process.cwd(), outfile)} (${inputs} módulos)`);
