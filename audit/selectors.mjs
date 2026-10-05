/* The guarantee's signature was being inverted and stamped over its own name because
   three rules written for an IMG were matching a DIV of the same class. This looks for
   the rest of that family:
     - a class worn by two different kinds of element, which is how that happened
     - selectors that match nothing at all, which are either dead or typed wrong
   Run the page in both states, because half the page only exists after the quiz.
     node audit/selectors.mjs <url> [width] [seed js] */
import { spawn, execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { rmSync } from 'node:fs';
const URL_=process.argv[2], W=+(process.argv[3]||1440), SEED=process.argv[4]||'';
const PORT=9480+(process.pid%40), PROFILE='/tmp/_rzsel_'+process.pid;
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
const out=await evl(`(function(){
  /* 1. a class worn by more than one kind of element */
  var byClass={};
  [].forEach.call(document.querySelectorAll('#rz-funnel *,#rz-upsell *,#rz-thanks *'),function(e){
    (e.getAttribute('class')||'').trim().split(/\\s+/).forEach(function(c){
      if(!c) return; (byClass[c]=byClass[c]||{})[e.tagName]=(byClass[c][e.tagName]||0)+1; });
  });
  var mixed=[];
  Object.keys(byClass).forEach(function(c){
    var tags=Object.keys(byClass[c]);
    if(tags.length>1) mixed.push(c+'  '+tags.map(function(t){return t+'x'+byClass[c][t];}).join(' + '));
  });

  /* 2. selectors that match nothing. State classes are expected to, so they are
        reported separately rather than counted as faults. */
  var dead=[], state=[], bad=[];
  var STATE=/\\.(in|on|open|done|lit|aft|swap|swapping|bad|set|drawn|signed|filled|mine|his|rail-end|named|veil|gc-in|rz-in|rz-kb|rz-lock|rz-float)\\b|:(hover|focus|active|focus-visible|target|checked|disabled|before|after|first-letter|placeholder|backdrop|selection|-webkit-|-moz-)|\\[hidden\\]|\\[aria-|\\[data-|@/;
  [].forEach.call(document.styleSheets,function(ss){
    var rules; try{ rules=ss.cssRules; }catch(e){ return; }
    (function walk(rs){
      [].forEach.call(rs,function(r){
        if(r.cssRules){ walk(r.cssRules); return; }
        if(!r.selectorText) return;
        r.selectorText.split(',').forEach(function(sel){
          sel=sel.trim(); if(!sel) return;
          if(!/^#rz-(page|quiz|funnel|phone|upsell|thanks)/.test(sel)) return;
          var n; try{ n=document.querySelectorAll(sel.replace(/::?(before|after|first-letter|placeholder|backdrop|selection|-webkit-[a-z-]+|-moz-[a-z-]+)/g,'')).length; }
          catch(e){ bad.push(sel); return; }
          if(n>0) return;
          (STATE.test(sel)?state:dead).push(sel);
        });
      });
    })(rules);
  });
  /* 3. the one that actually bites: a rule that matches BOTH kinds of element wearing
        a shared class. That is how an IMG rule reached a DIV and inverted it. */
  var crossed=[];
  Object.keys(byClass).forEach(function(c){
    var tags=Object.keys(byClass[c]); if(tags.length<2) return;
    var els=[].slice.call(document.querySelectorAll('.'+CSS.escape(c)));
    var seen={};
    [].forEach.call(document.styleSheets,function(ss){
      var rules; try{ rules=ss.cssRules; }catch(e){ return; }
      (function walk(rs){ [].forEach.call(rs,function(r){
        if(r.cssRules){ walk(r.cssRules); return; }
        if(!r.selectorText) return;
        r.selectorText.split(',').forEach(function(sel){
          sel=sel.trim(); if(!sel||seen[c+'|'+sel]) return;
          var clean=sel.replace(/::?(before|after|first-letter|placeholder|backdrop|selection|-webkit-[a-z-]+|-moz-[a-z-]+)/g,'');
          var hit={}; var n=0;
          els.forEach(function(e){ try{ if(e.matches(clean)){ hit[e.tagName]=1; n++; } }catch(err){} });
          if(Object.keys(hit).length>1){ seen[c+'|'+sel]=1; crossed.push('.'+c+'  <- '+sel+'   ('+Object.keys(hit).join(' + ')+')'); }
        });
      }); })(rules);
    });
  });
  return {mixed:mixed.sort(), dead:[...new Set(dead)].sort(), stateCount:[...new Set(state)].length,
          bad:[...new Set(bad)], crossed:[...new Set(crossed)].sort()};
})()`);
console.log('--- classes worn by more than one kind of element ---');
out.mixed.forEach(l=>console.log('  '+l));
console.log('--- selectors matching nothing (state selectors excluded: '+out.stateCount+') ---');
out.dead.forEach(l=>console.log('  '+l));
console.log('--- RULES THAT REACH BOTH KINDS (the .sign pattern) ---');
if(!out.crossed.length) console.log('  none');
out.crossed.forEach(l=>console.log('  '+l));
if(out.bad.length) console.log('--- unparseable ---', out.bad);
tidy(); process.exit(0);
