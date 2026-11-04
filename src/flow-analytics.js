/* Read-only flow analytics. Retains schema names only, never parameter values. */
(function(root){
'use strict';
const identifier=v=>typeof v==='string'&&/^[A-Za-z_][A-Za-z0-9_]*$/.test(v)?v:null;
const object=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const label=v=>String(v??'').slice(0,180);
function analyze(def,refs={}){
 const result={actionCount:0,maxDepth:0,complete:true,triggers:[],writes:[],unresolved:0,unsupported:0};
 const stack=Object.entries(object(def.actions)).map(([name,body])=>({name,body,depth:0,trigger:false}));
 stack.push(...Object.entries(object(def.triggers)).map(([name,body])=>({name,body,depth:0,trigger:true})));
 let seen=0;
 while(stack.length){
  if(++seen>20000){result.complete=false;break;}
  const {name,body,depth,trigger}=stack.pop();if(!body||typeof body!=='object')continue;
  if(!trigger){result.actionCount++;result.maxDepth=Math.max(result.maxDepth,depth);}
  const host=object(body.inputs?.host),alias=host.connectionName||host.connectionReferenceName||host.connection?.referenceName;
  const ref=object(refs[alias]);
  const connector=host.apiId||ref.api?.name||ref.api?.id||ref.id||alias||'';
  const op=String(host.operationId||'');
  const dataverse=/(?:^|\/)(?:shared_)?(?:commondataserviceforapps|commondataservice|dynamicscrmonline|dataverse)$/i.test(connector);
  const p=object(body.inputs?.parameters),subscription=object(p.subscriptionRequest);
  const get=key=>Object.entries(p).find(([k])=>k.toLowerCase()===key.toLowerCase())?.[1];
  const sub=key=>get('subscriptionRequest/'+key)??Object.entries(subscription).find(([k])=>k.toLowerCase()===key.toLowerCase())?.[1]??get(key);
  const isTrigger=trigger&&/^(SubscribeWebhookTrigger|OnNewItems|OnUpdatedItems|OnDeletedItems)(?:_V\d+)?$/i.test(op);
  const isWrite=!trigger&&/^(CreateRecord|UpdateRecord|UpsertRecord|CreateItem|PatchItem|UpdateOnlyRecord)(?:_V\d+|WithOrganization)?$/i.test(op);
  if(dataverse&&(isTrigger||isWrite)){
   const rawTable=isTrigger?sub('entityname'):get('entityName');
   const table=identifier(rawTable),columns=new Set();let columnsStatus='';
   if(isTrigger){
    const raw=sub('filteringattributes')??sub('AttributeFilters');
    if(raw===undefined||raw===null||raw==='')columnsStatus='All columns (no column filter specified)';
    else{
     const values=Array.isArray(raw)?raw:typeof raw==='string'?raw.split(','):[];
     let invalid=!values.length;
     for(const v of values){const c=identifier(typeof v==='string'?v.trim():v);if(c)columns.add(c);else invalid=true;}
     columnsStatus=invalid?'Dynamic or unresolved column filter':'Specified columns';
    }
   }else{
    let dynamic=false;
    for(const k of Object.keys(p))if(/^item\//i.test(k)){
     const c=identifier(k.slice(5).replace(/@odata\.bind$/i,''));if(c)columns.add(c);else dynamic=true;
    }
    if(p.item!==undefined){
     if(p.item&&typeof p.item==='object'&&!Array.isArray(p.item))for(const k of Object.keys(p.item)){
      const c=identifier(k.replace(/@odata\.bind$/i,''));if(c)columns.add(c);else dynamic=true;
     }else dynamic=true;
    }
    columnsStatus=dynamic?'Dynamic or partially unresolved body':columns.size?'Specified columns':'Columns not available in definition';
   }
   const entry={table,step:label(name),operation:op,columns:[...columns].sort(),columnsStatus,
    change:isTrigger?({1:'Added',2:'Deleted',3:'Modified',4:'Added or modified',5:'Added or deleted',6:'Modified or deleted',7:'Added, modified or deleted'}[sub('message')]||(/OnNewItems/i.test(op)?'Added':/OnUpdatedItems/i.test(op)?'Modified':/OnDeletedItems/i.test(op)?'Deleted':'Not specified / dynamic')):'',
    environment:get('organization')===undefined?'Current environment':'Selected environment (not merged with current)',
    filtered:isTrigger&&!!sub('filterexpression')};
   if(!table||/unresolved|not available/.test(columnsStatus))result.unresolved++;
   result[isTrigger?'triggers':'writes'].push(entry);
  }else if((dataverse&&op)||/^Http/i.test(body.type||'')||(!dataverse&&/OpenApiConnection|ApiConnection/i.test(body.type||'')))result.unsupported++;
  const groups=[body.actions,body.else?.actions,...Object.values(object(body.cases)).map(c=>c?.actions),body.default?.actions];
  for(const group of groups){
   if(depth>=100){if(Object.keys(object(group)).length)result.complete=false;continue;}
   for(const [child,b] of Object.entries(object(group)))stack.push({name:child,body:b,depth:depth+1,trigger:false});
  }
 }
 return result;
}
function portfolio(flows,components=[]){
 const aliases=new Map();
 for(const c of components.filter(c=>c.type==='table'))for(const name of [c.name,c.properties?.entitySetName].filter(Boolean))aliases.set(name.toLowerCase(),c.name);
 return flows.map((flow,index)=>({index,name:flow.name,analytics:flow.analytics||null,
  triggers:(flow.analytics?.triggers||[]).map(resolve),writes:(flow.analytics?.writes||[]).map(resolve)}));
 function resolve(e){return {...e,table:e.table?(e.environment==='Current environment'?aliases.get(e.table.toLowerCase())||e.table:e.table):null};}
}
function demo(){
 const connector='shared_commondataserviceforapps';
 const step=(operationId,parameters)=>({type:'OpenApiConnection',inputs:{host:{apiId:connector,operationId},parameters}});
 const trigger=(table,columns)=>({Changed:step('SubscribeWebhookTrigger',{'subscriptionRequest/entityname':table,'subscriptionRequest/filteringattributes':columns,'subscriptionRequest/message':3})});
 const write=(table,column)=>step('UpdateRecord',{entityName:table,['item/'+column]:'Fictional demo value'});
 return [
  {name:'Account → contact sync',definition:{triggers:trigger('account','name,telephone1'),actions:{Find:step('ListRecords',{entityName:'contact'}),Each:{type:'Foreach',actions:{Update:write('contact','telephone1')}}}}},
  {name:'Contact → account review',definition:{triggers:trigger('contact','emailaddress1'),actions:{Check:{type:'If',actions:{Review:{type:'Scope',actions:{Update:write('account','description')}}},else:{actions:{Note:{type:'Compose'}}}}}}},
  {name:'Scheduled contact maintenance',definition:{triggers:{Daily:{type:'Recurrence'}},actions:{Update:write('contact','description')}}}
 ].map(v=>root.SolutionFlowExplorer.fromJSON(v,'Fictional table-impact demo'));
}
root.SolutionFlowAnalytics={analyze,portfolio,demo};
})(globalThis);
