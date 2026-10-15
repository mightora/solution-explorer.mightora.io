import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),JSZip=require('../vendor/jszip.cjs'),DOMParser=require('./support/xmldom').DOMParser;
const root=path.resolve(import.meta.dirname,'..');
const context={DOMParser,JSZip,Blob,Date};context.globalThis=context;
for(const file of ['src/parser.js','src/component-catalog.js','src/form-preview.js','src/object-explorer.js','src/flow-explorer.js','src/flow-layout.js','src/samples.js','src/report-core.js','src/form-report.js','src/report-visuals.js','src/office-export.js','src/office-diagrams.js'])
 vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
const {SolutionSamples,SolutionFlowExplorer,SolutionReports,SolutionOffice}=context;
const old=SolutionSamples.load('project-v1'),newer=SolutionSamples.load('project-v2'),showcase=SolutionSamples.load('architecture-tour');

test('browser map groups branches and renders explicit runAfter separately from containment',()=>{
 const flow=SolutionFlowExplorer.demo();const layout=SolutionFlowExplorer.layout(flow);
 assert.ok(layout.rows.some(r=>r.kind==='branch'&&r.branch==='YES / TRUE'));
 assert.ok(layout.rows.some(r=>r.kind==='branch'&&r.branch==='NO / FALSE'));
 assert.ok(layout.edges.some(e=>e.kind==='dependency'));
 const svg=SolutionFlowExplorer.diagram(flow);
 assert.ok(svg.includes('No implied order'));
 assert.ok(svg.includes('runAfter'));
 assert.ok(svg.includes('data-flow-step'));
 assert.ok(!svg.includes('secret123'));
});
test('single and comparison reports include architecture, integration, form and flow diagram models',()=>{
 const one=SolutionReports.single(showcase),two=SolutionReports.comparison(old,showcase);
 assert.ok(one.visuals.some(v=>v.kind==='graph'&&v.type==='landscape'));
 assert.ok(one.visuals.some(v=>v.kind==='graph'&&v.type==='data'));
 assert.ok(one.visuals.some(v=>v.kind==='graph'&&v.type==='integration'));
 assert.ok(one.visuals.some(v=>v.kind==='flow'));
 assert.ok(one.forms?.length);
 assert.ok(two.visuals.some(v=>v.type==='change'));
 assert.ok(two.visuals.some(v=>v.side==='Baseline A'));
 assert.ok(two.visuals.some(v=>v.side==='Newer B'));
 assert.ok(two.visuals.some(v=>v.kind==='flow'&&v.side==='Newer B'));
 assert.ok(two.sections.some(s=>s.title==='Power Automate flow diagrams and action paths'));
});
test('Word diagram section has editable flow path and component relationship tables',async()=>{
 const doc=SolutionReports.single(showcase);
 const blob=await SolutionOffice.docx(doc);
 const zip=await JSZip.loadAsync(await blob.arrayBuffer());
 const content=await zip.file('word/document.xml').async('string');
 assert.ok(content.includes('Architecture and automation diagrams'));
 assert.ok(content.includes('Power Automate'));
 assert.ok(content.includes('CONTAINER / BRANCH'));
 assert.ok(content.includes('Editable connection map'));
 assert.ok((content.match(/<w:tbl>/g)||[]).length>5);
 assert.equal(Object.keys(zip.files).some(f=>f.startsWith('word/media/')),false);
});
test('PowerPoint contains native editable architecture and flow diagram slides, not raster artwork',async()=>{
 const doc=SolutionReports.single(showcase);
 const blob=await SolutionOffice.pptx(doc,{theme:'mightora'});
 const zip=await JSZip.loadAsync(await blob.arrayBuffer());
 const slideNames=Object.keys(zip.files).filter(f=>/^ppt\/slides\/slide\d+\.xml$/.test(f));
 const xmls=await Promise.all(slideNames.map(f=>zip.file(f).async('string')));
 assert.ok(xmls.some(s=>s.includes('Solution component landscape')));
 assert.ok(xmls.some(s=>s.includes('Power Automate')&&s.includes('<p:sp>')));
 assert.ok(xmls.some(s=>s.includes('<p:cxnSp>')));
 assert.equal(Object.keys(zip.files).some(f=>f.startsWith('ppt/media/')),false);
 const pres=await zip.file('ppt/presentation.xml').async('string');
 assert.equal((pres.match(/<p:sldId /g)||[]).length,slideNames.length);
});
