const fs=require('fs'),path=require('path'),assert=require('assert'),cp=require('child_process');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f));
const html=read('index.html').toString(),js=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].pop()[1],sw=read('sw.js').toString(),manifest=JSON.parse(read('manifest.webmanifest').toString());
let pass=0,fail=0;function t(name,fn){try{fn();pass++;console.log('PASS',name)}catch(e){fail++;console.log('FAIL',name,'-',e.message)}}
t('inline application JavaScript compiles',()=>new Function(js));
t('service worker JavaScript compiles',()=>new Function(sw));
t('Render API Node adapter passes Node syntax check',()=>{cp.execFileSync(process.execPath,['--check',path.join(root,'worker/server.mjs')]);const pkg=JSON.parse(read('package.json').toString());assert.equal(pkg.scripts.start,'node worker/server.mjs');assert.match(pkg.engines.node,/>=20/)});
t('PWA manifest has installable display and scope',()=>{assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./')});
t('192 and 512 icons match declared PNG dimensions',()=>{for(const n of [192,512]){const b=read(`icon-${n}.png`);assert.equal(b.readUInt32BE(16),n);assert.equal(b.readUInt32BE(20),n);assert.deepEqual([...b.subarray(0,8)],[137,80,78,71,13,10,26,10])}});
t('local navigation links and PWA assets exist',()=>{for(const f of ['privacy.html','terms.html','manifest.webmanifest','icon-192.png','icon-512.png','sw.js'])assert(fs.existsSync(path.join(root,f)),f)});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
