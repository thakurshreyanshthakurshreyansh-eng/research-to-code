const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const port=18000+(process.pid%10000);
const base='http://127.0.0.1:'+port;
const child=spawn(process.execPath,[path.join(__dirname,'../worker/server.mjs')],{
  env:{...process.env,PORT:String(port),SUPABASE_URL:'',SUPABASE_ANON_KEY:'',SUPABASE_SERVICE_ROLE_KEY:''},
  stdio:['ignore','pipe','pipe']
});
let logs='';
child.stdout.on('data',x=>logs+=x);child.stderr.on('data',x=>logs+=x);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(){
  for(let i=0;i<50;i++){
    if(child.exitCode!==null)throw new Error('API process exited early: '+logs);
    try{const r=await fetch(base+'/health');if(r.status===200)return;}catch{}
    await wait(100);
  }
  throw new Error('API did not start: '+logs);
}
(async()=>{
 try{
  await ready();
  const health=await fetch(base+'/health');
  assert.equal(health.status,200);
  assert.deepEqual(await health.json(),{status:'ok',service:'research-to-code-api'});
  for(const h of ['x-content-type-options','x-frame-options','content-security-policy','referrer-policy','strict-transport-security'])assert(health.headers.has(h),'missing '+h);
  assert.equal(health.headers.get('x-content-type-options'),'nosniff');
  const protectedResponse=await fetch(base+'/api/orders',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({plan_id:'premium_test_30d'})});
  assert.equal(protectedResponse.status,503);
  assert.match((await protectedResponse.json()).error,/not configured/i);
  const oversized=await fetch(base+'/health',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({payload:'x'.repeat(72*1024)})});
  assert.equal(oversized.status,413);
  console.log('PASS live Node adapter: health, security headers, missing-config guard, request-size cap');
 }catch(e){console.error('FAIL live Node adapter smoke test:',e.message);process.exitCode=1}
 finally{child.kill('SIGTERM');}
})();
