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
  const isTrigger=trigger&&/^(SubscribeWebhookTrigger|(?:Get|Subscribe)?On(?:New|Updated|Deleted)Items)(?:_V\d+)?$/i.test(op);
  const isWrite=!trigger&&/^(CreateRecord|UpdateRecord|UpsertRecord|DeleteRecord|CreateItem|PatchItem|UpdateOnlyRecord|DeleteItem)(?:_V\d+|WithOrganization)?$/i.test(op);
  if(dataverse&&(isTrigger||isWrite)){
   const rawTable=isTrigger?(sub('entityname')??get('table')):(get('entityName')??get('table'));
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
    columnsStatus=/^(DeleteRecord|DeleteItem)/i.test(op)?'Not applicable to delete':dynamic?'Dynamic or partially unresolved body':columns.size?'Specified columns':'Columns not available in definition';
   }
   const message=String(sub('message')??'');
   const changes={1:['added'],2:['deleted'],3:['modified'],4:['added','modified'],5:['added','deleted'],6:['modified','deleted'],7:['added','modified','deleted']};
   const events=isTrigger?(changes[message]||(/NewItems/i.test(op)?['added']:/UpdatedItems/i.test(op)?['modified']:/DeletedItems/i.test(op)?['deleted']:[])):
    (/^(CreateRecord|CreateItem)/i.test(op)?['added']:/^(DeleteRecord|DeleteItem)/i.test(op)?['deleted']:/^UpsertRecord/i.test(op)?['added','modified']:['modified']);
   const entry={table,step:label(name),operation:op,columns:[...columns].sort(),columnsStatus,
    events,
    change:isTrigger?({1:'Added',2:'Deleted',3:'Modified',4:'Added or modified',5:'Added or deleted',6:'Modified or deleted',7:'Added, modified or deleted'}[message]||(/NewItems/i.test(op)?'Added':/UpdatedItems/i.test(op)?'Modified':/DeletedItems/i.test(op)?'Deleted':'Not specified / dynamic')):'',
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
/* A link is a potential event propagation, never proof of a run or of the same row ID.
   Only same-environment, same-table, event-compatible links qualify. For updates,
   a definite non-overlap of the selected trigger columns excludes the link. */
function trace(rows){
 const links=[],MAX_LINKS=6000;let columnMismatches=0,truncated=false;
 const triggers=new Map();
 for(const target of rows)for(const t of target.triggers){
  if(!t.table||t.environment!=='Current environment')continue;
  const key=t.table.toLowerCase();if(!triggers.has(key))triggers.set(key,[]);
  triggers.get(key).push({target,t});
 }
 outer:for(const source of rows)for(const w of source.writes){
  if(!w.table||w.environment!=='Current environment')continue;
  for(const {target,t} of triggers.get(w.table.toLowerCase())||[]){
   let matching=(w.events||[]).filter(e=>(t.events||[]).includes(e));
   if(!matching.length)continue;
   let kind='possible',matchedColumns=[];
   const modified=matching.includes('modified');
   if(modified&&t.columnsStatus==='Specified columns'){
    matchedColumns=w.columns.filter(c=>t.columns.some(tc=>tc.toLowerCase()===c.toLowerCase()));
    if(matchedColumns.length)kind='matched';
    else if(w.columnsStatus==='Specified columns'&&matching.length===1){columnMismatches++;continue;}
    else if(w.columnsStatus==='Specified columns'){
     // Upsert can create a row, but its update path cannot satisfy these filter columns.
     matching=matching.filter(e=>e!=='modified');kind='event';
    }
   }else if(!modified)kind='event';
   else if(t.columnsStatus==='All columns (no column filter specified)')kind='unfiltered';
   const eventLabel=matching.map(e=>({added:'Added',modified:'Modified',deleted:'Deleted'})[e]).join(' or ');
   links.push({from:source.index,to:target.index,source:source.name,target:target.name,
    table:w.table,writeStep:w.step,triggerStep:t.step,writeOperation:w.operation,
    writtenColumns:w.columns,writeColumnsStatus:w.columnsStatus,triggerColumns:t.columns,
    triggerColumnsStatus:t.columnsStatus,matchedColumns,kind,eventLabel,filtered:t.filtered});
   if(links.length>=MAX_LINKS){truncated=true;break outer;}
  }
 }
 const edgesByFrom=new Map();
 for(const link of links){if(!edgesByFrom.has(link.from))edgesByFrom.set(link.from,[]);edgesByFrom.get(link.from).push(link);}
 // Tarjan strongly-connected components identify direct and multi-flow cycles.
 const ids=[...new Set(rows.map(r=>r.index))],indexById=new Map(),low=new Map(),stack=[],onStack=new Set(),components=[];
 let counter=0;
 function visit(id){
  indexById.set(id,counter);low.set(id,counter++);stack.push(id);onStack.add(id);
  for(const e of edgesByFrom.get(id)||[]){const dest=e.to;
   if(!indexById.has(dest)){visit(dest);low.set(id,Math.min(low.get(id),low.get(dest)));}
   else if(onStack.has(dest))low.set(id,Math.min(low.get(id),indexById.get(dest)));
  }
  if(low.get(id)===indexById.get(id)){const component=[];let current;
   do{current=stack.pop();onStack.delete(current);component.push(current);}while(current!==id);
   components.push(component);
  }
 }
 for(const id of ids)if(!indexById.has(id))visit(id);
 const weight=e=>e.kind==='matched'?0:e.kind==='unfiltered'?1:2;
 const loops=[];
 for(const component of components){
  const members=new Set(component),inside=links.filter(e=>members.has(e.from)&&members.has(e.to));
  if(component.length===1){
   const self=inside.filter(e=>e.from===e.to);
   if(self.length)loops.push({type:'self',links:self.sort((a,b)=>weight(a)-weight(b)).slice(0,10),
    flowIds:[component[0]],otherLinks:self.length>10?self.length-10:0});
   continue;
  }
  // Find an actual closed path to illustrate this strongly-connected group.
  const sorted=inside.filter(e=>e.from!==e.to).sort((a,b)=>weight(a)-weight(b));let cycle=[];
  function returnPath(current,goal,visited,path){
   if(current===goal)return path;
   for(const e of sorted){if(e.from!==current||visited.has(e.to))continue;
    const next=new Set(visited);next.add(e.to);
    const result=returnPath(e.to,goal,next,[...path,e]);if(result)return result;
   }
   return null;
  }
  for(const start of sorted){const back=returnPath(start.to,start.from,new Set([start.to]),[]);
   if(back){cycle=[start,...back];break;}
  }
  if(cycle.length)loops.push({type:'chain',links:cycle,flowIds:component,otherLinks:inside.length-cycle.length});
 }
 loops.sort((a,b)=>Number(a.type!=='self')-Number(b.type!=='self')||a.flowIds.length-b.flowIds.length);
 return {links,loops,columnMismatches,truncated};
}
function demo(){
 const connector='shared_commondataserviceforapps';
 const step=(operationId,parameters)=>({type:'OpenApiConnection',inputs:{host:{apiId:connector,operationId},parameters}});
 const trigger=(table,columns)=>({Changed:step('SubscribeWebhookTrigger',{'subscriptionRequest/entityname':table,'subscriptionRequest/filteringattributes':columns,'subscriptionRequest/message':3})});
 const write=(table,column)=>step('UpdateRecord',{entityName:table,['item/'+column]:'Fictional demo value'});
 return [
  {name:'Account → contact sync',definition:{triggers:trigger('account','name,telephone1'),actions:{Find:step('ListRecords',{entityName:'contact'}),Each:{type:'Foreach',actions:{Update:write('contact','telephone1')}}}}},
  {name:'Contact → account review',definition:{triggers:trigger('contact','telephone1'),actions:{Check:{type:'If',actions:{Review:{type:'Scope',actions:{Update:write('account','name')}}},else:{actions:{Note:{type:'Compose'}}}}}}},
  {name:'Account status check (self-write)',definition:{triggers:trigger('account','statuscode'),actions:{Update:write('account','statuscode')}}},
  {name:'Scheduled contact maintenance',definition:{triggers:{Daily:{type:'Recurrence'}},actions:{Update:write('contact','description')}}}
 ].map(v=>root.SolutionFlowExplorer.fromJSON(v,'Fictional table-impact demo'));
}
root.SolutionFlowAnalytics={analyze,portfolio,trace,demo};
})(globalThis);
