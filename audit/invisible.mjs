/* A reveal that never fires takes its copy with it and says nothing in the console.
   That has happened here twice: a clipped element whose observer could never see it,
   and a ReferenceError that swallowed a dozen personalised lines. This loads the page,
   scrolls the whole of it the way a man would, waits, and then reports anything that
   holds text and is still not on screen.
     node audit/invisible.mjs <url> [width] [seed js] */
import { spawn, execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { rmSync } from 'node:fs';
const URL_=process.argv[2], W=+(process.argv[3]||1440), SEED=process.argv[4]||'';
const PORT=9520+(process.pid%40), PROFILE='/tmp/_rzinv_'+process.pid;
const proc=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 ['--headless=new',`--remote-debugging-port=${PORT}`,'--no-first-run','--disable-gpu','--hide-scrollbars',
  '--lang=en-GB',`--window-size=${W},900`,`--user-data-dir=${PROFILE}`],{stdio:'ignore'});
function tidy(){try{execSync('pkill -9 -f '+JSON.stringify('user-data-dir='+PROFILE),{stdio:'ignore'});}catch(e){}
 try{proc.kill('SIGKILL');}catch(e){} try{rmSync(PROFILE,{recursive:true,force:true});}catch(e){}}
process.on('exit',tidy); await sleep(2600);
const list=await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(r=>ws.onopen=r); let id=0;const w=new Map();const errs=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&w.has(m.id)){w.get(m.id)(m);w.delete(m.id);return;}
 if(m.method==='Runtime.exceptionThrown')errs.push(String(m.params.exceptionDetails.text).slice(0,90));};
const send=(m,p={})=>new Promise(r=>{const i=++id;w.set(i,r);ws.send(JSON.stringify({id:i,method:m,params:p}));});
const evl=async x=>(await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true}))?.result?.result?.value;
await send('Page.enable');await send('Runtime.enable');
await send('Page.addScriptToEvaluateOnNewDocument',{source:SEED});
await send('Emulation.setDeviceMetricsOverride',{width:W,height:900,deviceScaleFactor:1,mobile:W<760});
await send('Page.navigate',{url:URL_});
await sleep(8000);
/* Walk the page the way he does and, at every stop, mark whatever is on screen.
   A scroll driven scene hides two of its three lines at any one moment, so the only
   honest question is whether a thing is EVER shown, not whether it is showing now.
   The step has to be small: a beat that is only up across a fifth of its scene gets
   stepped straight over by a coarse sweep, and reported as copy nobody ever sees. */
await evl(`window.__seen=new WeakSet(); window.__mark=function(){
  [].forEach.call(document.querySelectorAll('#rz-page *,#rz-upsell *,#rz-thanks *'),function(e){
    if(window.__seen.has(e)) return;
    if(!e.checkVisibility||!e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})) return;
    var r=e.getBoundingClientRect(); if(r.width<1||r.height<1) return;
    var c=getComputedStyle(e); if(+c.opacity<0.08) return;
    var cp=c.clipPath||''; if(/inset\\(\\s*0(px)?\\s+(9[0-9]|100)%/.test(cp)) return;
    window.__seen.add(e);
  });};1`);
const h=await evl('document.documentElement.scrollHeight');
for(let pass=0; pass<2; pass++){
  for(let y=0; y<h; y+=Math.round(900*0.18)){
    await evl(`window.scrollTo(0,${y});1`); await sleep(220); await evl('window.__mark();1');
  }
}
await evl('window.scrollTo(0,0);1'); await sleep(900); await evl('window.__mark();1');
const out=await evl(`(function(){
  var bad=[];
  [].forEach.call(document.querySelectorAll('#rz-page *,#rz-upsell *,#rz-thanks *'),function(e){
    var t=(e.textContent||'').trim(); if(!t) return;
    /* only the element that owns the text, not its ancestors */
    if(e.children.length && [].every.call(e.childNodes,function(n){return n.nodeType!==3||!n.nodeValue.trim();})) return;
    if(e.closest('[hidden]')) return;
    if(window.__seen.has(e)) return;
    var c=getComputedStyle(e);
    if(!e.checkVisibility||!e.checkVisibility({checkOpacity:false,checkVisibilityCSS:true})) return;
    var why = (+c.opacity<0.08) ? 'opacity '+c.opacity
            : (function(){var r=e.getBoundingClientRect(); return (r.width<1||r.height<1)?'zero size':null;})()
              || (/inset\\(\\s*0(px)?\\s+(9[0-9]|100)%/.test(c.clipPath||'') ? 'clipped '+c.clipPath : 'never on screen');
    bad.push(why+'  <'+e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+
      (e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\\s+/).join('.'):'')+'>  '+t.slice(0,54));
  });
  return bad;})()`);
console.log(`=== ${URL_} @${W} ===  js errors: ${errs.length?errs[0]:'none'}`);
if(!out.length) console.log('  every element that holds text is on screen');
out.forEach(l=>console.log('  '+l));
tidy(); process.exit(out.length?1:0);
