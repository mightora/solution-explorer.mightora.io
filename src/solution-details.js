/* Source-backed component documentation. Imported code and formulas are data only.
 * No eval, dynamic script, HTML iframe or formula execution is used. */
(function(root){
'use strict';
const norm=s=>String(s??'').trim().toLowerCase(),pathOf=s=>String(s||'').replace(/\\/g,'/').replace(/^\/+/,''),guid=s=>norm(s).replace(/[{}]/g,'');
const tag=n=>norm(n?.localName||n?.nodeName),kids=n=>Array.from(n?.childNodes||[]).filter(n=>n.nodeType===1),all=n=>Array.from(n?.getElementsByTagName('*')||[]);
function field(n,...keys){for(const key of keys){const a=Array.from(n?.attributes||[]).find(a=>norm(a.name)===norm(key));if(a)return a.value;const c=kids(n).find(c=>tag(c)===norm(key));if(c)return String(c.textContent||'').trim();}return '';}
function xml(text){try{const d=new DOMParser().parseFromString(text,'application/xml');return all(d).some(n=>tag(n)==='parsererror')?null:d;}catch{return null;}}
function serialize(n){return root.XMLSerializer?new root.XMLSerializer().serializeToString(n):n.toString();}
const idOf=(type,name)=>type+':'+norm(name).replace(/\s+/g,' '),language=path=>{const p=path.split('#')[0];return /\.ya?ml$/i.test(p)?'yaml':/\.json$/i.test(p)?'json':/\.js$/i.test(p)?'javascript':/\.(xml|xaml)$/i.test(p)?'xml':/\.css$/i.test(p)?'css':'text';};
function fingerprint(v){const s=JSON.stringify(v);let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return (h>>>0).toString(16).padStart(8,'0');}
function source(path,text,kind='Source'){return {path,language:language(path),kind,text:String(text??'')};}
function sourcesFor(m,id){return m.componentSources?.[id]||[];}
function addSource(m,id,s){const list=m.componentSources[id]||(m.componentSources[id]=[]);if(!list.some(x=>x.path===s.path&&x.text===s.text))list.push(s);}
function refresh(m){m.counts=Object.fromEntries(root.SolutionCore.TYPES.map(t=>[t,m.components.filter(c=>c.type===t).length]));m.coverage=Object.fromEntries(['inspected','discovered','referenced','unsupported'].map(k=>[k,m.components.filter(c=>(c.coverage||'inspected')===k).length]));return m;}
function resourceFiles(m,files){
 for(const r of m.webResources||[]){
  if(!root.SolutionWebResources.textResource(r.name))continue;
  const found=[...files].find(([p])=>norm(pathOf(p))===norm(pathOf(r.path)));
  if(found)addSource(m,r.id,source(found[0],found[1],'Web resource source'));
 }
}
function formEvents(m,docs){
 for(const f of m.formLayouts||[]){
  let match=null;
  for(const [path,d] of docs){
   for(const n of all(d).filter(n=>['systemform','form'].includes(tag(n)))){
    const id=field(n,'formid','id'),nm=field(n,'name');
    if(id&&guid(id)===guid(f.id)||nm&&norm(nm)===norm(f.name)&&path===f.source){match=n;break;}
   }
   if(match)break;
  }
  if(!match){const doc=docs.find(([p])=>p===f.source)?.[1];const forms=all(doc).filter(n=>tag(n)==='systemform');match=forms.find(n=>all(n).some(l=>tag(l)==='localizedname'&&norm(field(l,'description'))===norm(f.name)))||null;}
  const layout=tag(match)==='form'?match:all(match).find(n=>tag(n)==='form')||xml(match?.textContent||'')?.documentElement;
  f.events=[];f.libraries=[];
  if(!layout)continue;
  f.libraries=all(layout).filter(n=>tag(n)==='library').map(n=>({name:field(n,'name'),id:field(n,'libraryUniqueId')}));
  for(const event of all(layout).filter(n=>tag(n)==='event')){
   const eventName=field(event,'name'),attribute=field(event,'attribute');
   let parent=event.parentNode,owner='form';
   while(parent&&parent!==layout){if(['control','tab','cell'].includes(tag(parent))){owner=field(parent,'id','name')||tag(parent);break;}parent=parent.parentNode;}
   const handlers=all(event).filter(n=>tag(n)==='handler');
   handlers.forEach((h,i)=>{
    const library=field(h,'libraryName'),resource=(m.webResources||[]).find(r=>norm(r.name)===norm(library));
    const loaded=resource?sourcesFor(m,resource.id):[];
    f.events.push({event:eventName,attribute,owner,order:i+1,functionName:field(h,'functionName'),library,enabled:!['false','0'].includes(norm(field(h,'enabled'))),executionContext:['true','1'].includes(norm(field(h,'passExecutionContext'))),parameters:field(h,'parameters'),handlerId:field(h,'handlerUniqueId'),sourceId:resource?.id||'',sourceAvailable:loaded.length>0});
   });
  }
  f.onLoad=f.events.filter(e=>norm(e.event)==='onload'&&e.owner==='form'&&!e.attribute);
  const c=m.components.find(c=>c.type==='form'&&(norm(c.name)===norm(f.table+' / '+f.name)||guid(c.properties?.formId)===guid(f.id)));
  if(c){c.properties={...c.properties,onLoadHandlers:String(f.onLoad.length),scriptLibraries:String(f.libraries.length),eventFingerprint:fingerprint(f.events)};addSource(m,c.id,source(f.source+'#'+f.id,serialize(layout),'FormXML'));m.components=m.components.filter(other=>other.id===c.id||other.type!=='form'||norm(other.name)!==norm(f.table+' / '+f.id));}
 }
}
function scopeOf(w,triggers){
 const scope=field(w,'ProcessTriggerScope','processtriggerscope','BusinessRuleScope'),formId=field(w,'ProcessTriggerFormId','FormId');
 const explicit=field(w,'Scope');
 const formIds=[...new Set([formId,...triggers.map(t=>t.formId)].filter(x=>x&&guid(x)!=='00000000-0000-0000-0000-000000000000'))];
 if(scope==='2'||/^(entity|table)$/i.test(scope)||/^(entity|table)$/i.test(explicit))return {scope:'Entity',scopeEvidence:'ProcessTriggerScope / explicit rule scope',formIds};
 if(formIds.length)return {scope:'Specific form',scopeEvidence:'FormId / ProcessTriggerFormId',formIds};
 if(scope==='1'||/^all\s*forms$/i.test(scope)||/^all\s*forms$/i.test(explicit)||triggers.length)return {scope:'All forms',scopeEvidence:'Form trigger without a specific form ID',formIds};
 return {scope:'Unknown',scopeEvidence:'Scope metadata not supplied; workflow ownership Scope is not business rule execution scope',formIds};
}
function ruleSteps(definition){
 const d=xml(definition),steps=[];
 if(d){
  const recognised=/^(if|condition|conditionstep|conditionbranch|evaluatecondition|action|setfieldvalue|setattributevalue|setentityproperty|setdefaultvalue|setfieldrequiredlevel|setrequiredlevel|setvisibility|setfieldvisibility|setdisplaymode|setfieldreadonly|showerror|recommendation)$/;
  for(const n of all(d)){if(!recognised.test(tag(n)))continue;const attributes=Object.fromEntries(Array.from(n.attributes||[]).filter(a=>!/^xmlns/i.test(a.name)).map(a=>[a.name,a.value]));
   let parent=n.parentNode;while(parent&&!recognised.test(tag(parent)))parent=parent.parentNode;
   steps.push({id:'rule-step-'+steps.length,kind:tag(n),name:field(n,'DisplayName','Name','name')||n.localName||n.nodeName,parent:parent?all(d).filter(x=>recognised.test(tag(x))).indexOf(parent):-1,detail:Object.entries(attributes).map(([k,v])=>k+': '+v).join('; ')||String(n.textContent||'').trim()});
  }
 }else{
  try{const data=JSON.parse(definition),seen=new WeakSet();let budget=10000;
   const walk=(v,path,parent=-1)=>{if(!v||typeof v!=='object'||seen.has(v)||--budget<0)return;seen.add(v);
    const kind=String(v.Type||v.type||v.__type||v.kind||''),name=String(v.DisplayName||v.Name||v.name||path);
    let current=parent;
    if(/condition|action|branch|set.*(field|value|visible|required)|showerror|recommendation/i.test(kind)){current=steps.length;steps.push({id:'rule-step-'+current,kind,name,parent,detail:JSON.stringify(v)});}
    for(const [k,x] of Object.entries(v))if(x&&typeof x==='object')walk(x,path+'.'+k,current);
   };walk(data,'definition');
  }catch{ /* Unsupported definitions remain available as source, never interpreted. */ }
 }
 return steps;
}
function businessRules(m,files,docs){
 const rules=new Map();
 const workflows=docs.flatMap(([path,d])=>all(d).filter(n=>tag(n)==='businessrule'||tag(n)==='workflow'&&field(n,'Category')==='2').map(n=>({path,n})));
 for(const {path,n} of workflows){
  const name=field(n,'Name','name')||field(n,'WorkflowId'),id=idOf('businessrule',name),workflowId=field(n,'WorkflowId','id');if(!name)continue;
  const triggers=all(n).filter(t=>tag(t)==='processtrigger').map(t=>({event:field(t,'Event'),field:field(t,'ControlName'),formId:field(t,'FormId'),scope:field(t,'Scope','ProcessTriggerScope')}));
  for(const [,d] of docs)for(const t of all(d).filter(t=>tag(t)==='processtrigger'))if(workflowId&&guid(field(t,'ProcessId','WorkflowId'))===guid(workflowId)&&!all(n).includes(t))triggers.push({event:field(t,'Event'),field:field(t,'ControlName'),formId:field(t,'FormId'),scope:field(t,'Scope','ProcessTriggerScope')});
  const scoped=scopeOf(n,triggers);if(triggers.some(t=>t.scope==='2')){scoped.scope='Entity';scoped.scopeEvidence='ProcessTrigger.Scope = 2';}
  const table=field(n,'PrimaryEntity','PrimaryEntityTypeCode','EntityName'),state=field(n,'StateCode','statecode');
  const r={id,name,workflowId,table,...scoped,state:state==='1'?'Activated':state==='0'?'Draft':state==='2'?'Suspended':'Unknown',triggers,steps:[],sources:[]};
  const definitions=[source(path+'#'+(workflowId||name),serialize(n),'Business rule metadata')];
  for(const key of ['Xaml','ClientData','Definition']){const value=field(n,key);if(value)definitions.push(source(path+'#'+key,value,'Business rule definition'));}
  const xamlFile=field(n,'XamlFileName','FileName');
  for(const [p,text] of files){const base=pathOf(p).split('/').pop().toLowerCase();
   if(!/workflows\/|businessrules\//i.test(p)||!/\.(xaml|json)$/i.test(p))continue;
   if(xamlFile&&norm(pathOf(xamlFile))===norm(pathOf(p))||workflowId&&base.includes(guid(workflowId))||base.replace(/\.(xaml|json)$/,'')===norm(name))definitions.push(source(p,text,'Business rule definition'));
  }
  r.sources=definitions;r.steps=definitions.flatMap(s=>ruleSteps(s.text));
  for(const s of definitions)addSource(m,id,s);
  const prior=rules.get(id);if(!prior||definitions.reduce((n,s)=>n+s.text.length,0)>prior.sources.reduce((n,s)=>n+s.text.length,0))rules.set(id,r);
 }
 for(const c of m.components.filter(c=>c.type==='businessrule'))if(!rules.has(c.id))rules.set(c.id,{id:c.id,name:c.name,table:c.properties?.primaryEntity||c.properties?.EntityName||'',scope:'Unknown',scopeEvidence:'Definition not packaged',formIds:[],triggers:[],steps:[],sources:[],state:'Unknown'});
 m.businessRules=[...rules.values()];
 for(const r of m.businessRules){let c=m.components.find(c=>c.id===r.id);if(!c){c={id:r.id,type:'businessrule',name:r.name,properties:{},coverage:'inspected'};m.components.push(c);}c.properties={...c.properties,table:r.table,scope:r.scope,state:r.state,scopeEvidence:r.scopeEvidence,definitionFingerprint:fingerprint(r.sources.map(s=>s.text))};}
}
function views(m,docs){
 m.viewLayouts=[];
 for(const [path,d] of docs)for(const n of all(d).filter(n=>tag(n)==='savedquery')){
  const name=field(n,'name','Name')||field(n,'savedqueryid','id');if(!name)continue;
  const fetchNode=kids(n).find(n=>tag(n)==='fetchxml'),layoutNode=kids(n).find(n=>tag(n)==='layoutxml');
  const fetchXml=fetchNode?(kids(fetchNode).length?serialize(kids(fetchNode)[0]):fetchNode.textContent):'',layoutXml=layoutNode?(kids(layoutNode).length?serialize(kids(layoutNode)[0]):layoutNode.textContent):'';
  const fetch=xml(fetchXml),layout=xml(layoutXml);let table=field(all(fetch).find(n=>tag(n)==='entity'),'name');
  let parent=n.parentNode;while(!table&&parent){if(tag(parent)==='entity')table=field(parent,'Name','LogicalName');parent=parent.parentNode;}
  if(!table)table=pathOf(path).match(/entities\/([^/]+)\//i)?.[1]||'';
  const id=idOf('view',table?table+' / '+name:name),columns=all(layout).filter(n=>tag(n)==='cell').map(n=>({name:field(n,'name'),width:field(n,'width')}));
  m.viewLayouts.push({id,name,table,columns,fetchXml,layoutXml,source:path});
  if(!m.components.some(c=>c.id===id))m.components.push({id,type:'view',name:table?table+' / '+name:name,coverage:'inspected',source:path,properties:{table}});
  if(fetchXml)addSource(m,id,source(path+'#fetchxml',fetchXml,'View FetchXML'));if(layoutXml)addSource(m,id,source(path+'#layoutxml',layoutXml,'View layout XML'));
 }
}
const canvasKey=p=>pathOf(p).match(/(?:^|\/)canvasapps\/(.+?)(?:\.msapp(?:\/|$)|\.(?:pa|fx)\.yaml$|\/(?:Src|Controls)\/)/i)?.[1]||'';
function canvasRecord(m,key){
 const base=key.split('/').pop(),c=m.components.find(c=>c.type==='app'&&norm(c.properties?.kind).includes('canvas')&&[c.name,c.properties?.name,c.properties?.logicalName].some(n=>norm(n)===norm(base)))||m.components.find(c=>c.type==='app'&&norm(c.properties?.kind).includes('canvas')&&norm(base).startsWith(norm(c.name)+'_'));
 const id=c?.id||idOf('app',base);let app=(m.canvasApps||[]).find(a=>a.id===id);
 if(!app){app={id,name:c?.name||base,path:key,screens:[],formulas:[],sources:[],issues:[]};m.canvasApps.push(app);if(!c)m.components.push({id,type:'app',name:base,properties:{kind:'Canvas app'},coverage:'inspected'});}
 return app;
}
function literal(v){const s=String(v??'').trim().replace(/^=/,'').trim();if(/^"(?:[^"\n]|"")*"$/.test(s))return s.slice(1,-1).replace(/""/g,'"');return s;}
function canvasControl(app,screen,name,kind,properties,parent=''){
 const p=properties&&typeof properties==='object'?properties:{};const c={name,kind:kind||'Control',parent,properties:Object.fromEntries(Object.entries(p).map(([k,v])=>[k,String(v??'')])),x:null,y:null,width:null,height:null,text:''};
 for(const k of ['X','Y','Width','Height']){const v=literal(p[k]);if(/^\d+(?:\.\d+)?$/.test(v))c[k.toLowerCase()]=Math.min(Number(v),100000);}
 c.text=p.Text===undefined?name:literal(p.Text);
 for(const [property,expression] of Object.entries(p))if(typeof expression==='string')app.formulas.push({screen:screen.name,control:name,property,expression});
 screen.controls.push(c);return c;
}
function canvasYaml(app,path,text){
 if(!root.jsyaml){app.issues.push(path+': YAML parser unavailable. Source remains exportable.');return;}
 let data;try{data=root.jsyaml.load(text,{schema:root.jsyaml.JSON_SCHEMA});}catch{app.issues.push(path+': YAML could not be parsed. Source remains exportable.');return;}
 const seen=new WeakSet();let budget=20000;
 function screenFor(name){let s=app.screens.find(s=>s.name===name);if(!s){s={name,width:1366,height:768,controls:[],source:path};app.screens.push(s);}return s;}
 function controls(nodes,screen,parent=''){
  if(!nodes||typeof nodes!=='object'||seen.has(nodes)||--budget<0)return;seen.add(nodes);
  if(Array.isArray(nodes)){for(const v of nodes)controls(v,screen,parent);return;}
  for(const [rawName,body] of Object.entries(nodes)){
   if(!body||typeof body!=='object'||seen.has(body)||--budget<0)continue;seen.add(body);
   const [name,legacyKind]=rawName.split(/\s+As\s+/i),kind=String(body.Control||legacyKind||'Control');
   const properties=body.Properties||Object.fromEntries(Object.entries(body).filter(([k,v])=>!['Children','Variant','Control'].includes(k)&&['number','string','boolean'].includes(typeof v)));
   canvasControl(app,screen,name,kind,properties,parent);
   if(body.Children)controls(body.Children,screen,name);
   const inline=Object.fromEntries(Object.entries(body).filter(([k,v])=>v&&typeof v==='object'&&!['Properties','Children'].includes(k)));if(Object.keys(inline).length)controls(inline,screen,name);
  }
 }
 if(data?.App){for(const [property,expression] of Object.entries(data.App.Properties||{}))app.formulas.push({screen:'App',control:'App',property,expression:String(expression)});}
 const screens=data?.Screens;
 if(screens&&typeof screens==='object')for(const [name,body] of Object.entries(screens)){
  const s=screenFor(name);for(const [property,expression] of Object.entries(body?.Properties||{}))app.formulas.push({screen:name,control:name,property,expression:String(expression)});controls(body?.Children,s);
 }else if(data&&typeof data==='object'){
  const keys=Object.entries(data).filter(([key,v])=>v&&typeof v==='object'&&(/\sAs\s+screen\b/i.test(key)||key!=='App'&&v.Children));
  for(const [key,body] of keys){const s=screenFor(key.split(/\s+As\s+/i)[0]);controls(body.Children||Object.fromEntries(Object.entries(body).filter(([,v])=>v&&typeof v==='object')),s);}
 }
 if(budget<0)app.issues.push(path+': Canvas hierarchy inspection limit reached. Full source remains available.');
}
function canvasJson(app,path,text){
 let data;try{data=JSON.parse(text);}catch{app.issues.push(path+': invalid canvas JSON.');return;}
 const top=data.TopParent||data;if(!top||!(top.Name||top.ControlName))return;
 const screen={name:top.Name||top.ControlName,width:1366,height:768,controls:[],source:path};
 if(app.screens.some(s=>s.name===screen.name))return;app.screens.push(screen);
 let budget=10000;const seen=new WeakSet();
 const visit=(n,parent='')=>{if(!n||typeof n!=='object'||seen.has(n)||--budget<0)return;seen.add(n);const props={...(n.Properties||{})};
  for(const rule of n.Rules||[])if(rule.Property)props[rule.Property]=rule.InvariantScript??rule.Expression??'';
  const name=n.Name||n.ControlName||'Control',kind=n.Template?.Name||n.ControlType||n.Type||'Control';canvasControl(app,screen,name,kind,props,parent);
  for(const child of n.Children||[])visit(child,name);
 };visit(top);if(budget<0)app.issues.push(path+': control inspection limit reached. Full source remains available.');
}
function canvas(m,files){
 m.canvasApps=[];
 // Metadata provides the app identity and the .msapp filename rather than relying on GUID filenames.
 for(const [p,text] of files)if(/\.xml$/i.test(p)&&!/(?:^|\/)webresources\//i.test(p)){const d=xml(text);for(const n of all(d).filter(n=>tag(n)==='canvasapp')){
  const name=field(n,'Name','name'),msapp=field(n,'MsAppFileName','msappfilename','FileName');if(!name||!msapp)continue;
  const key=pathOf(msapp).replace(/^.*?canvasapps\//i,'').replace(/\.msapp$/i,'');const a=canvasRecord(m,name);a.packageKey=key;a.path=msapp;
  m.components=m.components.filter(c=>c.id===a.id||c.type!=='app'||!/canvas/i.test(c.properties?.kind||'')||norm(c.name)!==norm(key.split('/').pop()));
 }}
 for(const [path,text] of files){const key=canvasKey(path);if(!key||!(/\.(pa|fx)\.ya?ml$/i.test(path)||/\/(Controls|Src)\/.+\.json$/i.test(path)))continue;
  const a=m.canvasApps.find(a=>norm(a.packageKey)===norm(key))||canvasRecord(m,key);a.sources.push(source(path,text,'Canvas app source'));addSource(m,a.id,a.sources.at(-1));
  if(/\.ya?ml$/i.test(path))canvasYaml(a,path,text);else canvasJson(a,path,text);
 }
 for(const c of m.components.filter(c=>c.type==='app'&&/canvas/i.test(c.properties?.kind||'')))if(!m.canvasApps.some(a=>a.id===c.id))m.canvasApps.push({id:c.id,name:c.name,path:c.properties?.packagePath||'',screens:[],formulas:[],sources:[],issues:['No inspectable screen source was included in this export.']});
 for(const a of m.canvasApps){if(a.sources.length&&!a.screens.length&&!a.issues.length)a.issues.push('Source files are included, but their screen schema is not supported by this inspector. Full source remains exportable.');const c=m.components.find(c=>c.id===a.id);if(c)c.properties={...c.properties,screens:String(a.screens.length),formulas:String(a.formulas.length),sourceFingerprint:fingerprint(a.sources.map(s=>s.text))};}
}
function enrich(m,files){
 m={...m,components:m.components.map(c=>({...c,properties:{...c.properties}})),warnings:[...(m.warnings||[])],componentSources:Object.create(null)};
 const docs=[...files].filter(([p])=>/\.xml$/i.test(p)&&!/(?:^|\/)webresources\//i.test(p)).map(([p,text])=>[p,xml(text)]).filter(([,d])=>d);
 m.components=m.components.filter(c=>c.type!=='webresource'||(m.webResources||[]).some(r=>r.id===c.id)||!(m.webResources||[]).some(r=>norm(root.SolutionWebResources.resourcePath(r.path))===norm(c.name)));
 resourceFiles(m,files);formEvents(m,docs);businessRules(m,files,docs);views(m,docs);canvas(m,files);
 const sourceTypes={ribbondiffxml:'ribbon',ribboncustomization:'ribbon',commanddefinition:'command',ribboncommand:'command',customcontrol:'pcf',webtemplate:'webtemplate',adx_webtemplate:'webtemplate',customapi:'customapi'};
 for(const [p,d] of docs)for(const n of all(d)){const type=sourceTypes[tag(n)],name=field(n,'Name','UniqueName','Id');if(!type||!name)continue;const c=m.components.find(c=>c.id===idOf(type,name));if(c)addSource(m,c.id,source(p+'#'+name,serialize(n),'Component definition'));}
 for(const c of m.components){if(['flow','action','bpf'].includes(c.type))for(const [p,text] of files)if(/workflows\/.+\.(json|xaml)$/i.test(p)){
  let name='';try{const j=JSON.parse(text);name=j.properties?.displayName||j.name;}catch{}if(norm(name)===norm(c.name)||c.properties?.workflowId&&norm(p).includes(guid(c.properties.workflowId)))addSource(m,c.id,source(p,text,'Automation definition'));
 }}
 for(const [id,sources] of Object.entries(m.componentSources)){const c=m.components.find(c=>c.id===id);if(c)c.properties.sourceFingerprint=fingerprint(sources.map(s=>s.text));}
 return refresh(m);
}
async function unpackCanvas(zip,files){
 let total=0;const maxTotal=40*1024*1024,maxFile=4*1024*1024;const warnings=[];
 for(const e of Object.values(zip.files).filter(e=>!e.dir&&/canvasapps\/.+\.msapp$/i.test(e.name))){
  let app;try{app=await root.JSZip.loadAsync(await e.async('uint8array'));}catch{warnings.push(e.name+': canvas package could not be opened.');continue;}
  const entries=Object.values(app.files).filter(f=>!f.dir);if(entries.length>4000){warnings.push(e.name+': nested canvas package exceeds the 4,000-file safety limit.');continue;}
  const size=entries.reduce((n,x)=>n+(x._data?.uncompressedSize||0),0);if(size>maxTotal||size+total>maxTotal){warnings.push(e.name+': nested canvas package exceeds the 40 MB inspection limit.');continue;}
  total+=size;
  for(const f of entries){if(!/^(?:Src\/.+\.(?:yaml|yml|json)|Controls\/.+\.json)$/i.test(pathOf(f.name)))continue;if((f._data?.uncompressedSize||0)>maxFile){warnings.push(e.name+'/'+f.name+': source file exceeds the 4 MB limit.');continue;}files.set(e.name+'/'+pathOf(f.name),await f.async('string'));}
 }
 return warnings;
}
function component(m,id){const c=m.components.find(c=>c.id===id);if(!c)return null;return {component:c,children:m.objectDetails?.[id]?.children||[],sources:sourcesFor(m,id),form:(m.formLayouts||[]).find(f=>idOf('form',f.table+' / '+f.name)===id),canvas:(m.canvasApps||[]).find(a=>a.id===id),rule:(m.businessRules||[]).find(a=>a.id===id),view:(m.viewLayouts||[]).find(a=>a.id===id)};}
root.SolutionDetails={enrich,unpackCanvas,component,sourcesFor,scopeOf,literal,fingerprint};
})(globalThis);
