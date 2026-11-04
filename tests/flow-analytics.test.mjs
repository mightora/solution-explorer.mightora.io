import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx={};ctx.globalThis=ctx;
for(const file of ['flow-analytics','flow-explorer'])vm.runInNewContext(fs.readFileSync(new URL('../src/'+file+'.js',import.meta.url),'utf8'),ctx);
const api=ctx.SolutionFlowAnalytics;
const step=(op,parameters,connector='shared_commondataserviceforapps')=>({type:'OpenApiConnection',inputs:{host:{operationId:op,apiId:connector},parameters}});
const def=()=>({triggers:{Changed:step('SubscribeWebhookTrigger',{'subscriptionRequest/entityname':'account','subscriptionRequest/filteringattributes':'name,telephone1','subscriptionRequest/message':3})},actions:{Loop:{type:'Foreach',actions:{Condition:{type:'If',actions:{Write:step('UpdateRecord',{entityName:'contacts','item/firstname':'PRIVATE_VALUE','item/parentcustomerid_account@odata.bind':'PRIVATE_LOOKUP'})},else:{actions:{Create:step('CreateRecord',{entityName:'accounts',item:{name:'SECRET'}})}}}}},Switch:{type:'Switch',cases:{a:{actions:{A:{type:'Compose'}}}},default:{actions:{B:{type:'Scope',actions:{C:{type:'Compose'}}}}}}}});
test('counts every branch and container independently of existing map cap',()=>{
 const f=ctx.SolutionFlowExplorer.fromJSON({definition:def()});
 assert.equal(f.analytics.actionCount,8);assert.equal(f.analytics.maxDepth,2);assert.equal(f.analytics.complete,true);
 const big={actions:Object.fromEntries(Array.from({length:400},(_,i)=>['A'+i,{type:'Compose'}]))};
 const large=ctx.SolutionFlowExplorer.fromJSON({definition:big});
 assert.equal(large.actionCount,250);assert.equal(large.analytics.actionCount,400);
});
test('maps subscription columns and create/update writes without retaining values',()=>{
 const a=api.analyze(def());assert.equal(a.triggers[0].table,'account');assert.equal(a.triggers[0].change,'Modified');
 assert.deepEqual([...a.triggers[0].columns],['name','telephone1']);
 const w=a.writes.find(x=>x.table==='contacts');assert.deepEqual([...w.columns],['firstname','parentcustomerid_account']);
 for(const value of ['PRIVATE_VALUE','PRIVATE_LOOKUP','SECRET'])assert.ok(!JSON.stringify(a).includes(value));
});
test('connector aliases, nested subscriptions, dynamic fields and non-Dataverse writes',()=>{
 const d={triggers:{T:step('SubscribeWebhookTrigger',{subscriptionRequest:{entityname:'account',filteringattributes:"@variables('private')"}})},actions:{A:step('UpdateRecord',{entityName:"@variables('secretTable')",item:"@outputs('secretBody')"}),B:step('PatchItem',{entityName:'not_dataverse','item/title':'x'},'shared_sharepointonline'),Read:step('GetItem',{entityName:'accounts'})}};
 delete d.triggers.T.inputs.host.apiId;d.triggers.T.inputs.host.connectionReferenceName='dv';
 const a=api.analyze(d,{dv:{api:{name:'shared_commondataserviceforapps'}}});
 assert.equal(a.writes.length,1);assert.equal(a.writes[0].table,null);assert.equal(a.unresolved,2);assert.equal(a.unsupported,2);
 assert.ok(!JSON.stringify(a).includes('secret'));assert.match(a.triggers[0].columnsStatus,/unresolved/);
});
test('unfiltered and filtered triggers remain distinct; legacy operations work',()=>{
 const a=api.analyze({triggers:{T:step('SubscribeWebhookTrigger',{'subscriptionRequest/entityname':'account','subscriptionRequest/filterexpression':'name eq SECRET'})},actions:{W:step('PatchItem_V2',{entityName:'accounts','item/name':'x'},'shared_commondataservice')}});
 assert.match(a.triggers[0].columnsStatus,/no column filter/);assert.equal(a.triggers[0].filtered,true);assert.equal(a.writes.length,1);assert.ok(!JSON.stringify(a).includes('SECRET'));
});
test('resolves entity set aliases only using actual solution metadata',()=>{
 const rows=api.portfolio([{name:'F',analytics:api.analyze(def())}],[{type:'table',name:'contact',properties:{entitySetName:'contacts'}}]);
 assert.equal(rows[0].writes.find(x=>x.operation==='UpdateRecord').table,'contact');
 assert.equal(rows[0].writes.find(x=>x.operation==='CreateRecord').table,'accounts');
});
test('selected environment operations do not collapse into local table aliases',()=>{
 const a=api.analyze({actions:{W:step('UpdateRecordWithOrganization',{organization:'PRIVATE_URL',entityName:'contacts','item/name':'x'})}});
 const rows=api.portfolio([{name:'F',analytics:a}],[{type:'table',name:'contact',properties:{entitySetName:'contacts'}}]);
 assert.equal(rows[0].writes[0].table,'contacts');assert.ok(!JSON.stringify(a).includes('PRIVATE_URL'));
});
test('marks excessive nesting incomplete instead of giving exact-looking totals',()=>{
 let a={X:{type:'Compose'}};for(let i=0;i<110;i++)a={Scope:{type:'Scope',actions:a}};
 assert.equal(api.analyze({actions:a}).complete,false);
});
test('table-impact demo includes multiple flows and reciprocal table relationships',()=>{
 const flows=api.demo();assert.equal(flows.length,3);
 assert.equal(flows[0].analytics.triggers[0].table,'account');
 assert.equal(flows[0].analytics.writes[0].table,'contact');
 assert.equal(flows[1].analytics.triggers[0].table,'contact');
 assert.equal(flows[1].analytics.writes[0].table,'account');
 assert.equal(flows[2].analytics.triggers.length,0);
});
