// Run everything:  node tests/run-all.cjs   (needs Node 20+; Python 3 optional)
const cp=require('child_process'),path=require('path');
const G=[['logic','run.cjs'],['page flow','dom.cjs'],['sign-in and payment screens','ui.cjs'],['example Python','example_python.cjs'],['cross-file integration','integration.cjs'],['Worker (simulated database and Razorpay)','worker.test.mjs'],['static security and launch-readiness audit','static-audit.cjs'],['pricing model math','pricing.cjs'],['JavaScript/PWA asset syntax and integrity','syntax.cjs'],['sample challenge (real pytest when installed)','sample-challenge.cjs']];
let bad=0;
for(const [n,f] of G){const r=cp.spawnSync(process.execPath,[path.join(__dirname,f)],{encoding:'utf8'});const out=(r.stdout+r.stderr).trim().split('\n');
  const sum=out.filter(l=>/passed|SKIP/.test(l)).pop()||out.pop();console.log((r.status===0?'OK   ':'FAIL ')+n+': '+sum);out.filter(l=>l.startsWith('FAIL')).forEach(l=>console.log('     '+l));if(r.status!==0)bad++}
console.log(bad?`\n${bad} test group(s) failed`:'\nAll test groups passed');process.exit(bad?1:0);
