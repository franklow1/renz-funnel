/* =====================================================================
   The pieces both tools need. No dependencies, on purpose: this has to
   still run on a laptop with nothing installed on it.
   ===================================================================== */
import { readFileSync } from 'node:fs';

export const PAGES = {
  funnel: { js: 'funnel.js', title: 'The Style Solve',      bg: '#EFECE4', mount: 'rz-mount' },
  thanks: { js: 'thanks.js', title: "You're In",            bg: '#F4F1EA', mount: 'rz-thanks-mount' },
  upsell: { js: 'upsell.js', title: 'The Buyer',            bg: '#F4F1EA', mount: 'rz-upsell-mount' }
};

/* Read one JS string literal starting at `i` (which must be the opening quote).
   Returns the decoded text and the index just past the closing quote. A hand
   written regex gets this wrong the moment the CSS contains a quote, and the
   CSS contains plenty, so walk it a character at a time instead. */
export function readLiteral(src, i) {
  const q = src[i];
  if (q !== '"' && q !== "'") throw new Error('not a string literal at ' + i);
  let out = '', k = i + 1;
  while (k < src.length) {
    const c = src[k];
    if (c === '\\') {
      const n = src[k + 1];
      if (n === 'n') out += '\n';
      else if (n === 't') out += '\t';
      else if (n === 'r') out += '\r';
      else if (n === 'u') { out += String.fromCharCode(parseInt(src.slice(k + 2, k + 6), 16)); k += 4; }
      else out += n;
      k += 2; continue;
    }
    if (c === q) return { text: out, end: k + 1 };
    out += c; k++;
  }
  throw new Error('unterminated string literal');
}

/* The inverse. Only escapes what has to be escaped, so a diff of two builds
   stays readable. */
export function writeLiteral(text) {
  return '"' + text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029') + '"';
}

/* Split a built loader into its three parts: the CSS, the HTML, and
   everything else, with a marker left where each literal was. */
export function split(js) {
  const find = (name) => {
    const m = new RegExp('var\\s+' + name + '\\s*=\\s*').exec(js);
    if (!m) throw new Error('no ' + name + ' declaration');
    const q = m.index + m[0].length;
    const { text, end } = readLiteral(js, q);
    return { text, from: q, to: end };
  };
  const css = find('CSS');
  const html = find('HTML');
  if (html.from < css.from) throw new Error('HTML before CSS: unexpected shape');
  const loader =
    js.slice(0, css.from) + '/*@CSS@*/' +
    js.slice(css.to, html.from) + '/*@HTML@*/' +
    js.slice(html.to);
  return { css: css.text, html: html.text, loader };
}

export function join(loader, css, html) {
  if (!loader.includes('/*@CSS@*/') || !loader.includes('/*@HTML@*/'))
    throw new Error('loader has lost its markers');
  return loader
    .replace('/*@CSS@*/', writeLiteral(css))
    .replace('/*@HTML@*/', writeLiteral(html));
}

export const read = (p) => readFileSync(p, 'utf8');
