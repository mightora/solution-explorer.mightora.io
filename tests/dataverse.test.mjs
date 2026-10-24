import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
const code=fs.readFileSync(path.resolve(import.meta.dirname,'../src/dataverse-solutions.js'),'utf8');
const ZIP_B64='UEsDBBQAAAAIAAAAAAAAAAAAAAAAAAAAAAA=';
function create({path='/WebResources/abc_solution_explorer.html',responses=[]}={}){
 const calls=[];
 const host={location:{href:'https://org.crm.dynamics.com'+path,origin:'https://org.crm.dynamics.com',protocol:'https:',pathname:path},
  fetch:async(url,options)=>{calls.push({url,options});const data=responses.shift();if(data instanceof Error)throw data;
   if(data?.status)return {ok:false,status:data.status,json:async()=>({error:{message:data.message}})};
   return {ok:true,json:async()=>data};},
  atob:s=>Buffer.from(s,'base64').toString('binary'),TextDecoder,File:class File{constructor(v,n,o){this.name=n;this.parts=v;this.type=o.type;}},URL};
 host.globalThis=host;
 vm.runInNewContext(code,host);
 return {api:host.MightoraDataverseSolutions,calls};
}
const ID='e4e30f2d-afa0-47ab-a9d2-099130de3320';
test('outside Dataverse the adapter does not connect',()=>{assert.equal(create({path:'/index.html'}).api.context(),null)});
test('list uses only same-origin Dataverse read API and retains managed entries',async()=>{
 const t=create({responses:[{value:[{solutionid:ID,uniquename:'abc_project',friendlyname:'Project',version:'1.0',ismanaged:false},{solutionid:'be1b8e4a-f00d-4444-9999-d0bb2e8a4900',uniquename:'abc_managed',friendlyname:'Managed',ismanaged:true}]}]});
 const result=await t.api.list(t.api.context());assert.equal(result.solutions.length,2);assert.equal(result.solutions[1].managed,true);
 assert.match(t.calls[0].url,/\/api\/data\/v9\.2\/solutions\?/);assert.equal(t.calls[0].options.method,'GET');assert.equal(t.calls[0].options.credentials,'same-origin');
});
test('unmanaged ExportSolution action does not submit tokens or secrets',async()=>{
 const t=create({responses:[{ExportSolutionFile:ZIP_B64}]});
 const f=await t.api.exportUnmanaged(t.api.context(),{uniqueName:'abc_project',managed:false});
 assert.equal(f.name,'abc_project.zip');assert.match(t.calls[0].url,/\/ExportSolution$/);
 const b=JSON.parse(t.calls[0].options.body);assert.equal(b.SolutionName,'abc_project');assert.equal(b.Managed,false);assert.equal(Object.keys(b).length,2);
});
test('rejects managed export and invalid name before making requests',async()=>{
 const t=create();await assert.rejects(t.api.exportUnmanaged(t.api.context(),{uniqueName:'managed',managed:true}),/Managed/);
 await assert.rejects(t.api.exportUnmanaged(t.api.context(),{uniqueName:'../evil',managed:false}),/invalid/);
 assert.equal(t.calls.length,0);
});
test('managed inventory never claims unpacking or full inspection',async()=>{
 const t=create({responses:[{value:[{solutioncomponentid:ID,componenttype:1,objectid:ID,rootcomponentbehavior:0},{componenttype:9999,objectid:ID}]}]});
 const model=await t.api.inspectMetadata(t.api.context(),{id:ID,uniqueName:'abc_m',version:'1',managed:true,name:'Managed'});
 assert.equal(model.partial,true);assert.equal(model.components.length,2);assert.equal(model.coverage.inspected,0);assert.ok(model.warnings.join(' ').includes('Metadata-only'));
 assert.equal(t.calls[0].options.method,'GET');assert.match(t.calls[0].url,/solutioncomponents/);
});
test('rejects cross-origin pagination',async()=>{
 const t=create({responses:[{value:[],'@odata.nextLink':'https://evil.example/api/data/v9.2/solutions'}]});
 await assert.rejects(t.api.list(t.api.context()),/unexpected host/);
});
test('permission failure is transparent and contains no tokens',async()=>{
 const t=create({responses:[{status:403,message:'Insufficient privileges'}]});
 await assert.rejects(t.api.list(t.api.context()),/403.*Insufficient privileges/);
});
test('managed inventory resolves included web resource names without retrieving content upfront',async()=>{
 const t=create({responses:[{value:[{solutioncomponentid:ID,componenttype:61,objectid:ID}]},{value:[{webresourceid:ID,name:'mt_/app.js',displayname:'App script',webresourcetype:3}]}]});
 const model=await t.api.inspectMetadata(t.api.context(),{id:ID,uniqueName:'managed',managed:true,name:'Managed'});
 assert.equal(model.webResources.length,1);assert.equal(model.webResources[0].name,'mt_/app.js');
 assert.equal(model.webResources[0].path,'dataverse:'+ID);
 assert.match(t.calls[1].url,/webresourceset\?/);assert.ok(!t.calls[1].url.includes('content'));
 assert.equal(t.calls[1].options.credentials,'same-origin');
});
test('live web resource source is fetched on demand as data and never evaluated',async()=>{
 const encoded=Buffer.from('<script>Never run this</script>','utf8').toString('base64');
 const t=create({responses:[{content:encoded}]});const source=await t.api.readWebResource(t.api.context(),ID,'string');
 assert.equal(source,'<script>Never run this</script>');
 assert.match(t.calls[0].url,/webresourceset\(.+\)\?\$select=content/);
 assert.equal(t.calls[0].options.method,'GET');
 await assert.rejects(t.api.readWebResource(t.api.context(),'not-a-guid'),/Invalid/);
});
