#!/usr/bin/env node
/* =====================================================================
   source -> dist.  The inverse of extract.mjs. Writes the three files
   that GoHighLevel actually loads.

     node tools/build.mjs          write the built files
     node tools/build.mjs --check  do not write, just say whether the
                                   source still rebuilds what is
                                   committed, byte for byte

   --check is the one that matters. A green --check means the source in
   src/ is a true source and not a stale copy of it.
   ===================================================================== */
import { writeFileSync } from 'node:fs';
import { PAGES, join, read } from './lib.mjs';

const check = process.argv.includes('--check');
let bad = 0;

for (const [name, p] of Object.entries(PAGES)) {
  const dir = 'src/' + name;
  const out = join(read(dir + '/loader.js'), read(dir + '/page.css'), read(dir + '/page.html'));
  if (check) {
    const now = read(p.js);
    const same = out === now;
    if (!same) bad++;
    console.log((same ? 'ok    ' : 'DRIFT ') + name.padEnd(7) + p.js +
      (same ? '' : '  built ' + now.length + ' bytes, source rebuilds to ' + out.length));
  } else {
    writeFileSync(p.js, out);
    console.log('wrote ' + p.js + '  ' + out.length + ' bytes');
  }
}
if (check) {
  console.log(bad ? '\n' + bad + ' file(s) drifted. Run tools/extract.mjs to pull the hand edits back into src/.'
                  : '\nall three rebuild byte for byte.');
  process.exit(bad ? 1 : 0);
}
