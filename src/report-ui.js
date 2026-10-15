/* Mightora Solution Explorer — accessible local Office report export controls. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
let baseline=null,newer=null,hasChosenMode=false,busy=false;
const reportStatus=(message,error=false)=>{const el=$('report-status');el.textContent=message;el.classList.toggle('report-status-error',error);};
const filename=s=>String(s||'solution').replace(/[^a-z0-9_-]/gi,'-').replace(/-+/g,'-').slice(0,55).replace(/^-|-$/g,'')||'solution';
function refresh(){
 const mode=$('report-mode').value,valid=mode==='single'?!!baseline:!!(baseline&&newer);
 $('report-export-docx').disabled=!valid||busy;$('report-export-pptx').disabled=!valid||busy;
 if(!baseline){$('report-preview').textContent='Load a solution ZIP or try a sample to enable documentation exports.';return;}
 if(mode==='comparison'&&!newer){$('report-preview').textContent='Load newer solution B, or choose “Load comparison demo”, to generate a change-impact report.';return;}
 const report=mode==='single'?SolutionReports.single(baseline):SolutionReports.comparison(baseline,newer);
 const size=report.sections.reduce((sum,s)=>sum+s.tables.reduce((n,t)=>n+t.rows.length,0),0);
 $('report-preview').textContent=mode==='single'?`${baseline.components.length} components · ${baseline.counts.table||0} tables · ${baseline.counts.column||0} columns · ${baseline.counts.relationship||0} relationships · ${report.sections.length} sections`:
 `${report.counts.added} added · ${report.counts.removed} removed · ${report.counts.changed} changed · ${report.counts.unchanged} unchanged · ${size} report rows`;
}
function save(file,blob){const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=file;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
async function exportOffice(kind){if(busy)return;const mode=$('report-mode').value;
 if(!baseline||(mode==='comparison'&&!newer))return;
 busy=true;refresh();reportStatus(`Generating editable ${kind.toUpperCase()} locally…`);
 try{
  const report=mode==='single'?SolutionReports.single(baseline):SolutionReports.comparison(baseline,newer);
  const options={theme:$('report-theme').value,font:$('report-font').value};
  const blob=await SolutionOffice[kind](report,options);
  const suffix=mode==='single'?'technical-report':'change-assessment';
  save(`mightora-${filename(baseline.info?.name)}-${suffix}.${kind}`,blob);
  reportStatus(`Editable ${kind.toUpperCase()} report generated. No solution data was sent to a server. Review reported gaps and exported content before sharing.`);
 }catch(error){reportStatus(`Could not generate ${kind.toUpperCase()}: ${error.message||error}`,true);}
 finally{busy=false;refresh();}
}
$('report-mode').addEventListener('change',()=>{hasChosenMode=true;refresh();});
$('report-export-docx').addEventListener('click',()=>exportOffice('docx'));
$('report-export-pptx').addEventListener('click',()=>exportOffice('pptx'));
document.addEventListener('solution-workspace-change',event=>{
 baseline=event.detail?.a||null;newer=event.detail?.b||null;
 if(newer&&!hasChosenMode)$('report-mode').value='comparison';
 else if(!newer&&!hasChosenMode)$('report-mode').value='single';
 refresh();
});
refresh();
})();
