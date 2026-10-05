/* Every id the code reaches for, against every id the markup actually carries. A
   missing one is the quiet kind of fault: the line it would have written just never
   appears, and nothing is logged. Run it on the built files, because that is what
   ships, and the built file is where the two halves finally meet. */
import { readFileSync, readdirSync } from 'node:fs';
/* the veil and the mount come from the paste snippet, not from the markup this file
   injects, so the snippets count as markup for this purpose */
const SNIPPET_IDS = new Set();
for (const f of readdirSync('ghl')) {
  for (const m of readFileSync('ghl/' + f, 'utf8').matchAll(/\bid="([^"]+)"/g)) SNIPPET_IDS.add(m[1]);
}

const PAGES = [
  {js:'funnel.js', name:'funnel'},
  {js:'thanks.js', name:'thanks'},
  {js:'upsell.js', name:'upsell'},
];
let bad = 0;
for (const p of PAGES) {
  const src = readFileSync(p.js, 'utf8');
  /* the markup is a JS string literal inside the built file */
  const html = (src.match(/var HTML\s*=\s*"((?:[^"\\]|\\.)*)"/) || [])[1] || '';
  const markup = html ? JSON.parse('"' + html + '"') : '';
  const have = new Set(SNIPPET_IDS);
  for (const m of markup.matchAll(/\bid="([^"]+)"/g)) have.add(m[1]);
  /* ids the code also creates at runtime are fine, so collect those too */
  for (const m of src.matchAll(/\bid\s*=\s*['"]([A-Za-z][\w-]*)['"]/g)) have.add(m[1]);
  for (const m of src.matchAll(/id="([A-Za-z][\w-]*)"/g)) have.add(m[1]);
  /* ids the code holds in a constant and assigns later, e.g. var HOST_ID = 'rz-host' */
  for (const m of src.matchAll(/\b[A-Z][A-Z0-9_]*_ID\s*=\s*['"]([A-Za-z][\w-]*)['"]/g)) have.add(m[1]);
  const want = new Map();
  const add = (id, how) => { if (!want.has(id)) want.set(id, how); };
  for (const m of src.matchAll(/\$\(\s*'([A-Za-z][\w-]*)'\s*\)/g)) add(m[1], "$('…')");
  for (const m of src.matchAll(/getElementById\(\s*['"]([A-Za-z][\w-]*)['"]/g)) add(m[1], 'getElementById');
  for (const m of src.matchAll(/RZT?\.id\(\s*['"]([A-Za-z][\w-]*)['"]/g)) add(m[1], 'RZ.id');
  const missing = [...want].filter(([id]) => !have.has(id));
  console.log(`${p.name.padEnd(7)} ${want.size} ids reached for, ${have.size} in the markup -> ${missing.length ? missing.length + ' MISSING' : 'all present'}`);
  for (const [id, how] of missing) { console.log(`   ${how}  #${id}`); bad++; }
}
process.exit(bad ? 1 : 0);
