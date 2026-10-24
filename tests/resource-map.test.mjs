import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{DOMParser}=require('./support/xmldom');
const root=path.resolve(import.meta.dirname,'..'),scope={DOMParser};scope.globalThis=scope;
for(const name of ['src/parser.js','src/component-catalog.js','src/webresources.js','src/relationship-map.js'])vm.runInNewContext(fs.readFileSync(path.join(root,name),'utf8'),scope,{filename:name});
const {SolutionCore,SolutionWebResources,SolutionRelationshipMap}=scope;

test('web resource catalog inventories payloads, source, images and manifest-only resources without opening files',()=>{
 const model={components:[{id:'webresource:mt_app.js',name:'mt_app.js',type:'webresource',properties:{kind:'3'}},{id:'webresource:mt_missing.css',name:'mt_missing.css',type:'webresource',properties:{kind:'2'}}]};
 const entries=[{path:'WebResources/mt_app.js',size:123},{path:'WebResources/mt_app.js.data.xml',size:90},{path:'WebResources/mt_logo.png',size:45},{path:'WebResources/mt_view.svg',size:89}];
 const result=SolutionWebResources.catalog(model,entries);
 assert.equal(result.length,4);assert.ok(result.some(r=>r.name==='mt_app.js'&&r.size===123));
 assert.ok(result.some(r=>r.name==='mt_missing.css'&&!r.path));
 assert.ok(result.some(r=>r.name==='mt_logo.png'&&r.kind==='PNG image'));
 assert.ok(result.some(r=>r.name==='mt_view.svg'&&r.kind==='SVG source'));
 assert.ok(!result.some(r=>r.name.endsWith('.data.xml')));
 assert.equal(SolutionWebResources.textResource('mt_view.svg'),true);
 assert.equal(SolutionWebResources.imageMime('mt_view.svg'),'');
 assert.equal(SolutionWebResources.imageMime('mt_logo.png'),'image/png');
});

test('relationship map includes every declared link, missing endpoints, external tables and filters',()=>{
 const components=[{id:'table:a',type:'table',name:'a'},{id:'table:b',type:'table',name:'b'}];
 for(let i=0;i<120;i++)components.push({id:'relationship:r'+i,type:'relationship',name:'r'+i,properties:{source:i===0?'external':'a',target:'b',kind:i%2?'ManyToMany':'OneToMany'}});
 components.push({id:'relationship:incomplete',type:'relationship',name:'incomplete',properties:{source:'a'}});
 const model={components},extracted=SolutionRelationshipMap.extract(model);
 assert.equal(extracted.edges.length,121);
 assert.equal(extracted.edges.find(e=>e.name==='r0').sourcePresent,false);
 const svg=SolutionRelationshipMap.svg(extracted.edges,extracted.known);
 assert.equal((svg.match(/marker-end="url\(#rel-arrow\)"/g)||[]).length,120);assert.ok(svg.includes('External table'));
 const filtered=SolutionRelationshipMap.filter(model,{table:'a',kind:'Many-to-many'});
 assert.equal(filtered.visible.length,60);
 assert.equal(SolutionRelationshipMap.filter(model,{query:'incomplete'}).visible.length,1);
 assert.ok(svg.includes('120 relationships'));
});

test('table relationship parser recognizes both sides of many-to-many metadata',()=>{
 const files=new Map([['solution.xml','<ImportExportXml><SolutionManifest><UniqueName>test</UniqueName></SolutionManifest></ImportExportXml>'],
  ['customizations.xml','<ImportExportXml><EntityRelationships><ManyToManyRelationship Name="new_group_people"><Entity1LogicalName>new_group</Entity1LogicalName><Entity2LogicalName>new_person</Entity2LogicalName></ManyToManyRelationship></EntityRelationships></ImportExportXml>']]);
 const model=SolutionCore.parseSolution(files),edge=SolutionRelationshipMap.extract(model).edges[0];
 assert.equal(edge.source,'new_group');assert.equal(edge.target,'new_person');assert.equal(edge.kind,'Many-to-many');
});

test('SVG escapes imported metadata rather than inserting executable markup',()=>{
 const known=new Map(),edges=[{id:'one',name:'<script>alert(1)</script>',source:'<svg onload=alert(1)>',target:'valid',kind:'One-to-many',complete:true}];
 const svg=SolutionRelationshipMap.svg(edges,known);
 assert.ok(!svg.includes('<script>'));assert.ok(!svg.includes('<svg onload='));
 assert.ok(svg.includes('&lt;script&gt;'));
});
