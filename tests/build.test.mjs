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

test('all teaching ZIPs are generated from shared definitions',async()=>{
 for(const id of ['project-v1','project-v2','service-desk','grants','volunteers']){
  const zip=await JSZip.loadAsync(fs.readFileSync(path.join(dir,`examples/${id}-demo.zip`)));
  assert.ok(zip.file('solution.xml'));assert.ok(zip.file('customizations.xml'));
  assert.match(await zip.file('DEMO-NOT-FOR-IMPORT.txt').async('string'),/not/i);
 }
});
test('online and offline UIs include sample gallery and recovery guidance',()=>{
 const online=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const offline=fs.readFileSync(path.join(dir,'downloads/solution-explorer-offline.html'),'utf8');
 for(const content of [online,offline]){
  for(const id of ['samples-gallery','comparison-context','download-recovery','export-diff-csv'])assert.ok(content.includes(id));
 }
});

test('Mightora footer, author and live badges follow the design system',()=>{
 const online=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const offline=fs.readFileSync(path.join(dir,'downloads/solution-explorer-offline.html'),'utf8');
 assert.match(online,/<mightora-author>[\s\S]*author-section-overlay[\s\S]*author-photos[\s\S]*author-bio/);
 assert.match(online,/<mightora-footer>[\s\S]*footer-bottom[\s\S]*footer-copy[\s\S]*footer-bottom-links/);
 for(const workflow of ['ci.yml','codeql.yml','pages.yml']) assert.ok(online.includes('actions/workflows/'+workflow+'/badge.svg?branch=main'));
 assert.ok(online.includes('img.shields.io/github/license/'));
 assert.ok(online.includes('img.shields.io/github/last-commit/'));
 assert.ok(online.indexOf('class="evidence-bar"')>online.indexOf('</mightora-author>'));
 assert.ok(online.indexOf('class="evidence-bar"')<online.indexOf('<mightora-footer>'));
 assert.ok(!offline.includes('actions/workflows/ci.yml/badge.svg'));
 assert.ok(!offline.includes('img.shields.io/github/license/'));
 assert.ok(offline.includes('offline-evidence-label'));
 assert.match(offline,/<div class="footer-main">/);
 assert.ok(!offline.includes('src="https://techtweedie.github.io/images/author/'));
});


test('flow map controls and implementation are included online and offline',()=>{
 const site=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const offline=fs.readFileSync(path.join(dir,'downloads/solution-explorer-offline.html'),'utf8');
 for(const text of [site,offline]){
  for(const id of ['flow-explorer','flow-choice','flow-json-picker','flow-map','flow-export-mermaid']) assert.ok(text.includes(id));
 }
 assert.ok(fs.existsSync(path.join(dir,'src/flow-explorer.js')));
 assert.ok(fs.existsSync(path.join(dir,'src/flow-ui.js')));
 assert.ok(offline.includes('SolutionFlowExplorer'));
});

test('expanded inventory and issue reporting links appear in both editions',()=>{
 const online=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const offline=fs.readFileSync(path.join(dir,'downloads/solution-explorer-offline.html'),'utf8');
 for(const s of [online,offline]){
  assert.ok(s.includes('coverage-filter'));assert.ok(s.includes('dependency-rows'));
  assert.ok(s.includes('github.com/mightora/solution-explorer.mightora.io/issues/new?template=bug_report.yml'));
  assert.ok(s.includes('github.com/mightora/solution-explorer.mightora.io/issues/new?template=feature_request.yml'));
 }
 assert.ok(offline.includes('SolutionCore.COVERAGE'));
 assert.ok(fs.existsSync(path.join(dir,'src/component-catalog.js')));
});
