/* Full page screenshots of the local preview, at any width.
   Headless Chrome here reports es-419 and leaves through a Spanish address, so the
   locale is forced twice: once on the emulator and once over navigator, or anything
   that adapts to the visitor screenshots in Spanish and reads as a live defect.
   proc.kill() does not stop Chrome either: it re-execs to PPID 1 with its helpers,
   so the profile path is pkill'd before it is deleted. */
import { spawn, execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { rmSync, writeFileSync, mkdirSync } from 'node:fs';

const URL_   = process.argv[2] || 'http://127.0.0.1:8744/funnel.html';
const W      = +(process.argv[3] || 1280);
const H      = +(process.argv[4] || 900);
const OUT    = process.argv[5] || 'audit/shots/shot.png';
const SCROLL = process.argv[6] || '';          // css selector to scroll to, or 'full'
const SEED   = process.argv[7] || '';          // js run before the page loads

const PORT = 9300 + (process.pid % 600), PROFILE = '/tmp/_rzshot_' + process.pid;
const proc = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 ['--headless=new', `--remote-debugging-port=${PORT}`, '--no-first-run', '--disable-gpu',
  '--hide-scrollbars', '--lang=en-GB', '--force-device-scale-factor=1',
  `--window-size=${W},${H}`, `--user-data-dir=${PROFILE}`], {stdio:'ignore'});
function tidy(){
  try{ execSync('pkill -9 -f ' + JSON.stringify('user-data-dir=' + PROFILE), {stdio:'ignore'}); }catch(e){}
  try{ proc.kill('SIGKILL'); }catch(e){}
  try{ rmSync(PROFILE,{recursive:true,force:true}); }catch(e){}
}
process.on('exit', tidy); process.on('SIGINT', ()=>{ tidy(); process.exit(130); });

await sleep(2600);
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const ws = new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id=0; const w=new Map(); const errs=[];
ws.onmessage = e => { const m=JSON.parse(e.data);
  if(m.id&&w.has(m.id)){ w.get(m.id)(m); w.delete(m.id); return; }
  if(m.method==='Runtime.exceptionThrown'){
    const d=m.params.exceptionDetails;
    errs.push(String(d.exception?.description||d.text).split('\n')[0].slice(0,140)); } };
const send=(m,p={})=>new Promise(res=>{const i=++id;w.set(i,res);ws.send(JSON.stringify({id:i,method:m,params:p}));});
const evl=async x=>(await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true}))?.result?.result?.value;

await send('Page.enable'); await send('Runtime.enable');
try{ await send('Emulation.setLocaleOverride',{locale:'en-GB'}); }catch(e){}
await send('Page.addScriptToEvaluateOnNewDocument',{source:
  "Object.defineProperty(navigator,'language',{get:()=>'en-GB'});"+
  "Object.defineProperty(navigator,'languages',{get:()=>['en-GB','en']});"});
if(SEED) await send('Page.addScriptToEvaluateOnNewDocument',{source:SEED});
await send('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:1,mobile:W<760});
await send('Page.navigate',{url:URL_});
await sleep(W<760 ? 7000 : 7000);
await evl("[].forEach.call(document.querySelectorAll('.rise,.stag'),function(e){e.classList.add('in')});1");
if(SCROLL && SCROLL!=='full'){
  await evl(`(function(){var e=document.querySelector(${JSON.stringify(SCROLL)});
    if(e){e.scrollIntoView({block:'center'});} return !!e;})()`);
  await sleep(900);
}
mkdirSync(OUT.replace(/\/[^/]*$/,''),{recursive:true});
let shot;
if(SCROLL==='full'){
  const m=await send('Page.getLayoutMetrics');
  const full=Math.min(16000, Math.ceil(m.result.cssContentSize.height));
  await send('Emulation.setDeviceMetricsOverride',{width:W,height:full,deviceScaleFactor:1,mobile:W<760});
  await sleep(800);
  shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
}else{
  shot=await send('Page.captureScreenshot',{format:'png'});
}
writeFileSync(OUT, Buffer.from(shot.result.data,'base64'));
console.log(OUT, '  errors:', errs.length ? errs[0] : 'none');
tidy(); process.exit(0);
