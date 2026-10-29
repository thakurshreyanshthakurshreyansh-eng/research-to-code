const cp=require('child_process'),fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert');
const src=path.join(__dirname,'..','samples','ewma-anomaly-detection');
const py=process.env.PYTHON||'python3';
const check=cp.spawnSync(py,['--version'],{encoding:'utf8'});
if(check.error||check.status!==0){console.log('SKIP sample challenge: Python is not installed');process.exit(0)}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rtc-ewma-'));
function run(solution){fs.copyFileSync(path.join(src,solution),path.join(dir,'solution.py'));fs.copyFileSync(path.join(src,'test_solution.py'),path.join(dir,'test_solution.py'));return cp.spawnSync(py,['-m','pytest','-q','test_solution.py'],{cwd:dir,encoding:'utf8',timeout:30000})}
try{
 const good=run('solution.py');if(good.error){if(good.error.code==='ENOENT'){console.log('SKIP sample challenge: pytest is not installed');process.exit(0)}throw good.error}
 assert.equal(good.status,0,'reference solution should pass:\n'+good.stdout+'\n'+good.stderr);
 assert.match(good.stdout,/10 passed/,'reference solution should pass all 10 tests');console.log('PASS reference solution: 10/10 pytest tests');
 const bad=run('buggy_code.py');assert.notEqual(bad.status,0,'deliberately buggy implementation must fail tests');assert.match(bad.stdout,/5 failed, 5 passed/,'buggy implementation should fail 5 tests and pass 5');console.log('PASS challenge sensitivity: buggy implementation fails 5 tests as expected');console.log('2 challenge checks passed');
} finally {fs.rmSync(dir,{recursive:true,force:true})}
