/* Mightora Solution Explorer — dependency-free Dataverse metadata parser.
 * Files are handled locally. Values, secrets and connection identifiers are never recorded. */
(function (root) {
  'use strict';
  const TYPES = ['table','column','relationship','flow','webresource','environment','connection','app','form','view'];
  const LABELS = {table:'Tables',column:'Columns',relationship:'Relationships',flow:'Flows & workflows',webresource:'Web resources',environment:'Environment variables',connection:'Connection references',app:'Apps',form:'Forms',view:'Views'};
  function children(node,name) { return Array.from(node?.childNodes || []).filter(n => n.nodeType === 1 && (!name || n.localName?.toLowerCase() === name.toLowerCase() || n.nodeName?.toLowerCase() === name.toLowerCase())); }
  function descendants(node,name) { return Array.from(node?.getElementsByTagName('*') || []).filter(n => n.localName?.toLowerCase() === name.toLowerCase() || n.nodeName?.toLowerCase() === name.toLowerCase()); }
  function attr(node,...names){ if(!node) return ''; for(const key of names){ for(const a of Array.from(node.attributes||[])) if(a.name.toLowerCase()===key.toLowerCase()) return (a.value||'').trim(); } return ''; }
  function direct(node,...names){for(const n of names){const el=children(node,n)[0];if(el) return (el.textContent||'').trim();}return '';}
  function deep(node,...names){ for(const n of names){const el=descendants(node,n)[0]; if(el) return (el.textContent||'').trim();}return '';}
  function field(node,...names){return attr(node,...names)||direct(node,...names);}
  function short(s,max=240){return String(s||'').replace(/\s+/g,' ').trim().slice(0,max);}
  function normalize(s){return short(s,300).toLowerCase();}
  function parseXml(s,file,warnings){ try { const xml = new DOMParser().parseFromString(s,'application/xml');if(descendants(xml,'parsererror').length || xml.documentElement?.nodeName === 'parsererror'){warnings.push(`${file}: invalid XML ignored.`);return null;}return xml;}catch{warnings.push(`${file}: XML could not be parsed.`);return null;} }
  function add(map,type,name,props={},description=''){
    if(!name || !TYPES.includes(type)) return;
    const id=type+':'+normalize(name);const clean={};
    for(const [k,v] of Object.entries(props)){ if(v !== null && v !== undefined && v !== '') clean[k]=short(v,500); }
    const prior=map.get(id);
    map.set(id,{id,type,name:short(name,260),description:short(description)||prior?.description||'',properties:{...prior?.properties,...clean}});
  }
  function readNodeName(n){const a=attr(n,'Name','LogicalName','SchemaName','name');const nested=direct(n,'Name','LogicalName','SchemaName');return a || nested;}
  function readTextFile(files,pattern){for(const [path,content] of files){if(pattern.test(path.replace(/\\/g,'/')))return [path,content];}return null;}
  function nodeSignature(n){return short(n?.textContent||'',500).replace(/\s+/g,' ');}
  function processEntities(doc,map){
    const entityNodes=descendants(doc,'Entity').filter(n => n.parentNode && ['entities','entity'].includes(n.parentNode.nodeName.toLowerCase()));
    for(const e of entityNodes){
      const eName=attr(e,'Name','LogicalName')||readNodeName(children(e,'Name')[0])||direct(e,'Name')||deep(e,'LogicalName')||attr(children(e,'Name')[0],'OriginalName')||'unknown_table';
      const label=deep(e,'DisplayName') || eName;
      const flags={displayName:label, ownership:deep(e,'OwnershipType'), primaryId:deep(e,'PrimaryIdAttribute'), primaryName:deep(e,'PrimaryNameAttribute'),entitySetName:deep(e,'EntitySetName')};
      add(map,'table',eName,flags,label);
      const ats=descendants(e,'attribute').filter(a => children(a,'PhysicalName').length || attr(a,'PhysicalName','LogicalName','Name') || children(a,'Name').length);
      for(const a of ats){
        const aName=field(a,'PhysicalName','LogicalName','SchemaName','Name')||direct(a,'PhysicalName','LogicalName','SchemaName');
        if(!aName)continue;
        const type=field(a,'Type','AttributeType','AttributeTypeName')||deep(a,'Type','AttributeType');
        add(map,'column',eName+'.'+aName,{table:eName,dataType:type,required:field(a,'RequiredLevel')||deep(a,'RequiredLevel'),maxLength:field(a,'MaxLength')||deep(a,'MaxLength'),displayName:deep(a,'DisplayName')||aName,isPrimaryId:field(a,'IsPrimaryId')||deep(a,'IsPrimaryId'),targets:descendants(a,'Target').map(x=>field(x,'Name','LogicalName')||x.textContent.trim()).join(', ')},aName);
      }
      for(const form of descendants(e,'systemform')){
        const nm=field(form,'name','Name')||deep(form,'name')||field(form,'id','FormId');if(nm)add(map,'form',eName+' / '+nm,{table:eName,kind:'Form'});
      }
      for(const view of descendants(e,'savedquery')){
        const nm=field(view,'name','Name')||deep(view,'name')||field(view,'id','SavedQueryId');if(nm)add(map,'view',eName+' / '+nm,{table:eName,kind:'View'});
      }
    }
    for(const e of descendants(doc,'EntityRelationship').concat(descendants(doc,'Relationship'),descendants(doc,'ManyToManyRelationship'),descendants(doc,'OneToManyRelationship'),descendants(doc,'ManyToOneRelationship'))){
      let name=field(e,'Name','SchemaName')||deep(e,'SchemaName');if(!name)continue;
      const source=field(e,'ReferencingEntityName','ReferencingEntity','Entity1LogicalName','Entity1Name')||deep(e,'ReferencingEntityName','ReferencingEntity','Entity1LogicalName','Entity1Name');
      const target=field(e,'ReferencedEntityName','ReferencedEntity','Entity2LogicalName','Entity2Name')||deep(e,'ReferencedEntityName','ReferencedEntity','Entity2LogicalName','Entity2Name');
      const kind=field(e,'EntityRelationshipType','RelationshipType')||deep(e,'EntityRelationshipType','RelationshipType')||(e.localName||e.nodeName).replace(/Relationship$/,'')||'Relationship';
      add(map,'relationship',name,{source,target,kind,sourceAttribute:field(e,'ReferencingAttributeName','ReferencingAttribute','Entity1IntersectAttribute')||deep(e,'ReferencingAttributeName','ReferencingAttribute','Entity1IntersectAttribute'),targetAttribute:field(e,'ReferencedAttributeName','ReferencedAttribute','Entity2IntersectAttribute')||deep(e,'ReferencedAttributeName','ReferencedAttribute','Entity2IntersectAttribute'),intersectEntity:field(e,'IntersectEntityName')||deep(e,'IntersectEntityName')},`${source||'Table'} → ${target||'Table'}`);
    }
  }
  function workflowRecords(doc,map){
    for(const w of descendants(doc,'Workflow')){
      const id=field(w,'WorkflowId','WorkflowID','id');const name=field(w,'Name')||id;
      if(!name)continue;
      const cat=field(w,'Category'), on=field(w,'StateCode');
      add(map,'flow',name,{category:cat==='5'?'Cloud flow':cat==='0'?'Classic workflow':'Workflow',state:on==='1'?'Activated':on==='0'?'Draft':'Unknown',workflowId:id},'Workflow metadata');
    }
  }
  function otherRecords(doc,map){
    for(const w of descendants(doc,'WebResource').concat(descendants(doc,'WebResourceBase'))){const n=field(w,'Name','name')||deep(w,'Name');if(n)add(map,'webresource',n,{kind:field(w,'WebResourceType')||deep(w,'WebResourceType'),fileName:field(w,'FileName')||deep(w,'FileName')});}
    for(const w of descendants(doc,'environmentvariabledefinition')){
      const n=field(w,'schemaname','SchemaName')||deep(w,'schemaname');
      if(n)add(map,'environment',n,{type:field(w,'type')||deep(w,'type'),description:'Values intentionally withheld'});
    }
    for(const w of descendants(doc,'connectionreference')){
      const n=field(w,'connectionreferencelogicalname','ConnectionReferenceLogicalName','LogicalName')||deep(w,'connectionreferencelogicalname','ConnectionReferenceLogicalName');
      if(n)add(map,'connection',n,{connector:field(w,'connectorid','ConnectorId')||deep(w,'connectorid','ConnectorId'),displayName:field(w,'displayname','DisplayName')||deep(w,'displayname','DisplayName')});
    }
    for(const w of descendants(doc,'AppModule')){const n=field(w,'UniqueName','Name')||deep(w,'UniqueName','Name');if(n)add(map,'app',n,{kind:'Model-driven app'});}
    for(const w of descendants(doc,'CanvasApp')){const n=field(w,'Name','DisplayName')||deep(w,'Name');if(n)add(map,'app',n,{kind:'Canvas app'});}
  }
  function stableJson(value){
    if(Array.isArray(value))return '['+value.map(stableJson).join(',')+']';
    if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stableJson(value[k])).join(',')+'}';
    return JSON.stringify(value);
  }
  function fingerprint(value){
    // Fingerprint only, not source content. Allows comparison of flow definition changes
    // even when action count remains identical; intentionally not cryptographic.
    const text=stableJson(value);let h=2166136261;
    for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);
    return ('00000000'+(h>>>0).toString(16)).slice(-8);
  }
  function parseFlowJson(files,map,warnings){
    for(const [path,content] of files){if(!/\b(workflows|modernflows)\//i.test(path) || !/\.json$/i.test(path) || !content)continue;
      let json;try{json=JSON.parse(content);}catch{warnings.push(`${path}: invalid workflow JSON.`);continue;}
      const p=json.properties||json;
      const id=short(p.workflowId||p.workflowid||p.name||'');
      const name=short(p.displayName||json.name||p.displayname||id||path.split('/').pop().replace(/\.json$/i,''));
      const def=p.definition||json.definition||{};
      const triggers=Object.keys(def.triggers||{});const actions=Object.keys(def.actions||{});
      const refs=Object.entries(p.connectionReferences||p.connectionreferences||{}).map(([k,v])=>short(v?.connection?.connectionReferenceLogicalName||v?.connectionReferenceLogicalName||v?.connection?.name||k,180));
      const preExisting=map.get('flow:'+normalize(name));
      add(map,'flow',name,{...preExisting?.properties,category:'Cloud flow',triggers:triggers.join(', '),actionCount:String(actions.length),definitionFingerprint:fingerprint(def),connectionReferences:refs.join(', ')},'Power Automate flow definition');
      for(const r of refs) if(r && !map.has('connection:'+normalize(r)))add(map,'connection',r,{connector:'Referenced by '+name,discoveredFrom:'Flow JSON'});
    }
  }
  function parseSolution(files,entryChecksums=new Map()){
    const map=new Map();const warnings=[];const paths=[...files.keys()];
    const manifest=readTextFile(files,/(^|\/)(solution\.xml|Other\/Solution\.xml)$/i);
    const customs=readTextFile(files,/(^|\/)(customizations\.xml|Other\/Customizations\.xml)$/i);
    if(!manifest)warnings.push('solution.xml not found. This may be a source-control ZIP rather than an exported solution; manifest metadata is unavailable.');
    if(!customs)warnings.push('customizations.xml not found. Inline table, column and workflow metadata may be incomplete.');
    if(paths.some(p=>/\.ya?ml$/i.test(p)))warnings.push('YAML source-control files detected. This release supports exported XML solutions; YAML component metadata is not fully interpreted.');
    const m=manifest ? parseXml(manifest[1],manifest[0],warnings):null;
    const meta=m ? (descendants(m,'SolutionManifest')[0]||m):null;
    const info={name:meta?deep(meta,'UniqueName'):'',version:meta?deep(meta,'Version'):'',managed:meta?['1','true'].includes(deep(meta,'Managed').toLowerCase()):null,publisher:meta?deep(meta,'PublisherUniqueName')||deep(descendants(meta,'Publisher')[0]||meta,'UniqueName'):'',fileCount:paths.length};
    const xmlPaths=new Set();
    if(customs){const d=parseXml(customs[1],customs[0],warnings);if(d){processEntities(d,map);workflowRecords(d,map);otherRecords(d,map);}xmlPaths.add(customs[0]);}
    for(const [path,content] of files){
      if(!/\.xml$/i.test(path) || xmlPaths.has(path)||manifest?.[0]===path||!content)continue;
      if(!/(?:entities|entityrelationships|environmentvariabledefinitions|connectionreferences|workflows|webresources|appmodules|canvasapps|other)\//i.test(path))continue;
      const d=parseXml(content,path,warnings);if(!d)continue;
      processEntities(d,map);workflowRecords(d,map);otherRecords(d,map);
      const rootNode=d.documentElement;const folder=path.toLowerCase();
      if(/environmentvariabledefinitions\//.test(folder)){
        const n=field(rootNode,'schemaname','SchemaName')||deep(rootNode,'schemaname');if(n)add(map,'environment',n,{type:deep(rootNode,'type'),description:'Values intentionally withheld'});
      }
      if(/connectionreferences\//.test(folder)){
        const n=field(rootNode,'connectionreferencelogicalname','LogicalName')||deep(rootNode,'connectionreferencelogicalname');if(n)add(map,'connection',n,{connector:deep(rootNode,'connectorid')});
      }
    }
    for(const path of paths){
      const p=path.replace(/\\/g,'/');
      if(/(?:^|\/)webresources\//i.test(p) && !/\.xml$/i.test(p)){
        const name=p.replace(/^.*?webresources\//i,'');if(name)add(map,'webresource',name,{kind:name.split('.').pop()?.toUpperCase()||'Resource',packageChecksum:entryChecksums.get(path)||''});
      }
      if(/(?:^|\/)canvasapps\//i.test(p) && /\.msapp$/i.test(p))add(map,'app',p.split('/').pop().replace(/\.msapp$/i,''),{kind:'Canvas app'});
    }
    for(const [path,checksum] of entryChecksums){
      const p=path.replace(/\\/g,'/');if(!/(?:^|\/)webresources\//i.test(p)||/\.xml$/i.test(p))continue;
      const n=p.replace(/^.*?webresources\//i,'');if(n)add(map,'webresource',n,{kind:n.split('.').pop()?.toUpperCase()||'Resource',packageChecksum:checksum});
    }
    parseFlowJson(files,map,warnings);
    if(!paths.length)warnings.push('Archive is empty.');
    if(!map.size)warnings.push('No supported Dataverse components were discovered. Check that this is a Dataverse solution export.');
    const components=[...map.values()].sort((a,b)=>TYPES.indexOf(a.type)-TYPES.indexOf(b.type)||a.name.localeCompare(b.name));
    const counts=Object.fromEntries(TYPES.map(k=>[k,components.filter(x=>x.type===k).length]));
    return {info,components,counts,warnings};
  }
  function propertyChanges(before,after){
    const a=before||{},b=after||{};
    return [...new Set([...Object.keys(a),...Object.keys(b)])].sort().filter(k=>a[k]!==b[k]).map(key=>({key,before:Object.hasOwn(a,key)?a[key]:null,after:Object.hasOwn(b,key)?b[key]:null}));
  }
  function stableProperties(obj){return JSON.stringify(Object.keys(obj||{}).sort().map(k=>[k,obj[k]]));}
  function compare(a,b){
    if(!a||!b)return [];
    const old=new Map(a.components.map(c=>[c.id,c]));const now=new Map(b.components.map(c=>[c.id,c]));const result=[];
    for(const [id,c] of now){const prev=old.get(id);result.push({...c,status:!prev?'added':stableProperties(c.properties)!==stableProperties(prev.properties)?'changed':'unchanged',before:prev?.properties||null});}
    for(const [id,c] of old)if(!now.has(id))result.push({...c,status:'removed',before:c.properties});
    return result.sort((x,y)=>({removed:0,added:1,changed:2,unchanged:3})[x.status]-({removed:0,added:1,changed:2,unchanged:3})[y.status]||x.name.localeCompare(y.name));
  }
  function assessManaged(m){
    if(!m)return {status:'none',title:'Load a solution to assess its type',steps:[]};
    if(m.info.managed===null)return {status:'unknown',title:'Solution type could not be confirmed',steps:['Find solution.xml in the original export and confirm its managed state.','Do not assume an incomplete archive is unmanaged.']};
    if(!m.info.managed)return {status:'unmanaged',title:'Unmanaged solution detected',steps:['Keep this unmanaged export and its source-controlled project as your editable development source.','Use Power Apps or PAC CLI to export another unmanaged copy when required.']};
    return {status:'managed',title:'Managed solution — direct conversion is not supported',steps:[
      'Request the original unmanaged solution ZIP or solution source-control project from its publisher or development team.',
      'If you own the development environment, export the original unmanaged solution using Power Apps or PAC CLI.',
      'Use the explorer inventory to document component names, dependencies and missing source artefacts.',
      'If the original source is unavailable, rebuild an editable solution with appropriate permission and ownership in a development environment; this is manual reconstruction, not conversion.',
      'Validate reconstructed components, licences, dependencies and ALM pipelines before deployment.'
    ]};
  }
  root.SolutionCore={parseSolution,compare,propertyChanges,assessManaged,TYPES,LABELS};
})(globalThis);
