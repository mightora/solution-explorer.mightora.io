import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),JSZip=require('../vendor/jszip.cjs'),{DOMParser,XMLSerializer}=require('./support/xmldom');
const s={DOMParser,XMLSerializer,JSZip,Blob,console};s.globalThis=s;
for(const file of ['vendor/js-yaml.min.js','src/parser.js','src/component-catalog.js','src/webresources.js','src/relationship-map.js','src/erd.js','src/form-preview.js','src/solution-details.js','src/object-explorer.js','src/flow-explorer.js','src/flow-layout.js','src/samples.js','src/report-core.js','src/form-report.js','src/report-visuals.js','src/component-reports.js','src/office-export.js','src/office-diagrams.js','src/office-components.js'])vm.runInNewContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),s,{filename:file});
function model(files){let m=s.SolutionCore.parseSolution(files);m=s.SolutionObjectExplorer.enrich(s.SolutionForms.enrich(m,files),files);m.webResources=s.SolutionWebResources.catalog(m,[...files].map(([path,text])=>({path,size:text.length})));return s.SolutionDetails.enrich(m,files);}
function fixture(){return new Map([
 ['solution.xml','<ImportExportXml><SolutionManifest><UniqueName>documentation_test</UniqueName></SolutionManifest></ImportExportXml>'],
 ['customizations.xml',`<ImportExportXml><Entities>
 <Entity Name="new_parent"><PrimaryIdAttribute>new_parentid</PrimaryIdAttribute><attributes><attribute PhysicalName="new_parentid"><Type>uniqueidentifier</Type><IsPrimaryId>1</IsPrimaryId></attribute></attributes></Entity>
 <Entity Name="new_child"><PrimaryIdAttribute>new_childid</PrimaryIdAttribute><attributes><attribute PhysicalName="new_childid"><Type>uniqueidentifier</Type></attribute><attribute PhysicalName="new_parent"><Type>lookup</Type><RequiredLevel>ApplicationRequired</RequiredLevel></attribute></attributes></Entity>
 <Entity Name="new_isolated"><attributes><attribute PhysicalName="new_isolatedname"><Type>nvarchar</Type></attribute></attributes></Entity></Entities>
 <EntityRelationships><EntityRelationship Name="parent_children"><ReferencingEntityName>new_child</ReferencingEntityName><ReferencedEntityName>new_parent</ReferencedEntityName><ReferencingAttributeName>new_parent</ReferencingAttributeName><ReferencedAttributeName>new_parentid</ReferencedAttributeName><EntityRelationshipType>OneToMany</EntityRelationshipType></EntityRelationship>
 <ManyToManyRelationship Name="child_tags"><Entity1LogicalName>new_child</Entity1LogicalName><Entity2LogicalName>external_tag</Entity2LogicalName><IntersectEntityName>new_child_tag</IntersectEntityName></ManyToManyRelationship>
 <EntityRelationship Name="self_child"><ReferencingEntityName>new_child</ReferencingEntityName><ReferencedEntityName>new_child</ReferencedEntityName><EntityRelationshipType>ManyToOne</EntityRelationshipType></EntityRelationship>
 <EntityRelationship Name="missing_target"><ReferencingEntityName>new_child</ReferencingEntityName></EntityRelationship></EntityRelationships>
 <Workflows><Workflow Name="entity_rule" Category="2"><PrimaryEntity>new_child</PrimaryEntity><ProcessTriggerScope>2</ProcessTriggerScope><StateCode>1</StateCode><Xaml><![CDATA[<Rule><Condition Name="High amount" Field="new_amount" Value="100"><Action Name="Require approval" Type="SetRequired" Field="new_approved"/></Condition></Rule>]]></Xaml></Workflow>
 <Workflow Name="all_form_rule" Category="2"><PrimaryEntity>new_child</PrimaryEntity><ProcessTriggerScope>1</ProcessTriggerScope></Workflow>
 <Workflow Name="specific_rule" Category="2"><ProcessTriggerScope>1</ProcessTriggerScope><FormId>12345678-1234-4234-9234-123456789abc</FormId></Workflow>
 <Workflow Name="unknown_rule" Category="2"><Scope>4</Scope></Workflow></Workflows>
 <CanvasApps><CanvasApp Name="new_review"/></CanvasApps>
 <WebResources><WebResource Name="new_scripts.js"><WebResourceType>3</WebResourceType><FileName>WebResources/opaque_payload</FileName></WebResource></WebResources></ImportExportXml>`],
 ['WebResources/opaque_payload','const state = "preserved source";\nfunction onLoad(context) {\n\treturn context;\n}\n// END_OF_RESOURCE'],
 ['CanvasApps/new_review/Src/Review.pa.yaml',`Screens:
  Review:
    Properties:
      OnVisible: =Set(ready, true)
    Children:
      - Approve:
          Control: Classic/Button@2.2.0
          Properties:
            Text: ="Approve"
            X: =20
            Y: =40
            Width: =200
            Height: =50
            OnSelect: |-
              =If(ready,
                Notify("approved"),
                Notify("not ready"))
`]
]);}
test('full ERD retains isolated and external tables, every column, explicit keys, M:N, self links and incomplete edges',()=>{
 const m=model(fixture()),e=s.SolutionERD.build(m);
 assert.equal(e.tables.length,4);assert.ok(e.tables.some(t=>t.name==='new_isolated'));
 assert.ok(e.tables.find(t=>t.name==='external_tag').external);
 assert.ok(e.tables.find(t=>t.name==='new_child').columns.find(c=>c.name==='new_parent').fk);
 assert.ok(e.tables.find(t=>t.name==='new_parent').columns.find(c=>c.name==='new_parentid').pk);
 assert.equal(e.edges.length,4);assert.equal(e.edges.find(e=>e.name==='child_tags').targetCardinality,'N');
 assert.equal(e.edges.find(e=>e.name==='parent_children').targetCardinality,'1');
 assert.equal(e.issues.length,1);
 const pages=s.SolutionERD.pages(e);for(const edge of e.edges)assert.ok(pages.some(p=>p.edges.some(x=>x.id===edge.id)));
 assert.ok(s.SolutionERD.svg(e).includes('new_isolatedname'));
 assert.ok(s.SolutionERD.filter(e,{query:'new_isolatedname'}).tables.some(t=>t.name==='new_isolated'));
});
test('business rules expose actual execution scope, state and conditions, and never confuse workflow ownership scope',()=>{
 const m=model(fixture()),by=new Map(m.businessRules.map(r=>[r.name,r]));
 assert.equal(by.get('entity_rule').scope,'Entity');assert.equal(by.get('entity_rule').state,'Activated');assert.equal(by.get('entity_rule').steps.length,2);
 assert.equal(by.get('all_form_rule').scope,'All forms');assert.equal(by.get('specific_rule').scope,'Specific form');assert.equal(by.get('unknown_rule').scope,'Unknown');
});
test('canvas YAML screens, hierarchy, numeric positions and complete multiline Power Fx are visible without executing formulas',()=>{
 const a=model(fixture()).canvasApps.find(a=>a.name==='new_review');
 assert.equal(a.screens.length,1);assert.equal(a.screens[0].controls[0].kind,'Classic/Button@2.2.0');assert.equal(a.screens[0].controls[0].x,20);
 assert.ok(a.formulas.some(f=>f.property==='OnSelect'&&f.expression.includes('Notify("not ready")')));
 assert.ok(a.sources.some(s=>s.text.includes('OnVisible')));
});
test('nested msapp extraction reads supported source and rejects oversized nested archives',async()=>{
 const inner=new JSZip();inner.file('Src/Review.pa.yaml',fixture().get('CanvasApps/new_review/Src/Review.pa.yaml'));inner.file('Assets/ignored.txt','not source');
 const zip=new JSZip();zip.file('CanvasApps/new_review.msapp',await inner.generateAsync({type:'uint8array'}));const loaded=await JSZip.loadAsync(await zip.generateAsync({type:'uint8array'})),files=fixture();files.delete('CanvasApps/new_review/Src/Review.pa.yaml');
 assert.equal((await s.SolutionDetails.unpackCanvas(loaded,files)).length,0);assert.ok(files.has('CanvasApps/new_review.msapp/Src/Review.pa.yaml'));assert.equal(model(files).canvasApps[0].screens.length,1);
 const fake={files:{'large.msapp':{name:'CanvasApps/large.msapp',dir:false,async:async()=>new Uint8Array()}}};assert.ok((await s.SolutionDetails.unpackCanvas(fake,new Map())).some(x=>x.includes('could not be opened')));
});
test('registered form OnLoad keeps order, disabled state, context and source, distinguishing field/control OnLoad',()=>{
 const files=s.SolutionSamples.files('architecture-tour'),m=model(files),f=m.formLayouts[0];
 assert.equal(f.onLoad.length,2);assert.equal(f.onLoad[0].functionName,'Mightora.onLoad');assert.equal(f.onLoad[0].executionContext,true);assert.equal(f.onLoad[0].sourceAvailable,true);assert.equal(f.onLoad[1].enabled,false);assert.equal(f.onLoad[1].sourceAvailable,false);
 assert.ok(s.SolutionReports.component(m,'form:mt_application / application review').sections.flatMap(s=>s.codeBlocks).some(b=>b.text.includes('getFormContext')));
});
test('web resource source resolves explicit payload filenames with no extension',()=>{
 const m=model(fixture()),c=m.components.find(c=>c.name==='new_scripts.js');
 assert.ok(s.SolutionDetails.sourcesFor(m,c.id)[0].text.includes('END_OF_RESOURCE'));
});
test('every component has its own Office report and complete reports include details for both comparison sides',()=>{
 const m=model(fixture());for(const c of m.components){const r=s.SolutionReports.component(m,c.id);assert.equal(r.sections[0].title,c.name);}
 const report=s.SolutionReports.comparison(m,m);assert.equal(report.erds.length,2);assert.ok(report.sections.some(s=>s.title==='Baseline A / entity_rule'));assert.ok(report.sections.some(s=>s.title==='Newer B / entity_rule'));
});
test('Word and PowerPoint preserve source endings, all event parameters and native editable ERD objects',async()=>{
 const m=model(fixture()),report=s.SolutionReports.single(m);
 for(const kind of ['docx','pptx']){
  const z=await JSZip.loadAsync(await (await s.SolutionOffice[kind](report)).arrayBuffer());const parts=Object.keys(z.files).filter(p=>kind==='docx'?p==='word/document.xml':/^ppt\/slides\/slide\d+\.xml$/.test(p));
  const texts=await Promise.all(parts.map(p=>z.file(p).async('string'))),text=texts.join('');
  assert.ok(text.includes('END_OF_RESOURCE'));assert.ok(text.includes('new_isolatedname'));assert.ok(text.includes('new_child_tag'));assert.ok(text.includes('unknown_rule'));assert.ok(text.includes('not ready'));
  assert.ok(kind==='docx'?text.includes('<v:group'):text.includes('<p:cxnSp>'));
  assert.ok(!Object.keys(z.files).some(p=>/\/(media|embeddings)\//.test(p)));
  for(const part of texts){const parsed=new DOMParser().parseFromString(part,'application/xml');assert.ok(!parsed.getElementsByTagName('parsererror').length);}
 }
});
test('PowerPoint pagination retains long table cells and all columns beyond the first six',async()=>{
 const report={title:'Pagination',subtitle:'test',sections:[{title:'Detail',note:'',paragraphs:[],tables:[{title:'Wide',headers:['A','B','C','D','E','F','G','H'],rows:[['first','long '.repeat(400)+'TABLE_TAIL','three','four','five','six','seven','LAST_COLUMN']]}]}],diagrams:[]};
 const z=await JSZip.loadAsync(await (await s.SolutionOffice.pptx(report)).arrayBuffer()),text=(await Promise.all(Object.keys(z.files).filter(p=>/^ppt\/slides\/slide\d+\.xml$/.test(p)).map(p=>z.file(p).async('string')))).join('');assert.ok(text.includes('TABLE_TAIL'));assert.ok(text.includes('LAST_COLUMN'));
});
test('YAML cycles and hostile markup remain inert, and missing canvas sources are reported',()=>{
 const files=fixture();files.set('CanvasApps/new_review/Src/Review.pa.yaml','Screens:\n  Loop: &loop\n    Children:\n      - Loop: *loop\n');const m=model(files);assert.ok(m.canvasApps.length);
 const e=s.SolutionERD.build(m);e.tables[0].name='<script>globalThis.exploited=true</script>';const svg=s.SolutionERD.svg(e);assert.ok(!svg.includes('<script>'));assert.ok(svg.includes('&lt;script&gt;'));assert.equal(s.exploited,undefined);
 files.delete('CanvasApps/new_review/Src/Review.pa.yaml');assert.ok(model(files).canvasApps[0].issues.some(x=>x.includes('No inspectable screen source')));
});
