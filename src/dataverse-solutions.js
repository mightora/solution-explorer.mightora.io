/* Mightora Solution Explorer — authenticated Dataverse environment adapter.
 * No credentials, Xrm auth tokens, uploads, writes or third-party calls.
 * A managed solution is inventory-only: Microsoft does not allow exporting it. */
(function(root){
'use strict';
const MAX_SOLUTIONS=1500, MAX_COMPONENTS=5000, MAX_ZIP_BYTES=75*1024*1024;
const guid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const unique=/^[A-Za-z_][A-Za-z0-9_.]{0,127}$/;
const escName=s=>String(s||'').replace(/[\r\n\t\u0000-\u001f]/g,' ').slice(0,180);
function context(){
 try{
  const loc=root.location,origin=new URL(loc.href).origin;
  if(!/^https:/.test(loc.protocol)||!/(?:^|\/)WebResources(?:\/|$)/i.test(loc.pathname))return null;
  let xrm=null;
  try{xrm=root.Xrm||root.parent?.Xrm||root.top?.Xrm||null;}catch{}
  if(xrm?.Utility?.getGlobalContext){
   const client=new URL(xrm.Utility.getGlobalContext().getClientUrl());
   if(client.origin!==origin)return null;
  }
  return {origin,xrm};
 }catch{return null;}
}
function apiUrl(client,path){
 const url=new URL(path,client.origin+'/api/data/v9.2/');
 if(url.origin!==client.origin||!url.pathname.startsWith('/api/data/v9.2/'))throw Error('Blocked a non-Dataverse API request.');
 return url.href;
}
async function request(client,path,opts={}){
 const url=apiUrl(client,path),method=opts.method||'GET';
 const response=await root.fetch(url,{method,credentials:'same-origin',redirect:'error',headers:{
  'Accept':'application/json','OData-MaxVersion':'4.0','OData-Version':'4.0',
  ...(method==='POST'?{'Content-Type':'application/json; charset=utf-8'}:{})
 },...(method==='POST'?{body:JSON.stringify(opts.body)}:{})});
 if(!response.ok){
  let detail='';try{const data=await response.json();detail=escName(data?.error?.message||'');}catch{}
  throw Error('Dataverse request failed (HTTP '+response.status+').'+(detail?' '+detail:''));
 }
 return response.json();
}
async function paged(client,start,limit){
 let path=start,count=0,items=[],pages=0,truncated=false;
 while(path&&pages<12&&items.length<limit){
  const page=await request(client,path),values=Array.isArray(page.value)?page.value:[];
  const remaining=limit-items.length;items.push(...values.slice(0,remaining));
  count+=values.length;pages++;
  path=page['@odata.nextLink']||null;
  if(path&&(!/^https:\/\//.test(path)||new URL(path).origin!==client.origin)){
   throw Error('Dataverse pagination returned an unexpected host.');
  }
 }
 truncated=!!path||count>limit;
 return {items,truncated};
}
async function list(client){
 if(!client)throw Error('Open the web resource inside a signed-in Dataverse environment.');
 const query='solutions?$select=solutionid,uniquename,friendlyname,version,ismanaged,visible&$orderby=friendlyname asc&$top=500';
 const {items,truncated}=await paged(client,query,MAX_SOLUTIONS);
 return {solutions:items.filter(x=>guid.test(x.solutionid||'')&&typeof x.uniquename==='string').map(x=>({
  id:x.solutionid,name:escName(x.friendlyname||x.uniquename),uniqueName:escName(x.uniquename),
  version:escName(x.version||''),managed:x.ismanaged===true,visible:x.visible!==false,
  special:/^(?:Active|Default)$/i.test(x.uniquename)
 })),truncated};
}
function base64File(encoded,name){
 if(typeof encoded!=='string'||!/^[A-Za-z0-9+/\s]*={0,2}$/.test(encoded))throw Error('Dataverse did not return a valid solution ZIP payload.');
 const b64=encoded.replace(/\s/g,'');
 const estimated=Math.floor(b64.length*3/4);
 if(!estimated||estimated>MAX_ZIP_BYTES)throw Error('Export exceeds the 75 MB parser limit. Export a smaller solution.');
 const binary=root.atob(b64),bytes=new Uint8Array(binary.length);
 if(bytes.length>MAX_ZIP_BYTES)throw Error('Export exceeds the 75 MB parser limit.');
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 if(bytes[0]!==0x50||bytes[1]!==0x4b)throw Error('Dataverse returned an invalid ZIP header.');
 const fileName=String(name||'solution').replace(/[^A-Za-z0-9_.-]/g,'_').slice(0,90)+'.zip';
 return new root.File([bytes],fileName,{type:'application/zip'});
}
async function exportUnmanaged(client,solution){
 if(!client)throw Error('Dataverse environment is not connected.');
 if(!solution||solution.managed)throw Error('Managed solutions cannot be exported. Use the partial inventory instead.');
 if(solution.special)throw Error('Default or Active solutions cannot be exported. Use the inventory or upload a ZIP.');
 if(!unique.test(solution.uniqueName))throw Error('Solution unique name was invalid.');
 const result=await request(client,'ExportSolution',{method:'POST',body:{SolutionName:solution.uniqueName,Managed:false}});
 return base64File(result.ExportSolutionFile,solution.uniqueName);
}
const CODES={1:'table',2:'column',3:'relationship',9:'choice',14:'key',20:'role',21:'privilege',24:'form',26:'view',29:'flow',31:'report',36:'emailtemplate',44:'duplicate',46:'datamap',48:'command',50:'ribbon',59:'chart',60:'form',61:'webresource',62:'sitemap',66:'pcf',70:'fieldsecurity',71:'fieldpermission',90:'plugintype',91:'pluginassembly',92:'pluginstep',93:'pluginimage',95:'endpoint',150:'routing',152:'sla',153:'slaitem',161:'offlineprofile',300:'app',371:'connector',380:'environment',400:'ai',402:'ai'};
function inventoryModel(solution,rows,truncated){
 const labels=root.SolutionCore?.LABELS||{},types=root.SolutionCore?.TYPES||[];
 const components=rows.filter(x=>Number.isInteger(x.componenttype)).map((x,i)=>{
  const type=(root.SolutionCore?.ROOT_COMPONENT_TYPES||CODES)[String(x.componenttype)]||'unknown';
  const ident=String(x.objectid||x.solutioncomponentid||i).slice(0,80);
  const friendly=labels[type]||type;
  return {id:type+':'+ident.toLowerCase(),type,name:friendly+' · '+ident,
   description:'Live solution component reference (definition not exported)',
   coverage:type==='unknown'?'unsupported':'discovered',source:'Current environment · solutioncomponents',
   properties:{componentType:String(x.componenttype),objectId:ident,rootComponentBehavior:String(x.rootcomponentbehavior??'Not supplied')}
  };
 });
 const counts=Object.fromEntries(types.map(t=>[t,components.filter(c=>c.type===t).length]));
 const coverage={inspected:0,discovered:components.filter(c=>c.coverage==='discovered').length,referenced:0,unsupported:components.filter(c=>c.coverage==='unsupported').length};
 const warning='Metadata-only inventory: managed/Default solutions cannot be exported via ExportSolution. Names and full definitions are not recoverable from solutioncomponent references alone. Do not treat this as a ZIP unpack or a complete architecture assessment.';
 return {info:{name:solution.uniqueName,version:solution.version||'',managed:solution.managed,publisher:'Not supplied',filename:solution.name+' (live inventory)'},
  components,counts,coverage,dependencies:[],flowDetails:[],formLayouts:[],warnings:[warning,...(truncated?['Live inventory was limited to '+MAX_COMPONENTS+' components.']:[])],partial:true,live:true};
}
async function inspectMetadata(client,solution){
 if(!client||!guid.test(solution?.id||''))throw Error('Choose a valid environment solution.');
 const query='solutioncomponents?$select=solutioncomponentid,componenttype,objectid,rootcomponentbehavior&$filter=_solutionid_value eq '+solution.id+'&$top=500';
 const result=await paged(client,query,MAX_COMPONENTS);
 return inventoryModel(solution,result.items,result.truncated);
}
root.MightoraDataverseSolutions={context,list,exportUnmanaged,inspectMetadata,inventoryModel,base64File,apiUrl};
})(globalThis);