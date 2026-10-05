/* One run = one man: seeded from the quiz, landed on the page, checkout brought on
   screen, then everything that must be true at once is checked at once.
   Repeat N times, because the faults that matter here are the intermittent ones.

   node audit/stress.mjs [runs] [width] [height] */
import { spawn, execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { rmSync } from 'node:fs';

const RUNS = +(process.argv[2] || 7);
const W = +(process.argv[3] || 390), H = +(process.argv[4] || 844);
const NAME = 'Marcus Webb', EMAIL = 'marcus@renztailors-sample.co.uk';

async function once(i) {
  const PORT = 9100 + ((process.pid + i * 7) % 700), PROFILE = `/tmp/_rzst_${process.pid}_${i}`;
  const proc = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ['--headless=new', `--remote-debugging-port=${PORT}`, '--no-first-run', '--disable-gpu',
     '--hide-scrollbars', '--lang=en-GB', `--window-size=${W},${H}`, `--user-data-dir=${PROFILE}`],
    { stdio: 'ignore' });
  const tidy = () => {
    try { execSync('pkill -9 -f ' + JSON.stringify('user-data-dir=' + PROFILE), { stdio: 'ignore' }); } catch {}
    try { proc.kill('SIGKILL'); } catch {}
    try { rmSync(PROFILE, { recursive: true, force: true }); } catch {}
  };
  try {
    await sleep(2800);
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);
    let id = 0; const w = new Map(); const errs = [];
    ws.onmessage = e => {
      const m = JSON.parse(e.data);
      if (m.id && w.has(m.id)) { w.get(m.id)(m); w.delete(m.id); return; }
      if (m.method === 'Runtime.exceptionThrown') {
        const d = m.params.exceptionDetails;
        const t = String(d.exception?.description || d.text).split('\n')[0];
        if (!/Turnstile|Failed to fetch|ERR_BLOCKED|ERR_NETWORK/i.test(t)) errs.push(t.slice(0, 90));
      }
    };
    const send = (m, p = {}) => new Promise(res => { const n = ++id; w.set(n, res); ws.send(JSON.stringify({ id: n, method: m, params: p })); });
    const evl = async x => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }))?.result?.result?.value;

    await send('Page.enable'); await send('Runtime.enable');
    /* this profile reports es-419 and leaves through a Spanish address: force the
       locale on the emulator AND over navigator, or the host localises and a perfectly
       good checkout screenshots in Spanish and gets reported as a defect */
    try { await send('Emulation.setLocaleOverride', { locale: 'en-GB' }); } catch {}
    await send('Page.addScriptToEvaluateOnNewDocument', { source:
      "Object.defineProperty(navigator,'language',{get:()=>'en-GB'});" +
      "Object.defineProperty(navigator,'languages',{get:()=>['en-GB','en']});" +
      `try{localStorage.setItem('renz_who',JSON.stringify({f:'Marcus',l:'Webb'}));` +
      `localStorage.setItem('renz_score',JSON.stringify({name:${JSON.stringify(NAME)},first:'Marcus',last:'Webb',` +
      `email:${JSON.stringify(EMAIL)},n:3,total:3.7,worst:'fit',own:70,worn:21,work:4,days:7,` +
      `goal:'run',want:'deals',block:'fit',fitn:0.4,t:Date.now()}));}catch(e){}` });
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 760 });
    await send('Page.navigate', { url: 'https://lorenzosegor.com/?cb=' + Date.now() + '-' + i });
    await sleep(15000);
    await evl("(function(){var o=document.querySelector('.c-order,[id^=one-step-order-]');if(o)o.scrollIntoView({block:'center'});return !!o;})()");
    await sleep(9000);

    const r = await evl(`(function(){
      var root=document.querySelector('.c-order,[id^=one-step-order-]');
      var f=function(sel){var e=root&&root.querySelector(sel);return e?(e.value||'').trim():null;};
      var ot=root?root.innerText:'';
      var total=(ot.match(/Order Total[\\s\\S]{0,20}?£\\s?([\\d.,]+)/i)||[])[1]||null;
      return {
        name:f('input[name="name"],input[name="full_name"]'),
        email:f('input[name="email"],input[type="email"]'),
        total:total,
        stripe:document.querySelectorAll('iframe[src*=stripe]').length,
        pay:!!document.querySelector('.form-btn,button[type=submit]'),
        bumps:[].map.call(document.querySelectorAll('input[name="order-bump"]'),function(b){return b.checked;}),
        bumpHeads:[].map.call(document.querySelectorAll('.order-bump-container .main-section .headline'),
                   function(h){return h.textContent.trim();}),
        sticky:!!document.querySelector('#rz-page .stick'),
        portrait:!!document.querySelector('#rz-page .port img'),
        sideways:document.documentElement.scrollWidth>window.innerWidth+1
      };})()`);
    ws.close();
    return { ...r, errs };
  } finally { tidy(); }
}

const rows = [];
const broke = [];
for (let i = 1; i <= RUNS; i++) {
  const r = await once(i);
  const ok = r.name === NAME && r.email === EMAIL && r.total === '99.00' &&
             r.stripe > 0 && r.pay && !r.bumps.some(Boolean) && !r.sideways && r.errs.length === 0;
  rows.push(ok);
  if (!ok) broke.push(`run ${i}: name=${JSON.stringify(r.name)} email=${r.email ? 'filled' : 'EMPTY'} ` +
    `total=${r.total} stripe=${r.stripe} pay=${r.pay} bumps=[${r.bumps}] sideways=${r.sideways} ` +
    `errors=${r.errs.length ? JSON.stringify(r.errs) : 'none'}`);
  console.log(`run ${i}  name ${JSON.stringify(r.name)}  email ${r.email ? 'filled' : 'EMPTY'}  ` +
    `£${r.total}  stripe ${r.stripe}  bumps [${r.bumps}]  sideways ${r.sideways}  ` +
    `errors ${r.errs.length ? r.errs[0] : 'none'}  => ${ok ? 'CLEAN' : '*** PROBLEM ***'}`);
  if (i === 1) console.log(`      bump headings: ${JSON.stringify(r.bumpHeads)}`);
}
const pass = rows.filter(Boolean).length;
console.log(`\n${pass}/${RUNS} clean`);
if (broke.length) { console.log('what went wrong:'); broke.forEach(l => console.log('  ' + l)); }
process.exit(pass === RUNS ? 0 : 1);
