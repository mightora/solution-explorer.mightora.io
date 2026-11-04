import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const JSZip=require('../vendor/jszip.cjs'),{DOMParser,XMLSerializer}=require('./support/xmldom');
const s={DOMParser,XMLSerializer,JSZip,Blob,console};s.globalThis=s;
const scripts=['vendor/js-yaml.min.js','src/parser.js','src/component-catalog.js','src/yaml-solutions.js','src/webresources.js','src/relationship-map.js','src/erd.js','src/form-preview.js','src/solution-details.js','src/exploration-core.js','src/documentation.js','src/object-explorer.js','src/flow-analytics.js','src/flow-explorer.js','src/flow-layout.js','src/samples.js','src/report-core.js','src/form-report.js','src/report-visuals.js','src/component-reports.js','src/office-export.js','src/office-diagrams.js','src/office-components.js'];
for(const path of scripts)vm.runInNewContext(fs.readFileSync(new URL('../'+path,import.meta.url),'utf8'),s,{filename:path});
function fixture(){return new Map([
 ['solutions/GrantTrack/solution.yml',`SolutionManifest:
  UniqueName: GrantTrack
  Version: 2.1.0.0
  PublisherUniqueName: MightoraSamples
`],
 ['solutions/GrantTrack/solutioncomponents.yml',`- Path: entities/mt_grant
- Path: modernflows/ReviewFlow
- Path: canvasapps/UnpackagedApp
`],
 ['solutions/GrantTrack/rootcomponents.yml',`RootComponents:
  RootComponent:
    - '@type': '1'
      '@schemaName': mt_grant
    - '@type': '29'
      '@schemaName': ReviewFlow
`],
 ['solutions/GrantTrack/missingdependencies.yml',`MissingDependencies:
  - Required:
      '@type': '61'
      '@schemaName': external/script.js
`],
 ['entities/mt_grant/entity.yml',`Entity:
  Name: mt_grant
  DisplayName: Grant
  OwnershipType: UserOwned
`],
 ['entities/mt_grant/attributes/mt_status.yml',`Attribute:
  LogicalName: mt_status
  Type: Picklist
  RequiredLevel: ApplicationRequired
  Secret: DO_NOT_EXPORT_ME
`],
 ['modernflows/ReviewFlow/flow.yml',`Workflow:
  Name: ReviewFlow
  Properties:
    Definition:
      triggers:
        GrantChanged:
          type: OpenApiConnectionWebhook
          inputs:
            host:
              apiId: /providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps
              operationId: SubscribeWebhookTrigger
            parameters:
              subscriptionRequest/entityname: mt_grant
              subscriptionRequest/message: '3'
              subscriptionRequest/filteringattributes: mt_status
      actions:
        UpdateGrant:
          type: OpenApiConnection
          inputs:
            host:
              apiId: /providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps
              operationId: UpdateRecord
            parameters:
              entityName: mt_grant
              item/mt_status: '100'
`]
 ]);}
