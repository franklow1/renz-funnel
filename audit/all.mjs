/* Everything, in one go, against the local preview. Start the server first:
     node tools/serve.mjs 8777 &
     node tools/preview.mjs
     node audit/all.mjs
   The live checkout is not in here, because it needs the real host. That one is
     node audit/stress.mjs 7 390 844
   and it has to be run after a push has actually gone out. */
import { spawnSync } from 'node:child_process';

const BASE = process.env.RZ_BASE || 'http://127.0.0.1:8777';
const SEED = "try{localStorage.setItem('renz_who',JSON.stringify({f:'Marcus',l:'Webb'}));" +
  "localStorage.setItem('renz_score',JSON.stringify({name:'Marcus Webb',first:'Marcus',last:'Webb'," +
  "email:'m@renztailors-sample.co.uk',n:3,total:3.7,worst:'fit',own:70,worn:21,work:4,days:7," +
  "goal:'run',want:'deals',block:'fit',fitn:0.4,reach:'0',room:'1',advice:'ig',pace:'2',t:Date.now()}));}catch(e){}";
const THANKS = BASE + '/thanks.html?when=2026-10-22T15:30&tz=Europe/London';

const JOBS = [
  ['the build still round trips',      'node', ['tools/build.mjs','--check']],
  ['every id the code reaches for',    'node', ['audit/ids.mjs']],
  ['no rule reaches two kinds, funnel','node', ['audit/selectors.mjs', BASE+'/funnel.html', '1440', SEED]],
  ['no rule reaches two kinds, quiz',  'node', ['audit/selectors.mjs', BASE+'/funnel.html?restart=1', '390', '']],
  ['no rule reaches two kinds, thanks','node', ['audit/selectors.mjs', THANKS, '1440', '']],
  ['no rule reaches two kinds, upsell','node', ['audit/selectors.mjs', BASE+'/upsell.html', '1440', '']],
  ['layout at 360',                    'node', ['audit/layout.mjs', BASE+'/funnel.html','360','900',SEED]],
  ['layout at 390',                    'node', ['audit/layout.mjs', BASE+'/funnel.html','390','900',SEED]],
  ['layout at 768',                    'node', ['audit/layout.mjs', BASE+'/funnel.html','768','900',SEED]],
  ['layout at 1024',                   'node', ['audit/layout.mjs', BASE+'/funnel.html','1024','900',SEED]],
  ['layout at 1440',                   'node', ['audit/layout.mjs', BASE+'/funnel.html','1440','900',SEED]],
  ['layout at 1920',                   'node', ['audit/layout.mjs', BASE+'/funnel.html','1920','900',SEED]],
  ['layout, thanks',                   'node', ['audit/layout.mjs', THANKS,'390','900','']],
  ['layout, upsell',                   'node', ['audit/layout.mjs', BASE+'/upsell.html','390','900','']],
  ['nothing invisible, phone',         'node', ['audit/invisible.mjs', BASE+'/funnel.html','390',SEED]],
  ['nothing invisible, desktop',       'node', ['audit/invisible.mjs', BASE+'/funnel.html','1440',SEED]],
  ['nothing invisible, thanks',        'node', ['audit/invisible.mjs', THANKS,'390','']],
  ['nothing invisible, upsell',        'node', ['audit/invisible.mjs', BASE+'/upsell.html','390','']],
  ['nothing repeats, funnel',          'node', ['audit/repeats.mjs', BASE+'/funnel.html','1440',SEED]],
  ['nothing repeats, upsell',          'node', ['audit/repeats.mjs', BASE+'/upsell.html','1440','']],
  ['every kind of man',                'node', ['audit/persona.mjs','390']],
];

/* these two report by printing rather than by exit code */
const BY_TEXT = {
  'no rule reaches two kinds': /REACH BOTH KINDS[\s\S]*?\n\s*none/,
  'nothing repeats': /nothing repeats|^\s*\[exact, (1\d\d|2\d\d)[\s\S]*every penny back/m,
};

let bad = 0;
for (const [label, cmd, args] of JOBS) {
  const t0 = Date.now();
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  let ok = r.status === 0;
  for (const k of Object.keys(BY_TEXT)) if (label.startsWith(k)) ok = BY_TEXT[k].test(out);
  /* repeats: the guarantee under each ask is meant to repeat, nothing else is */
  if (label.startsWith('nothing repeats')) {
    const lines = out.split('\n').filter(l => /^\s{5}\S/.test(l));
    ok = lines.every(l => /every penny back|nothing repeats/.test(l)) || /nothing repeats/.test(out);
  }
  if (!ok) { bad++; console.log(`FAIL  ${label}\n${out.split('\n').slice(0, 14).map(l => '      ' + l).join('\n')}`); }
  else console.log(`ok    ${label}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
console.log(bad ? `\n${bad} of ${JOBS.length} failed` : `\nall ${JOBS.length} clean`);
process.exit(bad ? 1 : 0);
