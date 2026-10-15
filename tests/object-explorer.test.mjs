import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {DOMParser}=require('./support/xmldom');
const base=path.resolve(import.meta.dirname,'..');
const context={DOMParser,console};context.globalThis=context;
for(const name of ['src/parser.js','src/component-catalog.js','src/samples.js','src/flow-explorer.js','src/object-explorer.js'])vm.runInNewContext(fs.readFileSync(path.join(base,name),'utf8'),context,{filename:name});
const {SolutionCore,SolutionSamples,SolutionObjectExplorer}=context;
test('tree groups cover expanded Dataverse object categories',()=>{
 const f=SolutionSamples.files('architecture-tour');
 const data=SolutionObjectExplorer.enrich(SolutionCore.parseSolution(f),f);
 const groups=SolutionObjectExplorer.group(data);
 for(const type of ['table','column','pluginassembly','pluginstep','role','choice','customapi','bpf','powerpages','copilot','ai','unknown'])
  assert.ok(groups.some(([t])=>t===type),type);
 assert.ok(data.components.some(x=>x.coverage==='unsupported'));
 assert.ok(SolutionObjectExplorer.group(data,'mt.Foundation').length);
 assert.ok(SolutionObjectExplorer.group(data,'','referenced').length);
});
test('table and security role child structures can be expanded safely',()=>{
 const f=SolutionSamples.files('architecture-tour');
 const data=SolutionObjectExplorer.enrich(SolutionCore.parseSolution(f),f);
 const table=data.components.find(c=>c.type==='table');
 assert.ok(data.objectDetails[table.id]?.children.some(c=>c.kind==='attribute'), 'table column child nodes');
 const role=data.components.find(c=>c.type==='role');
 assert.ok(data.objectDetails[role.id]?.children.some(c=>c.kind==='roleprivilege'),'role privilege child nodes');
});
test('sensitive content is excluded from contained object metadata',()=>{
 const files=new Map([
  ['solution.xml','<ImportExportXml><SolutionManifest><UniqueName>safe</UniqueName></SolutionManifest></ImportExportXml>'],
  ['customizations.xml','<ImportExportXml><CustomAPIs><customapi uniquename="mt_Test" clientsecret="DO-NOT-EXPOSE-SECRET"><Name>mt_Test</Name><password>DO-NOT-EXPOSE-PASSWORD</password><request><token>DO-NOT-EXPOSE-TOKEN</token></request></customapi></CustomAPIs></ImportExportXml>']
 ]);
 const model=SolutionObjectExplorer.enrich(SolutionCore.parseSolution(files),files);
 for(const needle of ['DO-NOT-EXPOSE-SECRET','DO-NOT-EXPOSE-PASSWORD','DO-NOT-EXPOSE-TOKEN'])
  assert.ok(!JSON.stringify(model).includes(needle),needle);
});
test('explicit table relationships provide cross-navigation without inventing dependencies',()=>{
 const f=SolutionSamples.files('project-v2');const model=SolutionObjectExplorer.enrich(SolutionCore.parseSolution(f),f);
 const project=model.components.find(c=>c.id==='table:mt_project');
 const related=SolutionObjectExplorer.related(model,project);
 assert.ok(related.some(c=>c.type==='column'&&c.name==='mt_project.mt_owner'));
 assert.ok(related.some(c=>c.type==='relationship'));
 const unrelated=model.components.find(c=>c.type==='flow');
 assert.ok(!SolutionObjectExplorer.related(model,unrelated).some(c=>c.type==='table'),'should not invent flow-table relation');
});
test('manifest-only and unknown components remain selectable with honest absence of child data',()=>{
 const files=new Map([['solution.xml','<ImportExportXml><SolutionManifest><UniqueName>future</UniqueName><RootComponents><RootComponent type="99999" schemaName="mt_future" /></RootComponents></SolutionManifest></ImportExportXml>'],['customizations.xml','<ImportExportXml />']]);
 const m=SolutionObjectExplorer.enrich(SolutionCore.parseSolution(files),files);
 const item=m.components.find(c=>c.type==='unknown');
 assert.ok(item);
 assert.equal(m.objectDetails[item.id],undefined);
 assert.equal(item.coverage,'unsupported');
});
