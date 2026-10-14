import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),JSZip=require('../vendor/jszip.cjs');const dir=path.resolve(import.meta.dirname,'../dist');
test('standalone HTML has all runtime source and restrictive CSP',()=>{
 const offline=fs.readFileSync(path.join(dir,'downloads/solution-explorer-offline.html'),'utf8');
 assert.ok(offline.includes('connect-src &#39;none&#39;')||offline.includes("connect-src 'none'"));
 assert.ok(offline.includes('Offline Edition – No Internet Connection Required'));
 assert.ok(offline.includes('SolutionCore'));
 assert.ok(offline.includes('JSZip'));
 assert.ok(!offline.includes('<script src='));
 assert.ok(!offline.includes('<link rel="stylesheet" href='));
});
test('download ZIP contains the same HTML as standalone release',async()=>{
 const html=fs.readFileSync(path.join(dir,'downloads/solution-explorer-offline.html'),'utf8');
 const zip=await JSZip.loadAsync(fs.readFileSync(path.join(dir,'downloads/solution-explorer-offline.zip')));
 assert.equal(await zip.file('index.html').async('string'),html);
 assert.ok(zip.file('README.txt'));
 assert.ok(zip.file('LICENSE'));
});
test('Pages output includes CNAME, crawler files and vendor JS',()=>{
 for(const filename of ['index.html','CNAME','robots.txt','sitemap.xml','vendor/jszip.min.js','src/app.js'])assert.ok(fs.existsSync(path.join(dir,filename)));
 assert.equal(fs.readFileSync(path.join(dir,'CNAME'),'utf8').trim(),'solution-explorer.mightora.io');
});