function load(files=fixture()){
 let m=s.SolutionCore.parseSolution(files);m.flowDetails=s.SolutionFlowExplorer.collect(files);
 m=s.SolutionObjectExplorer.enrich(s.SolutionForms.enrich(m,files),files);
 m.webResources=s.SolutionWebResources.catalog(m,[...files].map(([path,text])=>({path,size:text.length})));
 return s.SolutionDetails.enrich(m,files);
}
test('modern YAML manifests identify the solution and nested component metadata without XML warnings',()=>{
 const m=load();
 assert.equal(m.info.name,'GrantTrack');assert.equal(m.info.version,'2.1.0.0');assert.equal(m.info.format,'YAML source control');
 assert.ok(m.components.some(x=>x.id==='table:mt_grant'));
 assert.ok(m.components.some(x=>x.id==='column:mt_grant.mt_status'&&x.properties.Type==='Picklist'));
 assert.ok(m.components.some(x=>x.type==='flow'&&x.name==='ReviewFlow'));
 assert.ok(m.warnings.some(x=>x.includes('canvasapps/UnpackagedApp')));
 assert.ok(!m.warnings.some(x=>x.includes('solution.xml not found')));
 assert.ok(!m.warnings.some(x=>x.includes('No supported Dataverse components were discovered')));
});
test('modern flow YAML provides column-matched write and trigger evidence plus a potential self-loop',()=>{
 const m=load(),f=m.flowDetails.find(x=>x.name==='ReviewFlow');
 assert.ok(f);assert.equal(f.analytics.triggers[0].columns[0],'mt_status');
 assert.equal(f.analytics.writes[0].columns[0],'mt_status');
 const doc=s.SolutionDocumentation.forComponent(m,'flow:reviewflow');
 assert.ok(doc.interactions.some(i=>i.operation.startsWith('Writes')&&i.table==='mt_grant'));
 const architecture=s.SolutionDocumentation.solution(m);
 assert.ok(architecture.maps.execution.some(row=>row.includes('mt_grant')));
 assert.ok(architecture.maps.cycles.some(row=>row[0]==='self'));
});
test('every YAML component has a bounded explanation, confidence label, evidence and explicit missing-data status',()=>{
 const m=load();for(const c of m.components){const d=s.SolutionDocumentation.forComponent(m,c);
  for(const key of ['what','does','when','data','depends','impact','verify'])assert.ok(d.overview[key]);
  assert.ok(d.confidence);assert.ok(d.identifier);assert.ok(d.status);assert.ok(d.missing.length||d.evidence.length);
 }
 const column=m.components.find(x=>x.type==='column');
 assert.ok(!JSON.stringify(column.properties).includes('DO_NOT_EXPORT_ME'));
 assert.ok(!s.SolutionDetails.sourcesFor(m,column.id).some(x=>x.text.includes('DO_NOT_EXPORT_ME')));
});
test('invalid YAML and absent declared sources produce actionable warnings rather than made-up values',()=>{
 const files=fixture();files.set('entities/mt_grant/attributes/bad.yml','Attribute: [not valid:');
 const m=load(files);assert.ok(m.warnings.some(x=>x.includes('bad.yml')&&x.includes('could not be parsed')));
 const unknown=m.components.find(x=>x.name==='UnpackagedApp');
 assert.ok(unknown);assert.equal(unknown.coverage,'discovered');
 assert.ok(s.SolutionDocumentation.forComponent(m,unknown).missing.some(x=>x.includes('Only an identifier')));
});
test('multiple YAML manifests do not silently combine separate solutions',()=>{
 const files=fixture();files.set('solutions/Other/solution.yml','SolutionManifest:\n  UniqueName: Other\n');files.set('entities/mt_other/entity.yml','Entity:\n  Name: mt_other\n');
 const m=load(files);assert.ok(m.warnings.some(x=>x.includes('2 solution manifests')));
 assert.ok(!m.components.some(c=>c.name==='mt_other'));
});
test('manifest binary resources count as present even without text extraction',()=>{
 const files=fixture();files.set('solutions/GrantTrack/solutioncomponents.yml','- Path: canvasapps/PackedApp\n');
 const raw=s.SolutionCore.parseSolution(files,new Map([['canvasapps/PackedApp/PackedApp.msapp','1234']]));
 assert.ok(raw.components.some(c=>c.type==='app'&&c.name==='PackedApp'));
 assert.ok(!raw.warnings.some(x=>x.includes('Manifest component source is missing: canvasapps/PackedApp')));
});
test('both editable Office editions retain YAML source evidence, risks, missing data and seven solution maps',async()=>{
 const m=load(),report=s.SolutionReports.single(m);
 assert.ok(report.sections.some(x=>x.title==='Execution impact map'));
 for(const kind of ['docx','pptx']){
  const archive=await JSZip.loadAsync(await (await s.SolutionOffice[kind](report)).arrayBuffer());
  const parts=Object.keys(archive.files).filter(p=>kind==='docx'?p==='word/document.xml':/^ppt\/slides\/slide\d+\.xml$/.test(p));
  const xml=(await Promise.all(parts.map(p=>archive.file(p).async('string')))).join('');
  for(const phrase of ['Execution impact map','Data lineage map','Security matrix','Integration map','Dependency map','ReviewFlow','mt_status','Missing or unverified information','What is this?','flow.yml'])assert.ok(xml.includes(phrase),`${kind} omitted ${phrase}`);
  assert.ok(!xml.includes('DO_NOT_EXPORT_ME'));
  for(const path of parts)assert.ok(!new DOMParser().parseFromString(await archive.file(path).async('string'),'application/xml').getElementsByTagName('parsererror').length);
 }
});
