// Build: precompile the in-browser Babel JSX to plain JS for deployment.
// Output goes to dist/ — index.html references app.js?v=<sha> instead of
// compiling 4900 lines of JSX on the user's phone at every load.
import { transformSync } from '@babel/core';
import fs from 'fs';
import path from 'path';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const DIST = path.join(ROOT, 'dist');
const VERSION = (process.env.GITHUB_SHA || String(Date.now())).slice(0, 10);

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const OPEN = '<script type="text/babel" data-presets="react">';
const start = html.indexOf(OPEN);
if (start < 0) throw new Error('babel script tag not found');
const end = html.indexOf('</script>', start);
if (end < 0) throw new Error('babel script close tag not found');

const jsx = html.slice(start + OPEN.length, end);
const { code } = transformSync(jsx, {
  presets: [['@babel/preset-react', { runtime: 'classic' }]],
  compact: false,
  babelrc: false,
  configFile: false,
});

let outHtml =
  html.slice(0, start) +
  `<script defer src="./app.js?v=${VERSION}"></script>` +
  html.slice(end + '</script>'.length);

// Babel standalone no longer needed in the built page
outHtml = outHtml.replace(/<script src="[^"]*babel[^"]*"><\/script>\s*/g, '');

// Version the manifest URL so HTTP caches (GitHub Pages 10-min cache, Google's
// WebAPK minter) never serve a stale manifest after a deploy
outHtml = outHtml.replace('href="./manifest.json"', `href="./manifest.json?v=${VERSION}"`);

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'index.html'), outHtml);
fs.writeFileSync(path.join(DIST, 'app.js'), code);

for (const f of ['sw.js', 'manifest.json', 'icon-192.png', 'icon-512.png', 'reset.html']) {
  const src = path.join(ROOT, f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(DIST, f));
}

console.log(`built dist/ (app.js ${(code.length / 1024).toFixed(0)}kb, v=${VERSION})`);
