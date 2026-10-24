import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),JSZip=require('../vendor/jszip.cjs');const dir=path.resolve(import.meta.dirname,'../dist');
test('full ERD and individual editable component documentation ship in every edition',()=>{
 const online=fs.readFileSync(path.join(dir,'index.html'),'utf8'),offline=fs.readFileSync(path.join(dir,'downloads/solution-explorer-offline.html'),'utf8'),dataverse=fs.readFileSync(path.join(dir,'dataverse/solution-explorer.html'),'utf8');
 for(const content of [online,offline,dataverse])for(const id of ['component-visuals','visual-component-docx','visual-component-pptx','visual-rule-scope','relationship-docx','relationship-pptx','relationship-mermaid','erd-keys-only'])assert.ok(content.includes('id="'+id+'"'),id);
 for(const name of ['erd','solution-details','component-reports','office-components','component-ui','visual-components-ui']){assert.ok(fs.existsSync(path.join(dir,'src',name+'.js')));assert.ok(offline.includes(fs.readFileSync(path.join(dir,'src',name+'.js'),'utf8').replaceAll('</script','<\\/script')));}
 assert.ok(fs.existsSync(path.join(dir,'vendor/JS-YAML-LICENSE.md')));
});
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
 for(const id of ['project-v1','project-v2','service-desk','grants','volunteers','architecture-tour']){
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

test('object browser works in the online and standalone offline releases',()=>{
 const online=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const offline=fs.readFileSync(path.join(dir,'downloads/solution-explorer-offline.html'),'utf8');
 for(const html of [online,offline]){
  for(const id of ['object-browser','object-tree','object-inspector','object-search','object-coverage','object-expand-all','object-collapse-all'])
   assert.ok(html.includes('id="'+id+'"'),id);
 }
 assert.ok(offline.includes('SolutionObjectExplorer'));
 assert.ok(fs.existsSync(path.join(dir,'src/object-explorer.js')));
 assert.ok(fs.existsSync(path.join(dir,'src/object-ui.js')));
});


test('standalone inline runtime exactly matches the online application modules in load order',()=>{
 const root=path.resolve(import.meta.dirname,'..');
 const online=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const offline=fs.readFileSync(path.join(dir,'downloads/solution-explorer-offline.html'),'utf8');
 const paths=[...online.matchAll(/<script\s+src="((?:vendor|src)\/[A-Za-z0-9_./-]+\.js)"\s+defer><\/script>/g)].map(m=>m[1]);
 assert.ok(paths.includes('src/parser.js'));
 assert.ok(paths.includes('src/component-catalog.js'));
 assert.ok(paths.includes('src/object-explorer.js'));
 assert.ok(paths.includes('src/object-ui.js'));
 assert.ok(paths.indexOf('src/parser.js')<paths.indexOf('src/component-catalog.js'));
 assert.ok(paths.indexOf('src/component-catalog.js')<paths.indexOf('src/object-explorer.js'));
 assert.ok(paths.indexOf('src/object-explorer.js')<paths.indexOf('src/object-ui.js'));
 assert.ok(paths.indexOf('src/object-ui.js')<paths.indexOf('src/app.js'));
 const inline=[...offline.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
 const expected=paths.map(p=>fs.readFileSync(path.join(root,p),'utf8').replaceAll('</script','<\\/script')).join('\n;\n');
 assert.ok(inline.includes(expected),'offline runtime must embed every online module, unmodified and in order');
 assert.doesNotThrow(()=>new vm.Script(expected));
});
test('offline core can initialise object explorer using only its bundled metadata modules',()=>{
 const root=path.resolve(import.meta.dirname,'..');
 const context={}; context.globalThis=context;
 for(const pathName of ['src/parser.js','src/component-catalog.js','src/samples.js','src/flow-explorer.js','src/object-explorer.js'])
  vm.runInNewContext(fs.readFileSync(path.join(root,pathName),'utf8'),context,{filename:pathName});
 assert.equal(typeof context.SolutionObjectExplorer.enrich,'function');
 assert.equal(typeof context.SolutionCore.COVERAGE,'object');
 const sample=context.SolutionSamples.files('architecture-tour');
 // Structural metadata is built without a browser network connection.
 assert.equal(typeof context.SolutionObjectExplorer.group,'function');
 assert.ok(sample.has('customizations.xml'));
});

test('online and offline releases bundle both editable Office report engines in the right order',()=>{
 const online=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const offline=fs.readFileSync(path.join(dir,'downloads/solution-explorer-offline.html'),'utf8');
 for(const html of [online,offline])for(const marker of ['id="report-builder"','id="report-mode"','id="report-export-docx"','id="report-export-pptx"'])
   assert.ok(html.includes(marker),marker);
 assert.ok(offline.includes('root.SolutionReports='));
 assert.ok(offline.includes('root.SolutionOffice='));
 assert.ok(offline.includes('Editable PowerPoint report'))
 for(const f of ['src/report-core.js','src/office-export.js','src/report-ui.js'])assert.ok(fs.existsSync(path.join(dir,f)));
});

test('model-driven form preview and reporting are present in online and offline bundles',()=>{
 const online=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const offline=fs.readFileSync(path.join(dir,'downloads/solution-explorer-offline.html'),'utf8');
 for(const content of [online,offline])for(const id of ['form-preview','form-preview-choice','form-preview-stage'])assert.ok(content.includes('id="'+id+'"'));
 assert.ok(offline.includes('SolutionForms'));
 assert.ok(offline.includes('Form preview'));
 assert.ok(offline.includes('Form layout changes'));
 assert.ok(!offline.includes('footer-logo-fallback.js'));
});

test('deployed footer image assets are included when fetched, and browser fallback is bundled',()=>{
 const offline=fs.readFileSync(path.join(dir,'downloads/solution-explorer-offline.html'),'utf8');
 assert.ok(offline.includes('repairAttempt'));
 assert.ok(offline.includes('assets/footer-techtweedie.png'));
 assert.ok(offline.includes('footer-logo-fallback'));
 for(const file of ['footer-techtweedie.png','footer-tweed.png']){
  const asset=path.resolve(import.meta.dirname,'../assets',file);
  if(fs.existsSync(asset))assert.ok(fs.existsSync(path.join(dir,'assets',file)));
 }
});

test('expanded diagram modules are present in online and offline Office report releases',()=>{
 const online=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const offline=fs.readFileSync(path.join(dir,'downloads/solution-explorer-offline.html'),'utf8');
 for(const name of ['flow-layout.js','report-visuals.js','office-diagrams.js'])assert.ok(online.includes('src/'+name));
 for(const term of ['api.layout=layout','report.visuals','office.docx=docx','office.pptx=pptx'])assert.ok(offline.includes(term));
 for(const file of ['src/flow-layout.js','src/report-visuals.js','src/office-diagrams.js'])assert.ok(fs.existsSync(path.join(dir,file)));
});

test('the online, offline and model-driven builds preserve persistent navigation',()=>{
 const online=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const offline=fs.readFileSync(path.join(dir,'downloads/solution-explorer-offline.html'),'utf8');
 const embedded=fs.readFileSync(path.join(dir,'dataverse/solution-explorer.html'),'utf8');
 assert.match(online,/src\/navigation\.js/);
 assert.match(offline,/--mightora-sticky-header-height/);
 assert.match(offline,/--mightora-sticky-clearance/);
 assert.match(embedded,/--mightora-dataverse-topbar-height/);
 assert.match(embedded,/position:sticky/);
 assert.match(embedded,/navigation\.js|function measure\(\)/);
});

test('full web resource inspector and complete relationship map are bundled everywhere',()=>{
 const online=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const offline=fs.readFileSync(path.join(dir,'downloads/solution-explorer-offline.html'),'utf8');
 const dataverse=fs.readFileSync(path.join(dir,'dataverse/solution-explorer.html'),'utf8');
 for(const content of [online,offline,dataverse]){
  for(const id of ['webresource-list','webresource-inspector','relationship-stage','relationship-rows','relationship-svg','relationship-csv'])assert.ok(content.includes('id="'+id+'"'),id);
  assert.ok(content.includes('SolutionRelationshipMap')||content.includes('src/relationship-map.js'));
  assert.ok(content.includes('SolutionWebResources')||content.includes('src/webresources.js'));
 }
 for(const name of ['webresource-ui.js','relationship-ui.js','webresources.js','relationship-map.js'])assert.ok(fs.existsSync(path.join(dir,'src',name)));
});
