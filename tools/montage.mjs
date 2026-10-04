/* No ImageMagick on this machine, and judging composition one screen at a time
   loses the thing you are judging. Lay the slices out as a contact sheet in the
   same headless Chrome the slices came from, and screenshot that.
     node tools/montage.mjs <dir> <out.png> [cols] [cellW] */
import { spawn, execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { rmSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
const DIR = resolve(process.argv[2]), OUT = process.argv[3] || 'sheet.png';
const COLS = +(process.argv[4] || 4), CW = +(process.argv[5] || 340);
const files = readdirSync(DIR).filter(f => /\.png$/.test(f)).sort();
const html = `<style>html,body{margin:0;background:#2A2A28;font:11px/1.2 system-ui}
 .g{display:grid;grid-template-columns:repeat(${COLS},${CW}px);gap:10px;padding:10px}
 figure{margin:0}figcaption{color:#DDD;padding:2px 0}
 img{width:${CW}px;display:block;border:1px solid #555}</style><div class="g">` +
 files.map(f => `<figure><figcaption>${f}</figcaption><img src="file://${DIR}/${f}"></figure>`).join('') + '</div>';
const page = '/tmp/_rzmont_' + process.pid + '.html'; writeFileSync(page, html);
const PORT = 9700 + (process.pid % 200), PROFILE = '/tmp/_rzmt_' + process.pid;
const proc = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless=new', `--remote-debugging-port=${PORT}`, '--no-first-run', '--disable-gpu',
   '--hide-scrollbars', '--allow-file-access-from-files', `--user-data-dir=${PROFILE}`], { stdio: 'ignore' });
function tidy(){ try{execSync('pkill -9 -f '+JSON.stringify('user-data-dir='+PROFILE),{stdio:'ignore'});}catch(e){}
  try{proc.kill('SIGKILL');}catch(e){} try{rmSync(PROFILE,{recursive:true,force:true});}catch(e){}
  try{rmSync(page,{force:true});}catch(e){} }
process.on('exit', tidy);
await sleep(2600);
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const w = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && w.has(m.id)) { w.get(m.id)(m); w.delete(m.id); } };
const send = (m, p = {}) => new Promise(res => { const i = ++id; w.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
await send('Page.enable');
await send('Page.navigate', { url: 'file://' + page });
await sleep(3500);
const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
writeFileSync(OUT, Buffer.from(shot.result.data, 'base64'));
console.log(OUT, files.length, 'slices');
tidy(); process.exit(0);
