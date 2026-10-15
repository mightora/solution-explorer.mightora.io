import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import path from 'node:path';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {DOMParser}=require('./support/xmldom');const base=path.resolve(import.meta.dirname,'..');
const scope={DOMParser,console};scope.globalThis=scope;
for(const filename of ['src/parser.js','src/component-catalog.js','src/samples.js','src/diagrams.js'])vm.runInNewContext(fs.readFileSync(path.join(base,filename),'utf8'),scope,{filename});
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

test('extended catalog identifies plugin, security, choices, AI, sites, BPF, connector and unknown manifest types',()=>{
 const rootXml='<ImportExportXml><SolutionManifest><UniqueName>extended</UniqueName><Version>2.0</Version><RootComponents>'+
  '<RootComponent type="91" schemaName="mt.Core"/><RootComponent type="90" schemaName="mt.Plugin"/>'+
  '<RootComponent type="20" schemaName="Reviewer"/><RootComponent type="9" schemaName="mt_Options"/>'+
  '<RootComponent type="371" schemaName="mt_connector"/><RootComponent type="402" schemaName="mt_ai"/>'+
  '<RootComponent type="99991" schemaName="new_unrecognised_type"/>'+
  '</RootComponents><MissingDependencies><MissingDependency><Required type="91" schemaName="shared.Library"/><Dependent type="90" schemaName="mt.Plugin"/></MissingDependency></MissingDependencies></SolutionManifest></ImportExportXml>';
 const custom='<ImportExportXml><PluginAssemblies><PluginAssembly Name="mt.Core" Version="1.0"/></PluginAssemblies>'+
 '<Roles><Role name="Reviewer"><RolePrivileges><RolePrivilege name="prvReadmt_project" level="Global"/></RolePrivileges></Role></Roles>'+
 '<OptionSets><OptionSet Name="mt_Options" IsGlobal="1"><Options><Option value="1"/><Option value="2"/></Options></OptionSet></OptionSets>'+
 '<Workflows><Workflow Name="mt_approval" Category="4"/></Workflows>'+
 '<customapis><customapi uniquename="mt_Approve" bindingtype="1"/></customapis>'+
 '<BotComponents><BotComponent Name="mt_Welcome" ComponentType="Topic"/></BotComponents>'+
 '</ImportExportXml>';
 const m=SolutionCore.parseSolution(new Map([['solution.xml',rootXml],['customizations.xml',custom]]));
 for(const type of ['pluginassembly','plugintype','role','privilege','choice','connector','ai','bpf','customapi','topic','unknown'])assert.ok(m.counts[type]>0,type);
 assert.equal(m.components.find(c=>c.id==='pluginassembly:mt.core').coverage,'inspected');
 assert.equal(m.components.find(c=>c.id==='connector:mt_connector').coverage,'discovered');
 assert.equal(m.components.find(c=>c.id==='pluginassembly:shared.library').coverage,'referenced');
 assert.equal(m.components.find(c=>c.id==='unknown:new_unrecognised_type').coverage,'unsupported');
 assert.equal(m.dependencies.length,1);
 assert.ok(m.coverage.referenced>=1&&m.coverage.unsupported>=1);
});
test('extended component reader never includes protected values',()=>{
 const m=SolutionCore.parseSolution(new Map([['solution.xml','<ImportExportXml><SolutionManifest><UniqueName>private</UniqueName></SolutionManifest></ImportExportXml>'],
 ['customizations.xml','<ImportExportXml><CustomAPIs><customapi uniquename="mt_Test" clientsecret="PRIVATESECRET" Name="test"/></CustomAPIs><environmentvariabledefinitions><environmentvariabledefinition schemaname="mt_apikey"><defaultvalue>DO-NOT-EXPOSE</defaultvalue></environmentvariabledefinition></environmentvariabledefinitions></ImportExportXml>']]));
 assert.ok(!JSON.stringify(m).includes('PRIVATESECRET'));assert.ok(!JSON.stringify(m).includes('DO-NOT-EXPOSE'));
});