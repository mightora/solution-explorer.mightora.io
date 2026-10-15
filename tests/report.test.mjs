import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),JSZip=require('../vendor/jszip.cjs'),DOMParser=require('./support/xmldom').DOMParser;
const root=path.resolve(import.meta.dirname,'..');
const sandbox={DOMParser,JSZip,Blob,console,Date};sandbox.globalThis=sandbox;
for(const file of ['src/parser.js','src/component-catalog.js','src/object-explorer.js','src/samples.js','src/report-core.js','src/office-export.js'])
 vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox,{filename:file});
const {SolutionReports, SolutionOffice,SolutionSamples}=sandbox;
const project=SolutionSamples.load('project-v1'),newer=SolutionSamples.load('project-v2');

test('single solution document contains data dictionary, relationships, integration and completeness',()=>{
 const report=SolutionReports.single(project);
 assert.equal(report.mode,'single');
 for(const part of ['Data model and dictionary','Relationship architecture','Integrations and configuration','Security architecture','Assumptions, gaps and verification'])
  assert.ok(report.sections.some(s=>s.title===part),part);
 assert.ok(report.sections.some(s=>s.tables.some(t=>t.rows.some(row=>row.includes('mt_project')))));
 assert.ok(report.diagrams.some(x=>x.links.some(l=>l.name==='mt_project_tasks')));
});
test('A to B change report identifies added, removed and changed metadata',()=>{
 const report=SolutionReports.comparison(project,newer);
 assert.equal(report.mode,'comparison');
 assert.ok(report.counts.added>0);assert.ok(report.counts.changed>0);
 const rows=report.sections.flatMap(s=>s.tables.flatMap(t=>t.rows));
 assert.ok(rows.some(row=>row.includes('mt_milestone')));
 assert.ok(rows.some(row=>row.includes('mt_project.mt_budget')));
 assert.ok(report.sections.some(s=>s.title==='Indicative change-impact review'));
 assert.equal(report.diagrams.length,2);
});
test('report generators enforce missing-baseline and missing-comparison inputs',()=>{
 assert.throws(()=>SolutionReports.single(null),/Load a solution/);
 assert.throws(()=>SolutionReports.comparison(project,null),/Load both/);
});
test('Word export uses editable paragraphs, tables and relationship map cells',async()=>{
 const report=SolutionReports.single(project),blob=await SolutionOffice.docx(report,{theme:'mightora'}),zip=await JSZip.loadAsync(await blob.arrayBuffer());
 const doc=await zip.file('word/document.xml').async('string');
 assert.ok(doc.includes('<w:tbl>'));
 assert.ok(doc.includes('Data model and dictionary'));
 assert.ok(doc.includes('mt_project_tasks'));
 assert.ok(doc.includes('Editable relationship map'));
 assert.ok(!zip.file('word/media/image1.png'));
 assert.ok((await zip.file('word/styles.xml').async('string')).includes('Heading1'));
});
test('PowerPoint uses editable native shapes, lines, and text (not screenshots)',async()=>{
 const report=SolutionReports.single(project),blob=await SolutionOffice.pptx(report,{theme:'light',font:'Aptos'}),zip=await JSZip.loadAsync(await blob.arrayBuffer());
 const names=Object.keys(zip.files).filter(k=>/^ppt\/slides\/slide\d+\.xml$/.test(k));
 assert.ok(names.length>6);
 const slides=(await Promise.all(names.map(k=>zip.file(k).async('string')))).join('');
 assert.ok(slides.includes('<p:sp>'));
 assert.ok(slides.includes('<p:cxnSp>'));
 assert.ok(slides.includes('mt_project'));
 assert.ok(!Object.keys(zip.files).some(k=>k.startsWith('ppt/media/')));
});
test('change comparison Word and PowerPoint contain before and after results',async()=>{
 const report=SolutionReports.comparison(project,newer);
 for(const format of ['docx','pptx']){
  const zip=await JSZip.loadAsync(await (await SolutionOffice[format](report)).arrayBuffer());
  const strings=await Promise.all(Object.keys(zip.files).filter(k=>format==='docx'?k==='word/document.xml':/^ppt\/slides\/slide\d+\.xml$/.test(k)).map(k=>zip.file(k).async('string')));
  const text=strings.join('');
  assert.ok(text.includes('mt_milestone'));assert.ok(text.includes('mt_project'));
 }
});
