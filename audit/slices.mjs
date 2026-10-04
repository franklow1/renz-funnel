/* Walk the page a screen at a time and capture each one, so composition can be
   judged the way a visitor meets it rather than as one impossible tall image.
     node audit/slices.mjs <url> <width> <height> <outdir> [seed js] */
import { spawn, execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { rmSync, writeFileSync, mkdirSync } from 'node:fs';

const URL_ = process.argv[2], W = +(process.argv[3] || 1440), H = +(process.argv[4] || 900);
const OUT = process.argv[5] || 'audit/shots/slices', SEED = process.argv[6] || '';
const PORT = 9320 + (process.pid % 160), PROFILE = '/tmp/_rzsl_' + process.pid;
const proc = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless=new', `--remote-debugging-port=${PORT}`, '--no-first-run', '--disable-gpu',
   '--hide-scrollbars', '--lang=en-GB', `--window-size=${W},${H}`, `--user-data-dir=${PROFILE}`],
  { stdio: 'ignore' });
function tidy(){ try{execSync('pkill -9 -f '+JSON.stringify('user-data-dir='+PROFILE),{stdio:'ignore'});}catch(e){}
  try{proc.kill('SIGKILL');}catch(e){} try{rmSync(PROFILE,{recursive:true,force:true});}catch(e){} }
process.on('exit', tidy);

await sleep(2600);
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const w = new Map(); const errs = [];
ws.onmessage = e => { const m = JSON.parse(e.data);
  if (m.id && w.has(m.id)) { w.get(m.id)(m); w.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails.text).slice(0,90)); };
const send = (m, p = {}) => new Promise(res => { const i = ++id; w.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const evl = async x => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }))?.result?.result?.value;

await send('Page.enable'); await send('Runtime.enable');
try { await send('Emulation.setLocaleOverride', { locale: 'en-GB' }); } catch {}
await send('Page.addScriptToEvaluateOnNewDocument', { source:
  "Object.defineProperty(navigator,'language',{get:()=>'en-GB'});" +
  "Object.defineProperty(navigator,'languages',{get:()=>['en-GB','en']});" + SEED });
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 760 });
await send('Page.navigate', { url: URL_ });
await sleep(9000);

const total = await evl('document.documentElement.scrollHeight');
mkdirSync(OUT, { recursive: true });
const step = Math.round(H * 0.92);
const n = Math.min(26, Math.ceil(total / step));
console.log(`page ${total}px at ${W}x${H} -> ${n} screens`);
for (let i = 0; i < n; i++) {
  await evl(`window.scrollTo(0, ${i * step});1`);
  await sleep(850);
  await evl("[].forEach.call(document.querySelectorAll('.rise,.stag'),function(e){e.classList.add('in')});1");
  await sleep(350);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/s${String(i).padStart(2, '0')}.png`, Buffer.from(shot.result.data, 'base64'));
}
console.log('errors:', errs.length ? errs[0] : 'none');
tidy(); process.exit(0);
