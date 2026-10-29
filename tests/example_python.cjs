const fs=require('fs'),vm=require('vm'),path=require('path'),os=require('os'),cp=require('child_process');
const js=[...fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)].pop()[1];
const ex=n=>vm.runInNewContext(js.match(new RegExp('var '+n+'=(`[\\s\\S]*?`);'))[1]);
if(cp.spawnSync('python3',['-V']).error){console.log('SKIP python3 not found');process.exit(0)}
const d=fs.mkdtempSync(path.join(os.tmpdir(),'rtc-ex-'));
fs.writeFileSync(d+'/solution.py',ex('EX_AFTER'));fs.writeFileSync(d+'/test_solution.py',ex('EX_TESTS'));
fs.writeFileSync(d+'/pytest.py','import contextlib\n@contextlib.contextmanager\ndef raises(exc):\n    try:\n        yield\n    except exc:\n        return\n    raise AssertionError("did not raise")\n');
const h='import test_solution,inspect\nfns=[f for n,f in inspect.getmembers(test_solution,inspect.isfunction) if n.startswith("test_")]\nfor f in fns: f()\nprint(len(fns),"example tests passed (real Python, tiny stand-in for pytest.raises)")\n';
const r=cp.spawnSync('python3',['-c',h],{cwd:d,env:{...process.env,PYTHONPATH:d},encoding:'utf8'});
console.log((r.stdout||r.stderr).trim());process.exit(r.status===0&&/^5 example tests passed/.test(r.stdout)?0:1);
