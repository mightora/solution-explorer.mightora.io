/* Dedicated, no-secret, same-origin Dataverse solution picker for the model-driven app edition. */
(function(root){
'use strict';
const $=id=>root.document.getElementById(id),client=root.MightoraDataverseSolutions.context(),api=root.MightoraDataverseSolutions;
const chooser=$('dv-solution'),slot=$('dv-slot'),search=$('dv-search'),refresh=$('dv-refresh'),open=$('dv-open'),status=$('dv-status');
if(!chooser||!slot||!status)return;
let all=[],loading=false;
const report=(text,error=false)=>{status.textContent=text;status.classList.toggle('dv-error',error);};
function render(){
 const q=search.value.toLowerCase().trim(),selected=chooser.value;
 const visible=all.filter(x=>(x.name+' '+x.uniqueName).toLowerCase().includes(q));
 chooser.replaceChildren();
 const empty=root.document.createElement('option');empty.value='';empty.textContent=visible.length?'Choose an environment solution':'No matching solutions';chooser.append(empty);
 for(const item of visible){
  const option=root.document.createElement('option');option.value=item.id;
  option.textContent=item.name+' · '+(item.managed?'Managed inventory':'Unmanaged ZIP')+' · v'+(item.version||'?');
  chooser.append(option);
 }
 if(visible.some(x=>x.id===selected))chooser.value=selected;
 open.disabled=loading||!chooser.value;
}
async function loadList(){
 if(loading)return;loading=true;refresh.disabled=true;open.disabled=true;
 if(!client){report('Dataverse context unavailable. Install this HTML as a Web resource page in a signed-in model-driven app. You can still open a local solution ZIP.',true);loading=false;refresh.disabled=false;return;}
 report('Reading solutions from the current Dataverse environment…');
 try{const result=await api.list(client);all=result.solutions;render();
  report(all.length+' solutions found in the current environment'+(result.truncated?' (list limit reached)':'')+'. Unmanaged solutions can be exported and fully inspected; managed solutions show an API inventory.');}
 catch(error){all=[];render();report(error.message||'Could not retrieve solutions. Check permissions and Web resource context.',true);}
 finally{loading=false;refresh.disabled=false;render();}
}
async function loadSelection(){
 if(loading)return;const item=all.find(x=>x.id===chooser.value);if(!item)return;
 loading=true;render();report('Opening '+item.name+' in solution '+slot.value.toUpperCase()+'…');
 try{
  if(item.managed||item.special){
   const model=await api.inspectMetadata(client,item);
   root.MightoraSolutionWorkbench.loadModel(model,slot.value);
   report('Loaded '+model.components.length+' component references from '+item.name+'. This is a partial inventory, not an exported managed ZIP.');
  }else{
   const file=await api.exportUnmanaged(client,item);
   await root.MightoraSolutionWorkbench.loadZip(file,slot.value);
   report('Exported and inspected '+item.name+' in browser memory. No ZIP was uploaded to Mightora.');
  }
  $('results').scrollIntoView({behavior:'smooth',block:'start'});
 }catch(error){report('Could not open '+item.name+': '+(error.message||'Dataverse request failed.'),true);}
 finally{loading=false;render();}
}
search.addEventListener('input',render);chooser.addEventListener('change',render);refresh.addEventListener('click',loadList);open.addEventListener('click',loadSelection);
loadList();
})(globalThis);