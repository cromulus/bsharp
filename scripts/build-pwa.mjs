import { readdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(e => e.isDirectory() ? walk(`${dir}/${e.name}`) : `${dir}/${e.name}`))).flat();
}
await copyFile('src/manifest.webmanifest', 'dist/manifest.webmanifest');
const files = ['dist/index.html', 'dist/bsharp.js', 'dist/style.css', 'dist/manifest.webmanifest', ...await walk('dist/static')].sort();
const template = await readFile('src/sw.js', 'utf8');
const hash = createHash('sha256').update(template);
for (const file of files) hash.update(file).update(await readFile(file));
await writeFile('dist/sw.js', template.replace('__VERSION__', hash.digest('hex').slice(0, 16)).replace('__ASSETS__', JSON.stringify(files.map(f => f.slice(5)))));
