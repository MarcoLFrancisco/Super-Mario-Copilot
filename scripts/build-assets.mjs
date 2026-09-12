import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const mapPattern = /(<script type="importmap">)[\s\S]*?(<\/script>)/;
const stylePattern = /href="\.\/styles\.css(?:\?v=[^"]*)?"/;

function modulesIn(directory) {
  return readdirSync(new URL(directory, root), { withFileTypes: true }).flatMap(entry => {
    const path = `${directory}${entry.name}`;
    if (entry.isDirectory()) return modulesIn(`${path}/`);
    return /\.m?js$/.test(entry.name) ? [path] : [];
  });
}

export function assetManifest() {
  const modules = [...modulesIn('src/'), ...modulesIn('vendor/')].sort();
  const hash = createHash('sha256');
  for (const path of [...modules, 'styles.css']) {
    hash.update(path).update('\0').update(readFileSync(new URL(path, root))).update('\0');
  }
  const version = hash.digest('hex').slice(0, 16);
  return {
    version,
    imports: Object.fromEntries(modules.map(path => [`./${path}`, `./${path}?v=${version}`]))
  };
}

export function buildAssets() {
  const manifest = assetManifest();
  const path = new URL('index.html', root);
  const source = readFileSync(path, 'utf8');
  if (!mapPattern.test(source) || !stylePattern.test(source)) {
    throw new Error('The HTML import map or stylesheet link is missing.');
  }
  const output = source
    .replace(mapPattern, (match, opening, closing) => `${opening}\n${JSON.stringify({ imports: manifest.imports }, null, 2)}\n  ${closing}`)
    .replace(stylePattern, `href="./styles.css?v=${manifest.version}"`);
  if (output !== source) writeFileSync(path, output);
  return manifest;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const manifest = buildAssets();
  console.log(`Versioned ${Object.keys(manifest.imports).length} modules and CSS: ${manifest.version}`);
}