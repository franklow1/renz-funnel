/* Two lines that say the same thing, both on the page in front of the same man. The
   copy is assembled out of four want-worlds and six blocker worlds, so a repeat can
   exist in the rendered page without existing anywhere in the source.
     node audit/repeats.mjs <url> [width] [seed js] */
import { spawn, execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { rmSync } from 'node:fs';
const URL_=process.argv[2], W=+(process.argv[3]||1440), SEED=process.argv[4]||'';
const PORT=9640+(process.pid%40), PROFILE='/tmp/_rzrep_'+process.pid;
const proc=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 ['--headless=new',`--remote-debugging-port=${PORT}`,'--no-first-run','--disable-gpu','--hide-scrollbars',
  '--lang=en-GB',`--window-size=${W},900`,`--user-data-dir=${PROFILE}`],{stdio:'ignore'});
function tidy(){try{execSync('pkill -9 -f '+JSON.stringify('user-data-dir='+PROFILE),{stdio:'ignore'});}catch(e){}
 try{proc.kill('SIGKILL');}catch(e){} try{rmSync(PROFILE,{recursive:true,force:true});}catch(e){}}
process.on('exit',tidy); await sleep(2600);
const list=await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(r=>ws.onopen=r); let id=0;const w=new Map();
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&w.has(m.id)){w.get(m.id)(m);w.delete(m.id);}};
const send=(m,p={})=>new Promise(r=>{const i=++id;w.set(i,r);ws.send(JSON.stringify({id:i,method:m,params:p}));});
const evl=async x=>(await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true}))?.result?.result?.value;
await send('Page.enable');await send('Runtime.enable');
await send('Page.addScriptToEvaluateOnNewDocument',{source:SEED});
await send('Emulation.setDeviceMetricsOverride',{width:W,height:900,deviceScaleFactor:1,mobile:W<760});
await send('Page.navigate',{url:URL_});
await sleep(8000);
const text=await evl("(function(){var r=document.getElementById('rz-page')||document.getElementById('rz-thanks')||document.getElementById('rz-upsell');return r?r.innerText:document.body.innerText;})()");
const sents=text.replace(/\s+/g,' ').split(/(?<=[.?!])\s+/).map(s=>s.trim())
  .filter(s=>s.split(' ').length>=6);
const key=s=>s.toLowerCase().replace(/[^a-z0-9 ]/g,'').split(' ').filter(Boolean);
const seen=new Map(); const hits=[];
sents.forEach((s,i)=>{
  const k=key(s).join(' ');
  if(seen.has(k)) hits.push({kind:'exact', gap:i-seen.get(k).i, a:seen.get(k).s, b:s});
  else seen.set(k,{i,s});
});
/* and near-repeats: most of the words in common, within fifty sentences of each other */
for(let i=0;i<sents.length;i++) for(let j=i+1;j<Math.min(sents.length,i+50);j++){
  const A=new Set(key(sents[i])), B=new Set(key(sents[j]));
  if(A.size<6||B.size<6) continue;
  let inter=0; A.forEach(x=>{ if(B.has(x)) inter++; });
  const jac=inter/(A.size+B.size-inter);
  if(jac>0.66 && key(sents[i]).join(' ')!==key(sents[j]).join(' '))
    hits.push({kind:'near '+jac.toFixed(2), gap:j-i, a:sents[i], b:sents[j]});
}
console.log(`=== ${URL_} @${W} ===  ${sents.length} sentences`);
if(!hits.length) console.log('  nothing repeats');
hits.forEach(h=>console.log(`  [${h.kind}, ${h.gap} sentences apart]\n     ${h.a.slice(0,96)}\n     ${h.b.slice(0,96)}`));
tidy(); process.exit(0);
