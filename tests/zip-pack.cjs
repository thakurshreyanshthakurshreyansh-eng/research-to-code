const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const html=fs.readFileSync(require("node:path").join(__dirname,"..","index.html"),"utf8");
const start=html.indexOf("function zipCrc32(");
const end=html.indexOf('$("labHandoff").onclick=',start);
assert(start>=0&&end>start,"ZIP packer source must exist before handoff handler");
const sandbox={TextEncoder,TextDecoder,Uint8Array,DataView,Blob,Date};
vm.runInNewContext(html.slice(start,end),sandbox,{timeout:1000});
(async()=>{
  assert.equal(sandbox.zipCrc32(new TextEncoder().encode("hello")),0x3610a686,"CRC32 must match known vector");
  const expected=[["README.md","Handoff readme"],["tests/test_solution.py","def test_ok(): assert True"],["研究/notes.txt","UTF-8 archive entry ✓"]];
  const blob=sandbox.makeZipBlob(expected.map(([name,data])=>({name,data})));
  assert.equal(blob.type,"application/zip");
  const bytes=Buffer.from(await blob.arrayBuffer());
  assert(bytes.length>22,"ZIP must contain archive records");
  let offset=0,found=[];
  while(offset+30<=bytes.length&&bytes.readUInt32LE(offset)===0x04034b50){
    const flags=bytes.readUInt16LE(offset+6),method=bytes.readUInt16LE(offset+8),crc=bytes.readUInt32LE(offset+14);
    const size=bytes.readUInt32LE(offset+18),nameLen=bytes.readUInt16LE(offset+26),extraLen=bytes.readUInt16LE(offset+28);
    const name=bytes.subarray(offset+30,offset+30+nameLen).toString("utf8");
    const dataStart=offset+30+nameLen+extraLen,data=bytes.subarray(dataStart,dataStart+size);
    assert.equal(method,0,"store method should need no decompressor");
    assert(flags&0x0800,"UTF-8 filename flag should be set");
    assert.equal(crc,sandbox.zipCrc32(new Uint8Array(data)),"each entry CRC should match");
    const match=expected.find(e=>e[0]===name);assert(match,"unexpected entry name: "+name);
    assert.equal(data.toString("utf8"),match[1],"entry content should round-trip");
    found.push(name);offset=dataStart+size;
  }
  assert.deepEqual(found,expected.map(e=>e[0]),"all files should be in local records");
  assert.equal(bytes.readUInt32LE(offset),0x02014b50,"central directory should immediately follow local entries");
  const eocd=bytes.length-22;
  assert.equal(bytes.readUInt32LE(eocd),0x06054b50,"end-of-central-directory signature");
  assert.equal(bytes.readUInt16LE(eocd+8),expected.length,"entry count");
  assert.equal(bytes.readUInt16LE(eocd+10),expected.length,"total entry count");
  assert.equal(bytes.readUInt32LE(eocd+16),offset,"central directory offset");
  console.log("ZIP packer: CRC32, UTF-8 paths, file contents, local headers and central directory passed");
})().catch(e=>{console.error(e);process.exitCode=1});
