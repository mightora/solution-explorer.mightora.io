/* Mightora Flow Explorer UI — local and read-only. */
(function(){
"use strict";
const $=id=>document.getElementById(id),esc=s=>SolutionFlowExplorer.escape(s);
let source=[],standalone=null,index=0,active=null;
const options=()=>standalone?[standalone]:source,chosen=()=>options()[index]||null;
function message(s,error=false){const el=$("flow-notice");el.textContent=s;el.classList.toggle("flow-error",error);}
function save(name,data,type){const u=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement("a");a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1200);}
function inspect(id){
 const f=chosen(),s=f?.steps.find(x=>x.id===id);active=s||null;
 const div=$("flow-step-details");if(!s){div.textContent="Select a step to inspect it.";return;}
 const rows=[
 ["Name",s.name],["Step type",s.type],["Kind",s.kind||"—"],["Branch",s.branch],["Connector",s.connector||"—"],["Operation",s.operation||"—"],
 ["runAfter",Object.entries(s.runAfter).map(([k,states])=>k+" ("+states.join(", ")+")").join("; ")||"None specified"],
 ["Input fields",s.inputFields.join(", ")||"None"],["Output fields",s.outputFields.join(", ")||"None"],
 ["Expression functions",s.expressionFunctions.join(", ")||"None"],
 ["Secure inputs",s.secureInputs?"Enabled":"Not indicated"],["Secure outputs",s.secureOutputs?"Enabled":"Not indicated"]
 ];
 div.innerHTML="<dl class='flow-properties'>"+rows.map(([k,v])=>"<div><dt>"+esc(k)+"</dt><dd>"+esc(v)+"</dd></div>").join("")+"</dl>";
 for(const button of document.querySelectorAll("[data-flow-step]")){
  button.classList.toggle("flow-selected",button.dataset.flowStep===s.id);
  button.setAttribute("aria-pressed",String(button.dataset.flowStep===s.id));
 }
}
function render(){
 const list=options(),f=chosen(),picker=$("flow-choice");picker.replaceChildren();
 if(!list.length){const o=document.createElement("option");o.textContent="No flow definitions loaded";picker.append(o);}
 else{list.forEach((x,i)=>{const o=document.createElement("option");o.value=String(i);o.textContent=x.name+" · "+x.actionCount+" actions";picker.append(o);});picker.value=String(index);}
 ["flow-export-svg","flow-export-mermaid","flow-export-json"].forEach(id=>$(id).disabled=!f);
 $("flow-summary").textContent=f?f.triggerCount+" triggers · "+f.actionCount+" actions · "+f.connections.length+" connections · "+f.edges.length+" mapped links":"Open a solution containing cloud flows, load a sample, or choose standalone JSON.";
 if(!f){$("flow-map").innerHTML="<p class='flow-placeholder'>No flow definition loaded yet.</p>";$("flow-step-list").innerHTML="<li>No steps to display</li>";$("flow-step-details").textContent="Select a step to inspect it.";return;}
 $("flow-map").innerHTML=SolutionFlowExplorer.diagram(f);
 const q=$("flow-step-search").value.toLowerCase();
 const nodes=f.steps.filter(x=>[x.name,x.type,x.operation,x.connector,x.branch].some(v=>String(v).toLowerCase().includes(q)));
 $("flow-step-list").innerHTML=nodes.length?nodes.map(n=>"<li><button class='flow-step-button' type='button' data-flow-step='"+esc(n.id)+"'><span class='flow-step-type'>"+esc(n.branch)+"</span><strong>"+esc(n.name)+"</strong><small>"+esc(n.type)+(n.operation?" · "+esc(n.operation):"")+"</small></button></li>").join(""):"<li>No matching steps</li>";
 inspect(active&&f.steps.includes(active)?active.id:f.steps[0]?.id);
 message(f.warnings.length?f.warnings.join(" "):"Flow inspection is local. Only allowlisted metadata is displayed; secrets and raw inputs are not exported.",f.warnings.length>0);
}
document.addEventListener("solution-workspace-change",e=>{
 standalone=null;source=[];index=0;active=null;
 const m=e.detail?.a;
 if(m?.flowDetails?.length)source=m.flowDetails;
 else if(m?.sample&&m.info?.filename){try{source=SolutionFlowExplorer.collect(SolutionSamples.files(m.info.filename.replace(/-demo\.zip$/,"")));}catch{}}
 render();
});
$("flow-choice").addEventListener("change",e=>{index=Number(e.target.value)||0;active=null;render();});
$("flow-step-search").addEventListener("input",render);
const clickStep=e=>{const el=e.target.closest("[data-flow-step]");if(el)inspect(el.dataset.flowStep);};
$("flow-map").addEventListener("click",clickStep);
$("flow-step-list").addEventListener("click",clickStep);
$("flow-map").addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.closest("[data-flow-step]")){e.preventDefault();clickStep(e);}});
$("flow-json-picker").addEventListener("click",()=>$("flow-json-input").click());
$("flow-json-input").addEventListener("change",async e=>{
 const file=e.target.files?.[0];if(!file)return;
 if(file.size>6*1024*1024){message("JSON exceeds the 6 MB safety limit.",true);return;}
 try{standalone=SolutionFlowExplorer.fromJSON(await file.text(),file.name);index=0;active=null;render();message("Opened "+file.name+" locally.");}
 catch(error){message(error.message||"Invalid Power Automate JSON.",true);}
 e.target.value="";
});
$("flow-demo").addEventListener("click",()=>{source=[SolutionFlowExplorer.demo()];standalone=null;index=0;active=null;render();$("flow-explorer").scrollIntoView({behavior:"smooth"});});
$("flow-export-svg").addEventListener("click",()=>{const f=chosen();if(f)save("power-automate-flow.svg",SolutionFlowExplorer.diagram(f),"image/svg+xml");});
$("flow-export-mermaid").addEventListener("click",()=>{const f=chosen();if(f)save("power-automate-flow.mmd",SolutionFlowExplorer.mermaid(f),"text/plain");});
$("flow-export-json").addEventListener("click",()=>{const f=chosen();if(f)save("power-automate-flow-inventory.json",JSON.stringify(f,null,2),"application/json");});
render();
})();