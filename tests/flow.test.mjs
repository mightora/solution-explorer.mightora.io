import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const context={};context.globalThis=context;
vm.runInNewContext(fs.readFileSync(path.resolve(import.meta.dirname,'../src/flow-explorer.js'),'utf8'),context);
const exp=context.SolutionFlowExplorer;
const example={properties:{displayName:'Case management',connectionReferences:{teams:{api:{name:'shared_teams'},connection:{name:'PRIVATE-CONNECTION'}}},definition:{
 triggers:{When_created:{type:'Request'}},
 actions:{Fetch:{type:'OpenApiConnection',inputs:{host:{operationId:'GetItem',apiId:'dataverse'},parameters:{entityName:'mt_case',password:'secret123'}}},
 Decide:{type:'If',runAfter:{Fetch:['Succeeded']},actions:{Notify:{type:'Compose',inputs:{note:'@concat(triggerBody(),123)',token:'hidden-token'}}},else:{actions:{Reject:{type:'Compose'}}}},
 Finish:{type:'Compose',runAfter:{Decide:['Succeeded']}}}
}}};
test('extracts nested WDL actions, branches and explicit dependencies',()=>{
 const f=exp.fromJSON(example);
 assert.equal(f.triggerCount,1);assert.equal(f.actionCount,5);
 const get=name=>f.steps.find(s=>s.name===name);
 assert.equal(get('Reject').branch,'Else');
 assert.ok(f.edges.some(e=>e.from===get('Fetch').id&&e.to===get('Decide').id&&e.kind==='dependency'));
 assert.ok(f.edges.some(e=>e.to===get('Reject').id&&e.kind==='nested'));
});
test('secret contents do not reach inspected model or diagrams',()=>{
 const f=exp.fromJSON(example),txt=JSON.stringify(f);
 for(const needle of ['secret123','hidden-token','PRIVATE-CONNECTION'])assert.equal(txt.includes(needle),false);
 const action=f.steps.find(s=>s.name==='Fetch');assert.equal(action.inputFields.includes('password'),false);
 assert.ok(exp.diagram(f).includes('<svg'));
 assert.ok(exp.mermaid(f).startsWith('flowchart TD'));
});
test('collects workflow JSON and ignores non-flow JSON files',()=>{
 const files=new Map([['Workflows/Case.json',JSON.stringify(example)],['Workflows/config.json','{}'],['Other/not-flow.json','{}']]);
 assert.equal(exp.collect(files).length,1);
});
test('does not invent order for independently runnable actions',()=>{
 const f=exp.fromJSON({definition:{triggers:{manual:{type:'Request'}},actions:{One:{type:'Compose',runAfter:{}},Two:{type:'Compose',runAfter:{}}}}});
 assert.equal(f.edges.filter(e=>e.kind==='dependency').length,0);
 assert.equal(f.edges.filter(e=>e.kind==='start').length,2);
});
test('interactive branching demonstration is available locally',()=>{
 const f=exp.demo();
 assert.ok(f.steps.some(s=>s.type==='If'));
 assert.ok(f.steps.some(s=>s.type==='Foreach'));
 assert.ok(f.edges.some(e=>e.label==='Else'));
});
test('rejects invalid JSON or missing WDL definitions',()=>{
 assert.throws(()=>exp.fromJSON('{bad'),/Invalid JSON/);
 assert.throws(()=>exp.fromJSON('{}'),/No Power Automate/);
});