/* Mightora Flow Explorer: local-only, non-executable WDL inspection. No secret values are retained. */
(function(root){
"use strict";
const LIMIT=250;
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const short=(s,n=150)=>String(s??"").replace(/[\r\n\t]/g," ").slice(0,n);
const sensitive=/password|token|secret|authorization|cookie|credential|connectionstring|access[_-]?key|client[_-]?secret|sas|accountkey|apikey/i;
const keys=o=>o&&typeof o==="object"&&!Array.isArray(o)?Object.keys(o).filter(k=>!sensitive.test(k)).slice(0,35):[];
function functionsOf(x){
 const found=new Set();
 function visit(v,depth){
  if(depth>9||found.size>30)return;
  if(typeof v==="string"){for(const m of v.matchAll(/@(?:\{)?([A-Za-z][A-Za-z0-9_]*)\s*\(/g))found.add(m[1]);}
  else if(Array.isArray(v))v.slice(0,60).forEach(t=>visit(t,depth+1));
  else if(v&&typeof v==="object")Object.entries(v).slice(0,60).forEach(([k,t])=>{if(!sensitive.test(k))visit(t,depth+1)});
 }visit(x,0);return [...found].sort();
}
function inspect(value,defaultName="Exported flow",source="Workflow JSON"){
 const props=value?.properties||value||{};
 const def=props.definition||value?.definition||(props.triggers&&props.actions?props:null);
 if(!def||typeof def!=="object"||Array.isArray(def))return null;
 const steps=[],edges=[],warnings=[];
 const connections=Object.entries(props.connectionReferences||props.connectionreferences||{}).slice(0,80).map(([k,v])=>({
  alias:short(k),connector:short(v?.api?.name||v?.api?.id||v?.connectionReferenceLogicalName||"",180)
 }));
 function append(name,body,branch,parent,depth,kind="Action"){
  if(steps.length>=LIMIT){if(!warnings.includes("Only the first 250 steps are mapped."))warnings.push("Only the first 250 steps are mapped.");return null;}
  const id="s"+steps.length,host=body?.inputs?.host||{};
  const after={};
  for(const [name,states] of Object.entries(body?.runAfter||{}).slice(0,40))after[short(name)]=Array.isArray(states)?states.map(s=>short(s,30)).slice(0,8):[];
  const expressionFunctions=[...new Set([
    ...functionsOf(body?.inputs),...functionsOf(body?.expression),...functionsOf(body?.foreach),...functionsOf(body?.until)
  ])].sort();
  const item={id,name:short(name,160),type:short(body?.type||kind,100),kind:short(body?.kind||"",80),
    parent,depth,branch:short(branch,90),connector:short(host.apiId||host.connectionName||"",180),
    operation:short(host.operationId||"",140),runAfter:after,
    inputFields:keys(body?.inputs?.parameters||body?.inputs),outputFields:keys(body?.outputs),
    expressionFunctions,secureInputs:!!body?.runtimeConfiguration?.secureData?.properties?.includes?.("inputs"),
    secureOutputs:!!body?.runtimeConfiguration?.secureData?.properties?.includes?.("outputs")};
  steps.push(item);
  if(parent!==null)edges.push({from:parent,to:id,kind:"nested",label:branch});
  return item;
 }
 function walk(items,parent,branch,depth,entry){
  if(!items||typeof items!=="object"||depth>20||Array.isArray(items))return;
  const local=new Map(),records=Object.entries(items).slice(0,LIMIT);
  records.forEach(([name,body])=>{if(body&&typeof body==="object"){const n=append(name,body,branch,parent,depth);if(n)local.set(name,n);}});
  for(const [name,body] of records){
   const n=local.get(name);if(!n)continue;
   const after=body.runAfter||{};
   for(const [prior,status] of Object.entries(after))if(local.has(prior))edges.push({
      from:local.get(prior).id,to:n.id,kind:"dependency",label:Array.isArray(status)?status.join(", "):"runAfter"
   });
   if(!Object.keys(after).length&&entry!==null)edges.push({from:entry,to:n.id,kind:"start",label:"Entry"});
   if(body.actions)walk(body.actions,n.id,"Body",depth+1,n.id);
   if(body.else?.actions)walk(body.else.actions,n.id,"Else",depth+1,n.id);
   if(body.cases)for(const [caseName,c] of Object.entries(body.cases).slice(0,40))if(c?.actions)walk(c.actions,n.id,"Case "+caseName,depth+1,n.id);
   if(body.default?.actions)walk(body.default.actions,n.id,"Default",depth+1,n.id);
  }
 }
 const triggers=Object.entries(def.triggers||{}).slice(0,30);
 const triggerIds=[];
 for(const [name,body] of triggers){const n=append(name,body,"Trigger",null,0,"Trigger");if(n)triggerIds.push(n.id);}
 walk(def.actions||{},null,"Main",0,triggerIds.length===1?triggerIds[0]:null);
 if(!triggers.length)warnings.push("No trigger metadata is available.");
 if(!Object.keys(def.actions||{}).length)warnings.push("No action metadata is available.");
 return {name:short(props.displayName||props.displayname||value?.name||defaultName,180),
  source:short(source,210),steps,edges,connections,warnings,triggerCount:triggerIds.length,
  actionCount:steps.length-triggerIds.length};
}
function fromJSON(input,name="Flow.json"){
 if(typeof input==="string"&&input.length>6*1024*1024)throw Error("Flow JSON exceeds the 6 MB limit.");
 let json;try{json=typeof input==="string"?JSON.parse(input):input;}catch{throw Error("Invalid JSON. Choose a Power Automate flow definition.");}
 const out=inspect(json,name,name);if(!out)throw Error("No Power Automate workflow definition found.");return out;
}
function collect(files){
 const list=[];
 for(const [path,body] of files){
  if(!/(?:^|\/)(?:workflows|modernflows)\//i.test(path)||!/\.json$/i.test(path))continue;
  try{const f=fromJSON(body,path.split("/").pop().replace(/\.json$/i,""));f.source=short(path,210);list.push(f);}catch{}
 }
 if(list.length)return list.slice(0,100);
 for(const [path,xmlText] of files){
  if(!/\.xml$/i.test(path)||!/(customizations|workflows)/i.test(path))continue;
  let doc;try{doc=new DOMParser().parseFromString(xmlText,"application/xml");}catch{continue;}
  for(const wf of Array.from(doc.getElementsByTagName("*")).filter(n=>n.localName?.toLowerCase()==="workflow").slice(0,90)){
   const node=Array.from(wf.getElementsByTagName("*")).find(n=>n.localName?.toLowerCase()==="clientdata");
   if(!node?.textContent)continue;
   try{const f=fromJSON(node.textContent,wf.getAttribute("Name")||"Workflow");f.source=short(path);if(!list.some(x=>x.name===f.name))list.push(f);}catch{}
  }
 }
 return list.slice(0,100);
}
function diagram(flow){
 if(!flow)return "";
 const arr=flow.steps.slice(0,140),width=980,height=Math.max(260,arr.length*100+80);
 const places=new Map(arr.map((s,i)=>[s.id,{x:25+Math.min(s.depth,5)*85,y:28+i*100}]));
 let links="",boxes="";
 for(const e of flow.edges){
  const a=places.get(e.from),b=places.get(e.to);if(!a||!b)continue;
  if(e.kind==="nested")links+='<path d="M '+(a.x+12)+' '+(a.y+75)+' L '+(a.x+12)+' '+(b.y+36)+' L '+b.x+' '+(b.y+36)+'" stroke="#a7b6cd" stroke-dasharray="4 5" fill="none" stroke-width="1.5"/>';
  else links+='<path d="M '+(a.x+440)+' '+(a.y+37)+' C '+(a.x+480)+' '+(a.y+37)+', '+(b.x-30)+' '+(b.y+37)+', '+b.x+' '+(b.y+37)+'" stroke="#23988f" fill="none" stroke-width="1.6" marker-end="url(#arr)"/>';
 }
 for(const s of arr){
  const p=places.get(s.id),colour=s.branch==="Trigger"?"#3b82f6":/if|switch|scope|foreach|until/i.test(s.type)?"#9466ca":"#18a798";
  boxes+='<g data-flow-step="'+esc(s.id)+'" role="button" tabindex="0" aria-label="Inspect '+esc(s.name)+'" style="cursor:pointer"><rect x="'+p.x+'" y="'+p.y+'" width="440" height="75" rx="12" fill="white" stroke="#d7ddea"/><rect x="'+p.x+'" y="'+p.y+'" width="6" height="75" rx="3" fill="'+colour+'"/><text x="'+(p.x+17)+'" y="'+(p.y+28)+'" font-family="Arial" font-size="15" font-weight="bold" fill="#243453">'+esc(s.name.slice(0,45))+'</text><text x="'+(p.x+17)+'" y="'+(p.y+52)+'" font-family="Arial" font-size="12" fill="#63748b">'+esc((s.branch+" · "+s.type+(s.operation?" · "+s.operation:"")).slice(0,64))+'</text><title>'+esc(s.name)+'</title></g>';
 }
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'" role="group" aria-label="Power Automate flow '+esc(flow.name)+'"><defs><marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#23988f"/></marker></defs><rect width="100%" height="100%" fill="#f6f8fc"/>'+links+boxes+'</svg>';
}
function mermaid(flow){
 if(!flow)return "";
 const ids=new Set(flow.steps.map(s=>s.id)),q=s=>short(s,120).replace(/["\\]/g," ");
 const lines=["flowchart TD"];
 for(const n of flow.steps)lines.push('  '+n.id+'["'+q(n.name)+' · '+q(n.type)+'"]');
 for(const e of flow.edges)if(ids.has(e.from)&&ids.has(e.to))lines.push("  "+e.from+(e.kind==="nested"?" -.-> ":" --> ")+e.to);
 return lines.join("\n")+"\n";
}
function demo(){
 return fromJSON({properties:{displayName:"Project approval · branching demo",
  connectionReferences:{dataverse:{api:{name:"shared_commondataserviceforapps"}},email:{api:{name:"shared_office365"}}},
  definition:{triggers:{When_a_project_changes:{type:"OpenApiConnectionWebhook"}},
   actions:{
    Get_project:{type:"OpenApiConnection",inputs:{host:{operationId:"GetItem",apiId:"shared_commondataserviceforapps"}},runAfter:{}},
    Check_approval:{type:"If",runAfter:{Get_project:["Succeeded"]},
     actions:{Send_email:{type:"OpenApiConnection",inputs:{host:{operationId:"SendEmailV2",apiId:"shared_office365"}}},
      For_each_recipient:{type:"Foreach",runAfter:{Send_email:["Succeeded"]},actions:{Log_notification:{type:"Compose",inputs:{reference:"@items('For_each_recipient')"}}}}},
     else:{actions:{Record_pending:{type:"Compose"}}}},
    Update_status:{type:"OpenApiConnection",runAfter:{Check_approval:["Succeeded"]},inputs:{host:{operationId:"PatchItem",apiId:"shared_commondataserviceforapps"}}}
   }}}},"project-approval-demo.json");
}
root.SolutionFlowExplorer={inspect,fromJSON,collect,diagram,mermaid,demo,escape:esc};
})(globalThis);
