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
test('table-impact demo includes reciprocal table relationships and a self-loop',()=>{
 const flows=api.demo();assert.equal(flows.length,4);
 assert.equal(flows[0].analytics.triggers[0].table,'account');
 assert.equal(flows[0].analytics.writes[0].table,'contact');
 assert.equal(flows[1].analytics.triggers[0].table,'contact');
 assert.equal(flows[1].analytics.writes[0].table,'account');
 assert.equal(flows[3].analytics.triggers.length,0);
 const report=api.trace(api.portfolio(flows));
 assert.ok(report.loops.some(x=>x.type==='chain'&&x.flowIds.includes(0)&&x.flowIds.includes(1)));
 assert.ok(report.loops.some(x=>x.type==='self'&&x.flowIds.includes(2)));
 assert.ok(report.links.some(x=>x.kind==='matched'&&x.table==='contact'&&x.matchedColumns.includes('telephone1')));
});
test('a direct column write to a watched trigger column creates a column-matched self-cycle',()=>{
 const d={triggers:{T:step('SubscribeWebhookTrigger',{'subscriptionRequest/entityname':'account','subscriptionRequest/filteringattributes':'statuscode','subscriptionRequest/message':3})},actions:{W:step('UpdateRecord',{entityName:'account','item/statuscode':0})}};
 const report=api.trace(api.portfolio([{name:'A',analytics:api.analyze(d)}]));
 assert.equal(report.loops.length,1);assert.equal(report.loops[0].type,'self');
 assert.equal(report.links[0].kind,'matched');assert.deepEqual([...report.links[0].matchedColumns],['statuscode']);
});
test('nonmatching modified columns do not cause a retrigger, even on the same table',()=>{
 const rows=api.portfolio([{
  name:'A',analytics:api.analyze({triggers:{T:step('SubscribeWebhookTrigger',{'subscriptionRequest/entityname':'account','subscriptionRequest/filteringattributes':'name','subscriptionRequest/message':3})},actions:{W:step('UpdateRecord',{entityName:'account','item/telephone1':'not-retained'})}})
 }]);
 const report=api.trace(rows);assert.equal(report.links.length,0);assert.equal(report.loops.length,0);assert.equal(report.columnMismatches,1);
 assert.ok(!JSON.stringify(rows).includes('not-retained'));
});
test('an unfiltered update, an unresolved body, and a create event remain potential, not definite column matches',()=>{
 const trigger=(cols,msg=3)=>step('SubscribeWebhookTrigger',{'subscriptionRequest/entityname':'account','subscriptionRequest/filteringattributes':cols,'subscriptionRequest/message':msg});
 const rows=api.portfolio([
  {name:'No filter',analytics:api.analyze({triggers:{T:trigger(undefined)},actions:{W:step('UpdateRecord',{entityName:'account','item/name':'x'})}})},
  {name:'Dynamic body',analytics:api.analyze({triggers:{T:trigger('name')},actions:{W:step('UpdateRecord',{entityName:'account',item:'@body("x")'})}})},
  {name:'Create',analytics:api.analyze({triggers:{T:trigger('name',1)},actions:{W:step('CreateRecord',{entityName:'account','item/otherfield':'x'})}})}
 ]);
 const links=api.trace(rows).links;
 assert.ok(links.some(x=>x.from===0&&x.to===0&&x.kind==='unfiltered'));
 assert.ok(links.some(x=>x.from===1&&x.to===1&&x.kind==='possible'));
 assert.ok(links.some(x=>x.from===2&&x.to===2&&x.kind==='event'));
});
test('multi-flow feedback paths require compatible change types and environments',()=>{
 const t=(table,msg=3)=>step('SubscribeWebhookTrigger',{'subscriptionRequest/entityname':table,'subscriptionRequest/message':msg});
 const f=(name,triggerTable,writeTable)=>({name,analytics:api.analyze({triggers:{T:t(triggerTable)},actions:{W:step('UpdateRecord',{entityName:writeTable,'item/name':'x'})}})});
 const rows=api.portfolio([f('A','account','contact'),f('B','contact','account')]);
 const report=api.trace(rows);assert.ok(report.loops.some(x=>x.type==='chain'&&x.links.length===2));
 const nonMatch=api.portfolio([{name:'A',analytics:api.analyze({triggers:{T:t('account',2)},actions:{W:step('UpdateRecord',{entityName:'account','item/name':'x'})}})}]);
 assert.equal(api.trace(nonMatch).links.length,0);
 const separate=api.portfolio([{name:'A',analytics:api.analyze({triggers:{T:t('account')},actions:{W:step('UpdateRecordWithOrganization',{entityName:'account',organization:'ENVIRONMENT_URL','item/name':'x'})}})}]);
 assert.equal(api.trace(separate).links.length,0);
});
