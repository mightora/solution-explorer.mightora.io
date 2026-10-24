/* Direct entry point for canvas apps, business rules, forms and views. */
(function(root){
'use strict';const $=id=>document.getElementById(id);let model=null,selected='';
function render(){
 const q=$('visual-component-search').value.toLowerCase(),type=$('visual-component-type').value,scope=$('visual-rule-scope').value;
 const list=(model?.components||[]).filter(c=>['app','businessrule','form','view'].includes(c.type)&&(type==='all'||c.type===type)&&(scope==='all'||c.type==='businessrule'&&c.properties.scope===scope)&&(c.name+' '+JSON.stringify(c.properties||{})).toLowerCase().includes(q));
 const picker=$('visual-component-choice');picker.replaceChildren();for(const c of list){const o=document.createElement('option');o.value=c.id;o.textContent=(root.SolutionCore.LABELS[c.type]||c.type)+' / '+c.name+(c.type==='businessrule'?' / '+c.properties.scope:'');picker.append(o);}
 if(!list.some(c=>c.id===selected))selected=list[0]?.id||'';picker.value=selected;picker.disabled=!selected;
 $('visual-component-stage').innerHTML=selected?root.SolutionComponentUI.markup(model,selected):'<p class="object-empty">No matching visual components. Try the component showcase or load a solution export.</p>';
 $('visual-component-count').textContent=list.length+' visual components';for(const kind of ['docx','pptx','json'])$('visual-component-'+kind).disabled=!selected;
}
$('visual-component-choice').addEventListener('change',e=>{selected=e.target.value;render();});for(const id of ['visual-component-search','visual-component-type','visual-rule-scope'])$(id).addEventListener(id.includes('search')?'input':'change',render);
for(const kind of ['docx','pptx'])$('visual-component-'+kind).addEventListener('click',e=>{if(selected)root.SolutionComponentUI.exportItem(model,selected,kind,e.currentTarget,$('visual-component-status'));});
$('visual-component-json').addEventListener('click',()=>{if(selected)root.SolutionComponentUI.save('solution-component.json',new Blob([JSON.stringify(root.SolutionDetails.component(model,selected),null,2)],{type:'application/json'}));});
document.addEventListener('solution-workspace-change',e=>{model=e.detail.a;selected='';render();});render();
})(globalThis);
