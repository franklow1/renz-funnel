#!/usr/bin/env node
/* =====================================================================
   dist -> source.  Takes the three built loaders at the root of this
   repo and pulls each one apart into the three files a person can
   actually edit:

     src/<page>/page.css    the stylesheet
     src/<page>/page.html   the markup
     src/<page>/loader.js   everything else, with a marker where each
                            of the two went

   Run this once after a hand edit to a built file, so the source and
   the built file never drift apart.
   ===================================================================== */
import { writeFileSync, mkdirSync } from 'node:fs';
import { PAGES, split, read } from './lib.mjs';

for (const [name, p] of Object.entries(PAGES)) {
  const { css, html, loader } = split(read(p.js));
  const dir = 'src/' + name;
  mkdirSync(dir, { recursive: true });
  writeFileSync(dir + '/page.css', css);
  writeFileSync(dir + '/page.html', html);
  writeFileSync(dir + '/loader.js', loader);
  console.log(name.padEnd(7),
    'css', String(css.length).padStart(7),
    'html', String(html.length).padStart(7),
    'loader', String(loader.length).padStart(7));
}
