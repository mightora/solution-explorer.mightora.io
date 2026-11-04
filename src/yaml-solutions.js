/* Microsoft Dataverse Git integration / PAC CLI YAML source-control inventory.
 * YAML is parsed as inert data. Unknown schemas are declared, never guessed. */
(function(root){
'use strict';
const core=root.SolutionCore,previous=core.parseSolution;
const norm=s=>String(s??'').trim().toLowerCase(),normalPath=s=>String(s).replace(/\\/g,'/').replace(/^\.\//,'');
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
const scalar=x=>['string','number','boolean'].includes(typeof x)?String(x):'';
const secret=/password|secret|token|credential|authorization|connectionstring|apikey|api_key|privatekey|currentvalue|defaultvalue|accountkey|clientsecret|accesskey|sas|certificate|connectionid/i;
const folderFamily={entities:'table',entityrelationships:'relationship',workflows:'flow',modernflows:'flow',canvasapps:'app',appmodules:'app',savedqueries:'view',savedqueryvisualizations:'chart',dashboards:'dashboard',sitemaps:'sitemap',webresources:'webresource',pluginassemblies:'pluginassembly',plugintypes:'plugintype',sdkmessageprocessingsteps:'pluginstep',sdkmessageprocessingstepimages:'pluginimage',customapis:'customapi',connectionreferences:'connection',environmentvariabledefinitions:'environment',connectors:'connector',roles:'role',fieldsecurityprofiles:'fieldsecurity',optionsets:'choice',powerpages:'powerpages',portals:'powerpages',bots:'copilot',botcomponents:'topic',aiprojects:'ai',aiprompts:'prompt',slas:'sla',routingrules:'routing',queues:'queue',templates:'emailtemplate',mobileofflineprofiles:'offlineprofile',duplicaterules:'duplicate',entitymaps:'datamap',ribbon:'ribbon'};
const nestedFamily={attributes:'column',formxml:'form',savedqueries:'view',savedqueryvisualizations:'chart',entitykeys:'key',keys:'key',relationships:'relationship'};
const safeName=s=>scalar(s).replace(/[\r\n\t]/g,' ').slice(0,260);
const id=(t,n)=>t+':'+norm(n).replace(/\s+/g,' ').slice(0,300);
function read(text,path,warnings){
 if(text.length>6*1024*1024){warnings.push(path+': YAML exceeds the 6 MB inspection limit.');return null;}
 try{return root.jsyaml.load(text,{json:true});}catch(e){warnings.push(path+': YAML could not be parsed ('+String(e.reason||e.message).slice(0,120)+').');return null;}
}
function findValue(node,names,maxDepth=4){
 const wanted=new Set(names.map(norm)),seen=new WeakSet();
 function walk(v,depth){if(!v||typeof v!=='object'||seen.has(v)||depth>maxDepth)return '';seen.add(v);
  if(Array.isArray(v)){for(const entry of v.slice(0,100)){const out=walk(entry,depth+1);if(out)return out;}return '';}
  for(const [key,value] of Object.entries(v))if(wanted.has(norm(key))&&scalar(value))return scalar(value);
  for(const value of Object.values(v).slice(0,100)){const out=walk(value,depth+1);if(out)return out;}return '';
 }return walk(node,0);
}
function properties(node,warnings,path){const out={};let limited=false;const visit=(value,prefix='',depth=0)=>{
  if(depth>2||Object.keys(out).length>=75){limited=true;return;}
  for(const [key,v] of Object.entries(obj(value))){if(secret.test(key)||key.startsWith('@')||/definition|body|inputs|outputs|formula|script|clientdata|xaml/i.test(key))continue;
   if(scalar(v)){const text=scalar(v).replace(/[\r\n\t]/g,' ');out[prefix+key]=text.slice(0,8192);if(text.length>8192)limited=true;}
   else if(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length<=6)visit(v,prefix+key+'.',depth+1);
  }
 };visit(node);if(limited&&!warnings.includes(path+': selected metadata exceeded the inspection depth, field or 8,192-character scalar limit. Review the original YAML.'))warnings.push(path+': selected metadata exceeded the inspection depth, field or 8,192-character scalar limit. Review the original YAML.');return out;
}
function componentPath(path){
 const pieces=normalPath(path).split('/');let pos=pieces.findIndex(p=>p.toLowerCase() in folderFamily);if(pos<0)return null;
 const folder=pieces[pos].toLowerCase(),base=pieces[pos+1];if(!base)return null;
 let type=folderFamily[folder],name=base.replace(/\.(?:xml|json|ya?ml|msapp)$/i,'');
 if(folder==='entities'&&pieces.length>pos+3&&nestedFamily[pieces[pos+2]?.toLowerCase()]){
  type=nestedFamily[pieces[pos+2].toLowerCase()];name=type==='column'?base+'.'+pieces[pos+3].replace(/\.ya?ml$/i,''):base+' / '+pieces[pos+3].replace(/\.ya?ml$/i,'');
 }
 if(['solution','customizations','definition','data','metadata'].includes(norm(name)))return null;
 return {type,name,table:folder==='entities'?base:''};
}
function unpackManifestEntries(node){
 const rows=[];const visited=new WeakSet();function walk(v,depth=0){if(!v||typeof v!=='object'||visited.has(v)||depth>7||rows.length>=3000)return;visited.add(v);
  if(Array.isArray(v)){v.forEach(x=>walk(x,depth+1));return;}
  const record=obj(v),path=scalar(record.Path||record.path),code=scalar(record['@type']||record.Type||record.type),name=scalar(record['@schemaName']||record.SchemaName||record.schemaName||record.Name||record.name);
  if(path||code&&name)rows.push({path,name,code});else Object.values(record).forEach(x=>walk(x,depth+1));
 }walk(node);return rows;
}
function parse(files,checksums){
 const model=previous(files,checksums),warnings=model.warnings||[],map=new Map(model.components.map(c=>[c.id,c]));
 const paths=[...files].map(([p,body])=>[normalPath(p),body]);
 const manifests=paths.filter(([p])=>/(?:^|\/)solutions\/[^/]+\/solution\.ya?ml$/i.test(p));
 if(!manifests.length)return model;
 const [manifestPath,manifestText]=manifests[0],prefix=manifestPath.slice(0,manifestPath.lastIndexOf('/solution.'));
 const repoPrefix=manifestPath.slice(0,manifestPath.toLowerCase().lastIndexOf('solutions/'));
 const present=[...new Set([...paths.map(([p])=>p.toLowerCase()),...Array.from(checksums?.keys?.()||[],p=>normalPath(p).toLowerCase())])];
 if(manifests.length>1)warnings.push(`${manifests.length} solution manifests found; inspecting ${prefix.split('/').pop()} only. Other solution components may be shared or outside this selection.`);
 const data=read(manifestText,manifestPath,warnings);if(!data)return model;
 const name=findValue(data,['UniqueName'])||prefix.split('/').pop(),version=findValue(data,['Version']);
 const publisher=findValue(data,['PublisherUniqueName','PublisherName']);
 model.info={...model.info,name,version,managed:null,publisher,format:'YAML source control'};
 model.info.fileCount=paths.length;
 for(let i=warnings.length-1;i>=0;i--)if(/^(solution\.xml not found|customizations\.xml not found|YAML source-control files detected)/.test(warnings[i]))warnings.splice(i,1);
 const add=(type,name,props={},path='',coverage='inspected')=>{
  if(!type||!name)return;if(String(name).length>260)warnings.push(path+': component identity was shortened to the 260-character safety limit.');
  const key=id(type,name),prior=map.get(key),safe={...prior?.properties,...properties(props,warnings,path)};
  map.set(key,{id:key,type,name:safeName(name),description:prior?.description||'',coverage:prior?.coverage==='inspected'?'inspected':coverage,source:path||prior?.source||'',properties:safe});
 };
 const manifestSource=paths.find(([p])=>p===prefix+'/solutioncomponents.yml');
 const listed=manifestSource?unpackManifestEntries(read(manifestSource[1],manifestSource[0],warnings)).map(x=>x.path):[];
 if(!manifestSource)warnings.push(prefix+'/solutioncomponents.yml is missing; component inclusion cannot be established.');
 const rootPath=prefix+'/rootcomponents.yml',roots=paths.find(([p])=>p===rootPath);
 if(roots){for(const item of unpackManifestEntries(read(roots[1],rootPath,warnings))){
   const type=core.ROOT_COMPONENT_TYPES?.[item.code]||componentPath(item.path||'')?.type||'unknown';
   const componentName=item.name||componentPath(item.path||'')?.name;
   if(componentName)add(type,componentName,{componentType:item.code},rootPath,type==='unknown'?'unsupported':'discovered');
 }}else warnings.push(rootPath+' is missing; root membership is unknown.');
 const required=paths.find(([p])=>p===prefix+'/missingdependencies.yml');
 if(required){const dependencies=read(required[1],required[0],warnings),visited=new WeakSet();
  const walk=(v,depth=0)=>{if(!v||typeof v!=='object'||visited.has(v)||depth>8)return;visited.add(v);
   if(Array.isArray(v)){v.forEach(x=>walk(x,depth+1));return;}
   const req=v.Required||v.required,dep=v.Dependent||v.dependent;
   if(req){const name=findValue(req,['@schemaName','SchemaName','Name']),code=findValue(req,['@type','Type']);if(name){
    const type=core.ROOT_COMPONENT_TYPES?.[code]||'unknown';add(type,name,{componentType:code},required[0],'referenced');
    const dn=findValue(dep,['@schemaName','SchemaName','Name']),dc=findValue(dep,['@type','Type']);
    model.dependencies.push({required:id(type,name),dependent:dn?id(core.ROOT_COMPONENT_TYPES?.[dc]||'unknown',dn):'',kind:'manifest',name});
   }}else Object.values(v).forEach(x=>walk(x,depth+1));
  };walk(dependencies);
 }
 for(const path of listed){const expected=(repoPrefix+normalPath(path).replace(/\/$/,'')).toLowerCase(),cp=componentPath(path);
  if(cp)add(cp.type,cp.name,{packagePath:path},manifestSource[0],'discovered');
  if(!present.some(p=>p===expected||p.startsWith(expected+'/')))warnings.push('Manifest component source is missing: '+path);
 }
 let inspected=0;
 for(const [path,text] of paths){if(!/\.ya?ml$/i.test(path)||path.startsWith(prefix+'/')||/\/publisher\.ya?ml$/i.test(path))continue;
  if(manifestSource&&listed.length&&!listed.some(ref=>{const expected=(repoPrefix+normalPath(ref).replace(/\/$/,'')).toLowerCase();return path.toLowerCase()===expected||path.toLowerCase().startsWith(expected+'/');}))continue;
  const descriptor=componentPath(path);if(!descriptor)continue;
  const parsed=read(text,path,warnings);if(!parsed)continue;
  const {type,table}=descriptor;
  // Prefer declared logical names from source, falling back to file paths only when absent.
  const logical=findValue(parsed,['LogicalName','SchemaName','UniqueName','Name'],3);
  const name=type==='column'?table+'.'+(logical||descriptor.name.split('.').pop()):
   ['form','view','chart','key'].includes(type)?table+' / '+(logical||descriptor.name.split(' / ').pop()):logical||descriptor.name;
  const roots=Object.entries(obj(parsed));
  const payload=roots.length===1&&roots[0][1]&&typeof roots[0][1]==='object'&&!Array.isArray(roots[0][1])?obj(roots[0][1]):obj(parsed);
  const metadata=type==='column'?{...payload,table}:payload;
  add(type,name,metadata,path,'inspected');inspected++;
  if(type==='table'&&table!==name)add('table',table,{},path,'discovered');
  if(type==='flow'){
   const c=map.get(id(type,name));c.properties.category=path.includes('/modernflows/')?'Cloud flow':'Workflow';
  }
  if(type==='app')map.get(id(type,name)).properties.kind=path.includes('/canvasapps/')?'Canvas app':'Model-driven app';
 }
 if(!inspected)warnings.push('No component YAML definitions could be inspected; only manifest information may be available.');
 model.components=[...map.values()].sort((a,b)=>core.TYPES.indexOf(a.type)-core.TYPES.indexOf(b.type)||a.name.localeCompare(b.name));
 if(model.components.length)for(let i=warnings.length-1;i>=0;i--)if(/^No supported Dataverse components were discovered/.test(warnings[i]))warnings.splice(i,1);
 model.counts=Object.fromEntries(core.TYPES.map(t=>[t,model.components.filter(c=>c.type===t).length]));
 model.coverage=Object.fromEntries(['inspected','discovered','referenced','unsupported'].map(t=>[t,model.components.filter(c=>c.coverage===t).length]));
 return model;
}
core.parseSolution=parse;
root.SolutionYaml={componentPath,findValue,parseDocument:read};
})(globalThis);
