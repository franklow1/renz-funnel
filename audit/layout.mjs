/* Desktop and mobile layout audit of the local preview: anything wider than the
   window, text that runs past a comfortable measure, images without dimensions,
   tap targets under 44px, and any element whose text is clipped. */
import { spawn, execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { rmSync } from 'node:fs';
const URL_=process.argv[2], W=+(process.argv[3]||1280), H=+(process.argv[4]||900);
const PORT=9400+(process.pid%500), PROFILE='/tmp/_rzlay_'+process.pid;
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
let id=0; const w=new Map(); const errs=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);
  if(m.id&&w.has(m.id)){w.get(m.id)(m);w.delete(m.id);return;}
  if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails;
    errs.push(String(d.exception?.description||d.text).split('\n')[0].slice(0,120));}};
const send=(m,p={})=>new Promise(res=>{const i=++id;w.set(i,res);ws.send(JSON.stringify({id:i,method:m,params:p}));});
const evl=async x=>(await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true}))?.result?.result?.value;
await send('Page.enable'); await send('Runtime.enable');
try{ await send('Emulation.setLocaleOverride',{locale:'en-GB'}); }catch(e){}
await send('Page.addScriptToEvaluateOnNewDocument',{source:
  "Object.defineProperty(navigator,'language',{get:()=>'en-GB'});"+
  "Object.defineProperty(navigator,'languages',{get:()=>['en-GB','en']});"+
  (process.argv[5]||'')});
await send('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:1,mobile:W<760});
await send('Page.navigate',{url:URL_});
await sleep(7500);
await evl("[].forEach.call(document.querySelectorAll('.rise,.stag'),function(e){e.classList.add('in')});1");
await sleep(600);
const out=await evl(`(function(){
  var VW=window.innerWidth, res={vw:VW, overflow:[], wide:[], noDim:[], small:[], clipped:[]};
  /* a link can carry its touch area on a pseudo element or on the row around it, so
     measure what a thumb can actually hit rather than the text box */
  function hitBox(e){
    var r=e.getBoundingClientRect(), w=r.width, h=r.height;
    try{
      var af=getComputedStyle(e,'::after');
      if(af && af.content && af.content!=='none'){
        var ph=parseFloat(af.height); if(ph>h) h=ph;
        var l=parseFloat(af.left), rr=parseFloat(af.right);
        if(l<0) w+=-l; if(rr<0) w+=-rr;
        if(af.position==='absolute' && (af.inset==='0px' || af.top==='0px')){
          var par=e.offsetParent; if(par){ var pr=par.getBoundingClientRect(); if(pr.height>h) h=pr.height; if(pr.width>w) w=pr.width; }
        }
      }
    }catch(err){}
    return {w:w,h:h};
  }
  var all=document.querySelectorAll('#rz-page *, #rz-quiz *');
  [].forEach.call(all,function(e){
    var r=e.getBoundingClientRect(); if(!r.width||!r.height) return;
    var cs=getComputedStyle(e);
    if(cs.position==='fixed') return;
    // wider than the window, and not inside something that scrolls sideways on purpose
    if(r.right>VW+1||r.left<-1){
      var p=e.parentElement, ok=false;
      while(p){ var pc=getComputedStyle(p); if(pc.overflowX==='auto'||pc.overflowX==='scroll'||pc.overflowX==='hidden'){ok=true;break;} p=p.parentElement; }
      if(!ok) res.overflow.push((e.id||e.className||e.tagName).toString().slice(0,44)+' right='+Math.round(r.right));
    }
    // running text far past a comfortable measure
    if(/^(P|LI)$/.test(e.tagName) && e.children.length===0){
      var t=(e.textContent||'').trim();
      if(t.length>90 && r.width>820) res.wide.push(Math.round(r.width)+'px: '+t.slice(0,48));
    }
    if(e.tagName==='IMG' && (!e.getAttribute('width')||!e.getAttribute('height')))
      res.noDim.push((e.className||e.src||'').toString().slice(0,50));
    if(/^(A|BUTTON)$/.test(e.tagName) && cs.display!=='none'){
      var hb=hitBox(e);
      if(hb.height<44 || hb.width<44){
        var lab=(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,26);
        if(lab) res.small.push(Math.round(hb.width)+'x'+Math.round(hb.height)+' '+lab);
      }
    }
    if(e.scrollHeight>e.clientHeight+3 && cs.overflowY==='hidden' && e.children.length===0)
      res.clipped.push((e.className||e.tagName).toString().slice(0,40));
  });
  res.docWider = document.documentElement.scrollWidth > VW+1;
  return res;
})()`);
console.log(`\n=== ${W}x${H} ===  js errors: ${errs.length?errs[0]:'none'}`);
console.log('document scrolls sideways:', out.docWider);
for(const k of ['overflow','wide','noDim','small','clipped']){
  const v=[...new Set(out[k])];
  console.log(`  ${k.padEnd(9)} ${v.length}`);
  v.slice(0,6).forEach(x=>console.log('      - '+x));
}
tidy(); process.exit(0);
