/* Mightora Dataverse component catalog: safe inspection of exported metadata.
 * All additions are read-only. Never extract credential values or executable source. */
(function(root){
"use strict";
const core=root.SolutionCore,orig=core.parseSolution;
const families=[
 ["businessrule","Business rules",["BusinessRule"],["businessrules"],["Name","LogicalName"],["EntityName","StateCode"]],
 ["bpf","Business process flows",["BusinessProcessFlow"],["businessprocessflows"],["Name","UniqueName"],["PrimaryEntity","Category"]],
 ["action","Custom actions",["ProcessAction"],["actions"],["Name","UniqueName"],["PrimaryEntity"]],
 ["customapi","Custom APIs",["customapi","CustomAPI"],["customapis"],["uniquename","name"],["bindingtype","boundentitylogicalname","isfunction","allowedcustomprocessingsteptype"]],
 ["apiparameter","Custom API parameters",["customapirequestparameter","customapiresponseproperty"],["customapis"],["uniquename","name"],["type","logicalentityname"]],
 ["pluginassembly","Plug-in assemblies",["PluginAssembly"],["pluginassemblies"],["Name","AssemblyName"],["Version","PublicKeyToken","IsolationMode"]],
 ["plugintype","Plug-in types",["PluginType"],["plugintypes"],["TypeName","Name"],["AssemblyName","FriendlyName"]],
 ["pluginstep","Plug-in steps",["SdkMessageProcessingStep"],["sdkmessageprocessingsteps"],["Name"],["MessageName","Stage","Mode","PrimaryEntity","FilteringAttributes","Rank"]],
 ["pluginimage","Plug-in step images",["SdkMessageProcessingStepImage"],["sdkmessageprocessingstepimages"],["Name","EntityAlias"],["ImageType","Attributes","MessagePropertyName"]],
 ["pcf","PCF controls",["CustomControl","CustomControlDefaultConfig"],["customcontrols"],["Name","UniqueName"],["Version","ControlName"]],
 ["role","Security roles",["Role","SecurityRole"],["roles"],["Name","name"],["RoleTemplateId"]],
 ["privilege","Role privileges",["RolePrivilege"],["roles"],["Name","PrivilegeName"],["Level","Depth","PrivilegeDepth"]],
 ["fieldsecurity","Field security profiles",["FieldSecurityProfile"],["fieldsecurityprofiles"],["Name"],[]],
 ["fieldpermission","Field permissions",["FieldPermission"],["fieldpermissions"],["Name","AttributeLogicalName"],["EntityName","CanRead","CanUpdate","CanCreate"]],
 ["choice","Choices / option sets",["OptionSet","GlobalOptionSet"],["optionsets"],["Name","UniqueName"],["IsGlobal","OptionSetType"]],
 ["key","Alternate keys",["EntityKey","Key"],["entitykeys"],["Name","SchemaName"],["EntityLogicalName","KeyAttributes"]],
 ["chart","Charts",["SavedQueryVisualization","UserQueryVisualization"],["savedqueryvisualizations"],["Name"],["PrimaryEntityTypeCode"]],
 ["dashboard","Dashboards",["Dashboard"],["dashboards"],["Name"],["FormType"]],
 ["sitemap","Site maps",["SiteMap"],["sitemaps"],["Name","UniqueName"],["Version"]],
 ["ribbon","Ribbon customisations",["RibbonCustomization","RibbonDiffXml"],["ribbon"],["Name"],[]],
 ["command","Commands and ribbon rules",["RibbonCommand","CommandDefinition","RibbonRule"],["ribbon"],["Id","Name"],["Location"]],
 ["connector","Custom connectors",["Connector"],["connectors"],["Name","DisplayName"],["ConnectorId"]],
 ["endpoint","Service endpoints / webhooks",["ServiceEndpoint","Webhook"],["serviceendpoints"],["Name"],["Contract","NamespaceAddress","MessageFormat"]],
 ["sla","Service-level agreements",["SLA"],["slas"],["Name"],["ApplicableFrom","SLAType"]],
 ["slaitem","SLA items",["SLAItem"],["slas"],["Name"],["RelatedSLA","ApplicableFrom"]],
 ["routing","Routing rules",["RoutingRule","RoutingRuleItem"],["routingrules"],["Name"],["TargetEntity"]],
 ["queue","Queues / routing configuration",["Queue"],["queues"],["Name"],["QueueViewType"]],
 ["datamap","Data mappings",["EntityMap","AttributeMap","ImportMap","DataSourceMapping"],["entitymaps","importmaps"],["Name","SourceEntityName"],["TargetEntityName"]],
 ["duplicate","Duplicate detection rules",["DuplicateRule","DuplicateRuleCondition"],["duplicaterules"],["Name","BaseEntityName"],["MatchingEntityName"]],
 ["emailtemplate","Email templates",["EmailTemplate","Template"],["templates"],["Title","Name"],["TemplateType"]],
 ["offlineprofile","Mobile offline profiles",["MobileOfflineProfile","MobileOfflineProfileItem"],["mobileofflineprofiles"],["Name"],["ProfileName"]],
 ["report","Reports",["Report"],["reports"],["Name","Filename"],["ReportType"]],
 ["powerpages","Power Pages sites / components",["PowerPageSite","PowerPagesSite","adx_website","powerpagesite","powerpagecomponent"],["powerpages","portals"],["Name","WebsiteName","SchemaName"],["ComponentType"]],
 ["webtemplate","Power Pages templates",["adx_webtemplate","WebTemplate"],["webtemplates"],["Name"],[]],
 ["copilot","Copilot Studio agents",["Bot","bot","Copilot","CopilotAgent"],["bots","copilots"],["Name","SchemaName"],["Language"]],
 ["topic","Copilot Studio topics",["BotComponent","botcomponent","Topic"],["botcomponents","topics"],["Name","SchemaName"],["ComponentType"]],
 ["prompt","AI prompts",["AIPrompt","Prompt"],["aiprompts"],["Name","SchemaName"],["ModelType"]],
 ["ai","AI Builder models / configurations",["AIProject","AIConfiguration","AIModel"],["aiprojects","aiconfigurations"],["Name","SchemaName"],["ModelType"]],
 ["connectionrole","Connection roles",["ConnectionRole"],["connectionroles"],["Name"],[]],
 ["hierarchy","Hierarchy rules",["HierarchyRule"],["hierarchyrules"],["Name"],[]],
 ["unknown","Unmapped solution components",[],[],["Name"],[]]
];
const codeType={
1:"table",2:"column",3:"relationship",9:"choice",10:"relationship",14:"key",
20:"role",21:"privilege",24:"form",26:"view",29:"flow",31:"report",36:"emailtemplate",
44:"duplicate",45:"duplicate",46:"datamap",47:"datamap",48:"command",49:"command",50:"ribbon",52:"command",53:"command",55:"ribbon",
59:"chart",60:"form",61:"webresource",62:"sitemap",63:"connectionrole",64:"pcf",65:"hierarchy",
66:"pcf",68:"pcf",70:"fieldsecurity",71:"fieldpermission",90:"plugintype",91:"pluginassembly",
92:"pluginstep",93:"pluginimage",95:"endpoint",150:"routing",151:"routing",152:"sla",153:"slaitem",
161:"offlineprofile",162:"offlineprofile",166:"datamap",208:"datamap",300:"app",371:"connector",372:"connector",
380:"environment",381:"environment",400:"ai",401:"ai",402:"ai",430:"ai",431:"ai",432:"ai"
};
for(const [type,label] of families){if(!core.TYPES.includes(type))core.TYPES.push(type);core.LABELS[type]=label;}
const xmlNodeName=n=>(n?.localName||n?.nodeName||"").toLowerCase();
const child=(node,key)=>Array.from(node?.childNodes||[]).find(n=>n.nodeType===1&&xmlNodeName(n)===key.toLowerCase());
const scalar=(node,names)=>{
 for(const k of names){
  const val=Array.from(node?.attributes||[]).find(a=>a.name.toLowerCase()===k.toLowerCase())?.value;
  if(val!==undefined&&val!=="")return String(val).replace(/[\r\n\t]/g," ").slice(0,160);
  const el=child(node,k);if(el&&!Array.from(el.childNodes||[]).some(n=>n.nodeType===1)){
   return String(el.textContent||"").replace(/[\r\n\t]/g," ").slice(0,160);
  }
 }
 return "";
};
const sensitive=/password|secret|connectionstring|accountkey|token|credential|authorization|clientsecret|apikey|defaultvalue|currentvalue|privatekey/i;
const idOf=(type,name)=>type+":"+String(name).toLowerCase().replace(/\s+/g," ").trim().slice(0,300);
const strength={unsupported:0,referenced:1,discovered:2,inspected:3};
const info={inspected:"Inspected metadata",discovered:"Discovered only",referenced:"External dependency",unsupported:"Unsupported / unmapped"};
function insert(map,type,name,properties={},coverage="discovered",path="",description=""){
 if(!name||!type)return;
 const clean={};for(const [key,value] of Object.entries(properties)){
   if(sensitive.test(key)||value===null||value===undefined||value==="")continue;
   clean[key]=String(value).replace(/[\r\n\t]/g," ").slice(0,180);
 }
 const id=idOf(type,name),prior=map.get(id);
 const priorCoverage=prior?.coverage||"inspected";
 const finalCoverage=prior?(strength[priorCoverage]>=strength[coverage]?priorCoverage:coverage):coverage;
 map.set(id,{id,type,name:String(name).slice(0,260),description:description||prior?.description||"",
   properties:{...prior?.properties,...clean},coverage:finalCoverage,source:prior?.source||path||""});
}
function addXml(nodes,path,map){
 const pathname=path.toLowerCase();
 for(const [type,,tags,folders,nameFields,propertyFields] of families){
  if(!tags.length)continue;
  const foldersOnly=pathname!=="customizations.xml"&& !/\/customizations\.xml$/i.test(pathname);
  if(foldersOnly&&folders.length&&!folders.some(f=>pathname.includes("/"+f+"/")||pathname.startsWith(f+"/")) && !/(^|\/)other\//.test(pathname))continue;
  const names=new Set(tags.map(t=>t.toLowerCase()));
  for(const n of nodes){if(!names.has(xmlNodeName(n)))continue;
   let name=scalar(n,nameFields);
   if(!name)continue;
   // Avoid interpreting a table's inline choice as a global choice.
   if(type==="choice"&&xmlNodeName(n)==="optionset"&&!/optionsets\//i.test(pathname)){
    let parent=n.parentNode;while(parent&&parent.nodeType===1){if(xmlNodeName(parent)==="attribute"){const local=scalar(parent,["PhysicalName","LogicalName","Name"]);if(local)name=local+" / "+name;break;}parent=parent.parentNode;}
   }
   if(type==="emailtemplate"&&xmlNodeName(n)==="template"&&!/(templates|other)\//.test(pathname))continue;
   const props={};for(const f of propertyFields){if(!sensitive.test(f)){const value=scalar(n,[f]);if(value)props[f]=value;}}
   const p=n.parentNode;
   if(type==="pluginstep")props.pluginType=scalar(n,["PluginTypeName","PluginType","EventHandler"]);
   if(type==="pluginimage")props.step=scalar(n,["SdkMessageProcessingStepName","StepName"]);
   if(type==="role"&&p)props.privilegeCount=Array.from(n.getElementsByTagName("*")).filter(c=>xmlNodeName(c)==="roleprivilege").length;
   if(type==="choice")props.optionCount=Array.from(n.getElementsByTagName("*")).filter(c=>xmlNodeName(c)==="option").length;
   if(type==="bpf")props.stageCount=Array.from(n.getElementsByTagName("*")).filter(c=>xmlNodeName(c)==="stage").length;
   const status=Object.keys(props).length?"inspected":"discovered";
   insert(map,type,name,props,status,path);
  }
 }
}
function parseDocument(content){try{const doc=new DOMParser().parseFromString(content,"application/xml");
 if(Array.from(doc.getElementsByTagName("*")).some(n=>xmlNodeName(n)==="parsererror"))return null;return doc;
}catch{return null;}}
function dependenciesFromManifest(doc,map){
 const dependencies=[];
 const rootComponents=Array.from(doc.getElementsByTagName("*")).filter(n=>xmlNodeName(n)==="rootcomponent");
 for(const n of rootComponents){
  const code=scalar(n,["type","Type"]),name=scalar(n,["schemaName","SchemaName","name","Name"]);
  const type=codeType[code]||"unknown";
  if(name)insert(map,type,name,{componentType:code},type==="unknown"?"unsupported":"discovered","solution.xml",type==="unknown"?"Component type "+code+" is not yet mapped":"Solution manifest component");
 }
 for(const n of Array.from(doc.getElementsByTagName("*")).filter(n=>xmlNodeName(n)==="missingdependency")){
   const required=child(n,"Required"),dependent=child(n,"Dependent");if(!required)continue;
   const reqCode=scalar(required,["type","Type"]),reqName=scalar(required,["schemaName","SchemaName","name","Name"]);
   const depCode=scalar(dependent,["type","Type"]),depName=scalar(dependent,["schemaName","SchemaName","name","Name"]);
   if(!reqName)continue;
   const reqType=codeType[reqCode]||"unknown";
   insert(map,reqType,reqName,{componentType:reqCode},"referenced","solution.xml","Dependency referenced but not packaged");
   dependencies.push({required:idOf(reqType,reqName),dependent:depName?idOf(codeType[depCode]||"unknown",depName):"",kind:"manifest",name:reqName});
 }
 return dependencies;
}
function enrich(raw,files){
 const map=new Map(raw.components.map(c=>[c.id,{...c,coverage:"inspected",source:"Extracted solution metadata"}]));
 const manifest=Array.from(files).find(([path])=>/(^|\/)solution\.xml$/i.test(path.replace(/\\/g,"/")));
 let dependencies=[];if(manifest){const doc=parseDocument(manifest[1]);if(doc)dependencies=dependenciesFromManifest(doc,map);}
 const xmlFiles=Array.from(files).filter(([path])=>/\.xml$/i.test(path));
 for(const [path,body] of xmlFiles){const doc=parseDocument(body);if(!doc)continue;
  const nodes=Array.from(doc.getElementsByTagName("*"));addXml(nodes,path.replace(/\\/g,"/"),map);
  // A workflow category 2/3/4 is respectively a business rule, custom action or BPF.
  for(const w of nodes.filter(n=>xmlNodeName(n)==="workflow")){
   const category=scalar(w,["Category"]),name=scalar(w,["Name"]);
   if(!name)continue;
   const target={"2":"businessrule","3":"action","4":"bpf"}[category];
   if(target){map.delete(idOf("flow",name));insert(map,target,name,{category,primaryEntity:scalar(w,["PrimaryEntity"])},
      "inspected",path,"Workflow category "+category);}
  }
 }
 // Recognise resource folders even if their XML representation isn't supported.
 const folderTypes=[["pluginassemblies","pluginassembly"],["customapis","customapi"],["bots","copilot"],["botcomponents","topic"],
 ["powerpages","powerpages"],["portals","powerpages"],["aiprojects","ai"],["connectors","connector"],
 ["reports","report"],["mobileofflineprofiles","offlineprofile"],["ribbon","ribbon"],["sitemaps","sitemap"]];
 for(const path of files.keys()){
  const p=path.replace(/\\/g,"/"),segments=p.split("/");const i=folderTypes.findIndex(([folder])=>segments.some(x=>x.toLowerCase()===folder));
  if(i<0)continue;
  const type=folderTypes[i][1],base=segments.at(-1).replace(/\.(xml|json|yaml|yml)$/i,"");
  if(base&&!/^(data|metadata|definition|solution|customizations)$/i.test(base)&&!map.has(idOf(type,base)))
    insert(map,type,base,{packagePath:segments.slice(0,-1).join("/")}, "discovered",p);
 }
 const components=Array.from(map.values()).sort((a,b)=>core.TYPES.indexOf(a.type)-core.TYPES.indexOf(b.type)||a.name.localeCompare(b.name));
 const counts=Object.fromEntries(core.TYPES.map(type=>[type,components.filter(c=>c.type===type).length]));
 const coverage=Object.fromEntries(Object.keys(info).map(k=>[k,components.filter(c=>c.coverage===k).length]));
 const warnings=[...raw.warnings];if(coverage.unsupported)warnings.push(coverage.unsupported+" unmapped component(s): inspect the manifest and report missing coverage.");
 if(dependencies.length)warnings.push(dependencies.length+" declared missing dependency reference(s) found in the solution manifest.");
 return {...raw,components,counts,coverage,dependencies,warnings};
}
core.parseSolution=function(files,checksums){return enrich(orig(files,checksums),files);};
core.COVERAGE=info;
core.ROOT_COMPONENT_TYPES=codeType;
})(globalThis);
