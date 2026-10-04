import { spawn, execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { rmSync } from 'node:fs';
const URL_=process.argv[2], W=+(process.argv[3]||1280), H=+(process.argv[4]||900);
const SEED=process.argv[5]||'';
const EXPR=process.argv[6]||'1';
const PORT=9700+(process.pid%250), PROFILE='/tmp/_rzct_'+process.pid;
const proc=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 ['--headless=new',`--remote-debugging-port=${PORT}`,'--no-first-run','--disable-gpu',
  '--hide-scrollbars','--lang=en-GB',`--window-size=${W},${H}`,`--user-data-dir=${PROFILE}`],{stdio:'ignore'});
function tidy(){ try{execSync('pkill -9 -f '+JSON.stringify('user-data-dir='+PROFILE),{stdio:'ignore'});}catch(e){}
  try{proc.kill('SIGKILL');}catch(e){} try{rmSync(PROFILE,{recursive:true,force:true});}catch(e){} }
process.on('exit',tidy);
await sleep(2600);
const list=await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(r=>ws.onopen=r);
let id=0; const w=new Map(); const errs=[]; const logs=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);
  if(m.id&&w.has(m.id)){w.get(m.id)(m);w.delete(m.id);return;}
  if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails;
    errs.push(String(d.exception?.description||d.text).split('\n')[0].slice(0,160));}
  if(m.method==='Runtime.consoleAPICalled'&&['error','warning'].includes(m.params.type))
    logs.push(m.params.type+': '+(m.params.args||[]).map(a=>a.value??a.description).join(' ').slice(0,160));};
const send=(m,p={})=>new Promise(res=>{const i=++id;w.set(i,res);ws.send(JSON.stringify({id:i,method:m,params:p}));});
const evl=async x=>(await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true}))?.result?.result;
await send('Page.enable'); await send('Runtime.enable');
try{ await send('Emulation.setLocaleOverride',{locale:'en-GB'}); }catch(e){}
await send('Page.addScriptToEvaluateOnNewDocument',{source:
  "Object.defineProperty(navigator,'language',{get:()=>'en-GB'});"+
  "Object.defineProperty(navigator,'languages',{get:()=>['en-GB','en']});"+SEED});
await send('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:1,mobile:W<760});
await send('Page.navigate',{url:URL_});
await sleep(7000);
const r=await evl(EXPR);
console.log(JSON.stringify(r?.value ?? r, null, 1));
console.log('PAGE ERRORS:', errs.length?errs:'none');
console.log('CONSOLE:', logs.length?logs:'none');
tidy(); process.exit(0);
