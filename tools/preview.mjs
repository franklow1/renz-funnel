#!/usr/bin/env node
/* =====================================================================
   A page you can actually open.  GoHighLevel is not a place to test
   anything, so this writes each page as a bare document carrying the
   exact paste snippet that lives in the builder, pointed at the built
   file next to it instead of at GitHub Pages.

     preview/<page>.html

   Nothing is stubbed. The loader sees no builder app, so it paints
   straight into the mount and settles, which is the path it already
   takes on a page with no checkout on it. So the preview is honest
   about everything except the checkout itself: for the order form,
   the bumps and the money, test the live GHL page.
   ===================================================================== */
import { writeFileSync, mkdirSync, copyFileSync, cpSync, rmSync, existsSync } from 'node:fs';
import { PAGES, read } from './lib.mjs';

mkdirSync('preview', { recursive: true });

/* the images and the scan the pages reference, mirrored exactly as GitHub Pages
   serves them. Removed first: copying a folder onto an existing one of the same
   name nests it, and then every asset 404s while the page looks fine locally. */
if (existsSync('img')) {
  rmSync('preview/img', { recursive: true, force: true });
  cpSync('img', 'preview/img', { recursive: true });
}

for (const [name, p] of Object.entries(PAGES)) {
  copyFileSync(p.js, 'preview/' + p.js);
  const page =
`<!doctype html>
<html lang="en-GB"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${p.title} &mdash; preview</title>
</head><body>

<!-- ============================================================
     Below this line is the paste snippet, character for character
     as it sits in the GoHighLevel page, except that the src points
     next door instead of at GitHub Pages. Keep the two in step.
     ============================================================ -->
<style id="rz-veil-css">html,body{background:${p.bg}!important}#rz-veil{position:fixed;top:0;right:0;bottom:0;left:0;z-index:2147483000;background:${p.bg}}</style>
<div id="rz-veil"></div>
<div id="${p.mount}"></div>
<script src="./${p.js}" defer></script>

</body></html>`;
  writeFileSync('preview/' + name + '.html', page);
  console.log('preview/' + name + '.html');
}

/* the preview server pins its own origin root, so give it something to land on */
writeFileSync('preview/index.html',
`<!doctype html><html lang="en-GB"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Renz previews</title>
<style>
 body{margin:0;padding:48px 24px;background:#F4F1EA;color:#15130F;
  font:400 17px/29px "Libre Caslon Text",Georgia,serif}
 ul{max-width:420px;margin:0 auto;padding:0;list-style:none;
  border-top:1px solid #15130F}
 li{border-bottom:1px solid #D5CFC2}
 a{display:block;padding:18px 0;color:#15130F;text-decoration:none}
 a:hover{color:#73572F}
 b{display:block;font:600 11px/1.6 Cabin,system-ui,sans-serif;
  letter-spacing:.2em;text-transform:uppercase;color:#73572F}
</style></head><body><ul>
${Object.entries(PAGES).map(([n, p]) =>
 `<li><a href="./${n}.html"><b>${n}</b>${p.title}</a></li>`).join('\n')}
</ul></body></html>`);
copyFileSync('preview/funnel.html', 'preview/index.html');
console.log('preview/index.html  (funnel at the root)');
