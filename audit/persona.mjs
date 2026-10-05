/* The page rewrites about forty lines out of his own answers. When that broke once,
   every visitor got the generic copy and nothing was logged. This walks a cross
   section of men through the page and checks three things on each:
     - no line is left holding a placeholder, an undefined or a NaN
     - the lines that are meant to change between men actually do
     - no console error
   One browser, many reloads, because launching Chrome is the slow part.
     node audit/persona.mjs [width] */
import { spawn, execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { rmSync } from 'node:fs';
const W=+(process.argv[2]||390);
const WANTS=['deals','respect','dates','easy'];
const BLOCKS=['fit','suits','goes','buy','time','none'];
const GOALS=['run','easy','best'];
const FITN=[0.7,0.4,0.12];
const MEN=[];
let k=0;
for (const want of WANTS) for (const block of BLOCKS) {
  MEN.push({want, block, goal:GOALS[k%3], fitn:FITN[k%3],
            n:[2,5,8][k%3], own:[12,70,180][k%3], worn:[5,21,54][k%3],
            work:[3,4,9][k%3], days:[3,7,23][k%3]});
  k++;
}
/* and the edges: the smallest closet and the largest, and a perfect score */
MEN.push({want:'easy',block:'none',goal:'easy',fitn:0.7,n:10,own:6,worn:3,work:3,days:30});
MEN.push({want:'deals',block:'fit',goal:'run',fitn:0.12,n:2,own:400,worn:120,work:3,days:3});

const PORT=9600+(process.pid%40), PROFILE='/tmp/_rzpr_'+process.pid;
const proc=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 ['--headless=new',`--remote-debugging-port=${PORT}`,'--no-first-run','--disable-gpu','--hide-scrollbars',
  '--lang=en-GB',`--window-size=${W},900`,`--user-data-dir=${PROFILE}`],{stdio:'ignore'});
function tidy(){try{execSync('pkill -9 -f '+JSON.stringify('user-data-dir='+PROFILE),{stdio:'ignore'});}catch(e){}
 try{proc.kill('SIGKILL');}catch(e){} try{rmSync(PROFILE,{recursive:true,force:true});}catch(e){}}
process.on('exit',tidy); await sleep(2700);
const list=await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(r=>ws.onopen=r); let id=0;const w=new Map(); let errs=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&w.has(m.id)){w.get(m.id)(m);w.delete(m.id);return;}
 if(m.method==='Runtime.exceptionThrown')errs.push(String(m.params.exceptionDetails.text).slice(0,90));
 if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')
   errs.push('console: '+((m.params.args[0]||{}).value||'').toString().slice(0,80));};
const send=(m,p={})=>new Promise(r=>{const i=++id;w.set(i,r);ws.send(JSON.stringify({id:i,method:m,params:p}));});
const evl=async x=>(await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true}))?.result?.result?.value;
await send('Page.enable');await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride',{width:W,height:900,deviceScaleFactor:1,mobile:W<760});

/* the lines that are supposed to be his, by id */
const WATCH=['h1','lede','sc-k','dk-h','dk-b1','dk-c1','mine','ch1-r','ch2-r','ch3-r',
             'cl-h','cl-b1','fk-do','fk-bk','ps-line','nots-h','sw-h','faq-lead','cutend','mg-r'];
const seen={}; WATCH.forEach(i=>seen[i]=new Set());
let fails=0;
for (let i=0;i<MEN.length;i++){
  const m=MEN[i]; errs=[];
  const score={name:'Marcus Webb',first:'Marcus',last:'Webb',email:'m@renztailors-sample.co.uk',
    n:m.n,total:m.n-0.3,worst:m.block==='none'?'fit':m.block,own:m.own,worn:m.worn,work:m.work,
    days:m.days,goal:m.goal,want:m.want,block:m.block,fitn:m.fitn,t:Date.now()};
  await send('Page.navigate',{url:'about:blank'}); await sleep(120);
  await send('Page.navigate',{url:'http://127.0.0.1:8777/funnel.html'}); await sleep(900);
  /* the page writes its own note of the last man it drew, so every key has to go or
     each man in this sweep inherits the one before him and they all look identical */
  await evl(`try{['renz_you','renz_score','renz_who','renz_crm_pending'].forEach(function(k){localStorage.removeItem(k);});
    localStorage.setItem('renz_who',JSON.stringify({f:'Marcus',l:'Webb'}));
    localStorage.setItem('renz_score',JSON.stringify(${JSON.stringify(score)}));}catch(e){};1`);
  await send('Page.navigate',{url:'http://127.0.0.1:8777/funnel.html?r='+i}); await sleep(7000);
  const r=await evl(`(function(){
    var t=document.getElementById('rz-page').innerText;
    var junk=(t.match(/\\bundefined\\b|\\bNaN\\b|\\bnull\\b|\\{\\{[^}]*\\}\\}|\\{[A-Z]+\\}/g)||[]);
    var got={}; ${JSON.stringify(WATCH)}.forEach(function(id){
      var e=document.getElementById(id); got[id]=e?e.textContent.replace(/\\s+/g,' ').trim():null; });
    return {junk:[...new Set(junk)], got:got, up:!document.getElementById('rz-page').hidden};})()`);
  Object.keys(r.got).forEach(id=>{ if(r.got[id]) seen[id].add(r.got[id]); });
  const ok = r.up && !r.junk.length && !errs.length;
  if(!ok){ fails++;
    console.log(`  ${String(i).padStart(2)} want=${m.want} block=${m.block} goal=${m.goal} fitn=${m.fitn}  *** ${r.junk.length?'junk '+JSON.stringify(r.junk):''} ${errs.length?errs[0]:''} ${r.up?'':'PAGE NOT UP'}`);
  }
}
console.log(`${MEN.length - fails}/${MEN.length} men clean`);
console.log('--- how many different versions of each line were written ---');
let flat=[];
WATCH.forEach(id=>{ const n=seen[id].size;
  console.log(`  ${id.padEnd(10)} ${n}`);
  if(n<=1) flat.push(id); });
if(flat.length) console.log('  ^ never changed between men:', flat.join(', '));
tidy(); process.exit(fails?1:0);
