import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import path from 'node:path';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {DOMParser}=require('./support/xmldom');const base=path.resolve(import.meta.dirname,'..');
const scope={DOMParser,console};scope.globalThis=scope;
for(const filename of ['src/parser.js','src/samples.js','src/diagrams.js'])vm.runInNewContext(fs.readFileSync(path.join(base,filename),'utf8'),scope,{filename});
const {SolutionCore, SolutionSamples, SolutionDiagrams}=scope;
test('synthetic export exposes table, column, flow, relationship, webresource, connection, environment metadata',()=>{
 const demo=SolutionSamples.demo(1);
 assert.equal(demo.info.name,'mt_projectmanagement');assert.equal(demo.info.version,'1.0.0.0');
 for(const kind of ['table','column','flow','relationship','webresource','connection','environment'])assert.ok(demo.counts[kind]>0,`expected ${kind}`);
 assert.ok(!JSON.stringify(demo).includes('secretValue'));
});
test('component comparison detects added, changed and unchanged with stable IDs',()=>{
 const a=SolutionSamples.demo(1),b=SolutionSamples.demo(2),diff=SolutionCore.compare(a,b);
 assert.ok(diff.some(x=>x.status==='added'&&x.id==='table:mt_milestone'));
 assert.ok(diff.some(x=>x.status==='added'&&x.id==='column:mt_project.mt_owner'));
 assert.ok(diff.some(x=>x.status==='changed'&&x.id==='column:mt_project.mt_budget'));
 assert.ok(diff.some(x=>x.status==='changed'&&x.type==='flow'));
 assert.ok(diff.some(x=>x.status==='unchanged'));
});
test('relationship diagram draws only discovered links',()=>{
 const svg=SolutionDiagrams.build(SolutionSamples.demo(2),'data');
 assert.ok(svg.includes('mt_project'));assert.ok(svg.includes('marker-end'));assert.ok(svg.startsWith('<svg'));
});
test('environment values are not exported even when present in XML',()=>{
 const files=new Map([
 ['solution.xml','<ImportExportXml><SolutionManifest><UniqueName>safe</UniqueName><Version>1.0.0.0</Version></SolutionManifest></ImportExportXml>'],
 ['customizations.xml','<ImportExportXml><environmentvariabledefinitions><environmentvariabledefinition><schemaname>mt_api_key</schemaname><type>100000000</type><defaultvalue>SENSITIVE-123-DO-NOT-DISPLAY</defaultvalue></environmentvariabledefinition></environmentvariabledefinitions></ImportExportXml>']
 ]);
 const result=SolutionCore.parseSolution(files);
 assert.ok(result.components.some(c=>c.name==='mt_api_key'));
 assert.ok(!JSON.stringify(result).includes('SENSITIVE-123-DO-NOT-DISPLAY'));
});
test('graceful warning on unsupported YAML-only solution archive',()=>{
 const result=SolutionCore.parseSolution(new Map([['solutions/demo/solution.yml','solution: demo']]));
 assert.ok(result.warnings.some(x=>x.includes('YAML')));
 assert.equal(result.counts.table,0);
});
test('missing second solution yields no fictitious changes',()=>assert.equal(SolutionCore.compare(SolutionSamples.demo(1),null).length,0));

test('web-resource package checksum can detect modified binary assets without exposing contents',()=>{
 const files=new Map([['solution.xml','<ImportExportXml><SolutionManifest><UniqueName>test</UniqueName></SolutionManifest></ImportExportXml>'],['customizations.xml','<ImportExportXml />']]);
 const first=SolutionCore.parseSolution(files,new Map([['WebResources/mt_logo.png','baddcafe']]));
 const next=SolutionCore.parseSolution(files,new Map([['WebResources/mt_logo.png','decafbad']]));
 assert.equal(first.counts.webresource,1);
 assert.equal(SolutionCore.compare(first,next).find(c=>c.type==='webresource')?.status,'changed');
});

test('five fictional ZIP samples include comparison pair and a managed package',()=>{
 assert.equal(SolutionSamples.catalog.length,5);
 for(const item of SolutionSamples.catalog){
  const files=SolutionSamples.files(item.id);const parsed=SolutionCore.parseSolution(files);
  assert.ok(files.has('DEMO-NOT-FOR-IMPORT.txt'));
  assert.ok(parsed.components.length>5,`missing components in ${item.id}`);
  assert.equal(parsed.info.managed,item.managed);
 }
 assert.equal(SolutionSamples.load('service-desk').info.managed,true);
});
test('recovery assessment does not falsely offer conversion',()=>{
 const managed=SolutionCore.assessManaged(SolutionSamples.load('service-desk'));
 assert.equal(managed.status,'managed');
 assert.match(managed.title,/not supported/i);
 assert.ok(managed.steps.some(s=>s.includes('original unmanaged')));
 assert.equal(SolutionCore.assessManaged(SolutionSamples.demo(1)).status,'unmanaged');
});
test('field-level delta contains old and new values',()=>{
 const v1=SolutionSamples.demo(1),v2=SolutionSamples.demo(2);
 const c=SolutionCore.compare(v1,v2).find(c=>c.id==='column:mt_project.mt_budget');
 const changes=SolutionCore.propertyChanges(c.before,c.properties);
 assert.ok(changes.some(d=>d.key==='dataType'&&d.before==='money'&&d.after==='decimal'));
});
