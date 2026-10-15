import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const root=path.resolve(import.meta.dirname,'..');
const dist=path.join(root,'dist');
const require=createRequire(import.meta.url),JSZip=require('../vendor/jszip.cjs');
test('Dataverse web resource is self-contained and uses an authenticated same-origin CSP',()=>{
 const html=fs.readFileSync(path.join(dist,'dataverse/solution-explorer.html'),'utf8');
 assert.match(html,/data-dataverse="true"/);
 for(const x of ['id="dataverse-environment"','id="dv-solution"','id="dv-slot"','MightoraDataverseSolutions','MightoraSolutionWorkbench','ExportSolution','solutioncomponents'])assert.ok(html.includes(x),x);
 assert.doesNotMatch(html,/<script[^>]*\bsrc=/i);
 assert.doesNotMatch(html,/<link[^>]*\brel="stylesheet"/i);
 assert.doesNotMatch(html,/<img[^>]*\bsrc="https?:\/\//i);
 assert.doesNotMatch(html,/static\.cloudflareinsights\.com\/beacon/i);
 assert.match(html,/connect-src 'self'/);
 assert.doesNotMatch(html,/connect-src 'none'/);
 const policy=html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/i)?.[1]||'';
 const scripts=[...html.matchAll(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
 assert.ok(scripts.length>0);
 for(const content of scripts){
  const token="'sha256-"+crypto.createHash('sha256').update(content).digest('base64')+"'";
  assert.ok(policy.includes(token),'script CSP hash is correct');
 }
 assert.ok(html.includes('data:image/png;base64')||html.includes('data:image/svg+xml;base64'));
 assert.doesNotMatch(html,/<script[^>]*type="application\/ld\+json"/i);
});
test('Dataverse ZIP contains byte-exact current HTML, README and MIT licence',async()=>{
 const html=fs.readFileSync(path.join(dist,'dataverse/solution-explorer.html'));
 const z=await JSZip.loadAsync(fs.readFileSync(path.join(dist,'downloads/solution-explorer-Dataverse.zip')));
 const out=await z.file('solution-explorer.html').async('nodebuffer');
 assert.deepEqual(out,html);
 assert.ok(z.file('README.md'));
 assert.ok(z.file('LICENSE'));
 assert.match(await z.file('README.md').async('string'),/NOT a Dataverse solution-import package/);
});
test('public web and offline editions remain present',()=>{
 for(const f of ['index.html','downloads/solution-explorer-offline.html','downloads/solution-explorer-offline.zip','dataverse/README.md'])
  assert.ok(fs.existsSync(path.join(dist,f)));
 const site=fs.readFileSync(path.join(dist,'index.html'),'utf8');
 assert.match(site,/id="dataverse-install"/);
 assert.match(site,/downloads\/solution-explorer-Dataverse\.zip/);
});