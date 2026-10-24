/* Complete editable component visuals and source text. No screenshots of diagrams.
 * Each ERD edge gets a page, preventing cross-page links from being silently lost. */
(function(root){
'use strict';
const office=root.SolutionOffice,baseDocx=office.docx,basePptx=office.pptx,N=office._native;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c])).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'');
const para=N.wPara,table=N.wordTable;
let drawingId=0;
function wCode(s){return String(s??'').split('\n').map(line=>`<w:p><w:pPr><w:spacing w:after="0" w:line="220" w:lineRule="auto"/><w:wordWrap w:val="1"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="17"/></w:rPr>${line.split(/(\t)/).map(p=>p==='\t'?'<w:tab/>':`<w:t xml:space="preserve">${esc(p.replace(/\r/g,''))}</w:t>`).join('')}</w:r></w:p>`).join('');}
function wordEdge(e){
 // Word VML is a native editable drawing group with editable text boxes and a connector.
 const uid=drawingId++;const box=(id,x,label,cardinality)=>`<v:rect id="${id}_${uid}" style="position:absolute;left:${x};top:20;width:400;height:170" fillcolor="#f2f0fe" strokecolor="#6957db"><v:textbox inset="10pt,8pt,10pt,8pt"><w:txbxContent>${para(label,'',true)}${para(cardinality)}</w:txbxContent></v:textbox></v:rect>`;
 return `<w:p><w:pPr><w:keepNext/></w:pPr><w:r><w:pict><v:group xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" style="width:475pt;height:110pt" coordorigin="0,0" coordsize="950,220">${box('erd_source',5,e.source||'Endpoint not supplied',e.sourceCardinality+(e.sourceAttribute?' / '+e.sourceAttribute:''))}${box('erd_target',545,e.target||'Endpoint not supplied',e.targetCardinality+(e.targetAttribute?' / '+e.targetAttribute:''))}<v:line style="position:absolute" from="405,105" to="545,105" strokecolor="#20a997" strokeweight="1.5pt"><v:stroke endarrow="block"/></v:line></v:group></w:pict></w:r></w:p>`;
}
function wordDetails(report){let out='';
 for(const erd of report.erds||[]){out+=para((erd.side?erd.side+' / ':'')+'Full entity relationship diagram','Heading1')+para(erd.note);
  for(const t of erd.tables){out+=para(t.name+(t.external?' external reference':''),'Heading2');out+=table([['Column','Data type','Key','Required'],...t.columns.map(c=>[c.name,c.type,[c.pk?'PK':'',c.fk?'FK':''].filter(Boolean).join(', '),c.required])]);if(!t.columns.length)out+=para('No column definitions supplied for this table.');}
  for(const e of erd.edges){out+=para(e.name,'Heading2')+wordEdge(e)+table([['From','Cardinality','To','Intersect table'],[e.source,e.sourceCardinality+':'+e.targetCardinality,e.target,e.intersectEntity||'—']]);if(!e.complete)out+=para('One or both relationship endpoints were not supplied.');}
 }
 for(const a of report.canvases||[])for(const s of a.screens){out+=para((a.side?a.side+' / ':'')+a.name+' / '+s.name,'Heading1')+para('Editable canvas screen structure. Literal coordinates are shown where supplied; formulas are documented without execution.');out+=table([['Control','Kind','Parent','Position and size','Text'],...s.controls.map(c=>[c.name,c.kind,c.parent,[c.x,c.y,c.width,c.height].map(x=>x===null?'dynamic':x).join(', '),c.text])]);}
 for(const section of report.sections)for(const block of section.codeBlocks||[]){out+=para(section.title,'Heading1')+para(block.title||block.path,'Heading2')+para((block.language||'source')+' / '+block.path)+wCode(block.text);}
 return out;
}
async function docx(report,opts){const blob=await baseDocx(report,opts),zip=await root.JSZip.loadAsync(await blob.arrayBuffer()),path='word/document.xml',body=await zip.file(path).async('string');zip.file(path,body.replace('<w:sectPr>',wordDetails(report)+'<w:sectPr>'));return zip.generateAsync({type:'blob',compression:'DEFLATE'});}
function codePages(report,theme,start){const pages=[];
 for(const s of report.sections)for(const b of s.codeBlocks||[]){const lines=N.wrapText(String(b.text??'').replace(/\t/g,'    '),105),parts=Math.max(1,Math.ceil(lines.length/25));
  for(let part=0;part<parts;part++)pages.push(N.makeSlide(s.title,(b.title||b.path)+' / '+(part+1)+' of '+parts,(put,t)=>{
   put('shape',['Editable source code',.65,1.7,12.0,4.97,{text:lines.slice(part*25,(part+1)*25).join('\n'),size:10.8,font:'Consolas',anchor:'t',color:t.ink,fill:t.soft,stroke:t.soft,pad:.12}]);
  },theme,start+pages.length+1));
 }return pages;}
function erdPage(p,theme,index,side=''){
 return N.makeSlide((side?side+' / ':'')+p.title,p.note,(put,t)=>{
  if(p.kind==='erd-table'){
   const entity=p.tables[0];put('shape',['ERD entity',.7,1.7,11.9,.42,{text:entity.name+(entity.external?' / EXTERNAL':''),bold:true,size:15,color:'FFFFFF',fill:t.primary,stroke:t.primary}]);
   let y=2.17;entity.columns.forEach((c,i)=>{const text=N.wrapText([c.pk?'PK':c.fk?'FK':'  ',c.name,c.type,'Required: '+c.required].join('    '),130),h=text.length*.18+.08;put('shape',['Editable ERD column '+c.name,.7,y,11.9,h,{text:text.join('\n'),size:10.7,color:t.ink,fill:i%2?t.background:t.soft,stroke:t.background,pad:.05}]);y+=h;});
   return;
  }
  const positions=new Map();for(const [i,entity] of p.tables.entries())positions.set(entity.id,{x:.7+(i%2)*6.15,y:1.8+Math.floor(i/2)*1.53});
  for(const e of p.edges){const a=positions.get(e.sourceId),b=positions.get(e.targetId);if(a&&b&&a!==b)put('line',[a.x+2.75,a.y+.35,b.x+2.75,b.y+.35,t.accent]);else if(a&&b){put('line',[a.x+5.5,a.y+.4,a.x+6.0,a.y+.4,t.accent]);put('line',[a.x+6.0,a.y+.4,a.x+6.0,a.y+1.5,t.accent]);put('line',[a.x+6.0,a.y+1.5,a.x+5.5,a.y+1.5,t.accent]);}}
  for(const entity of p.tables){const q=positions.get(entity.id);let text=entity.name+(entity.external?'\nEXTERNAL TABLE':'');
   if(p.kind==='erd-edge')text+='\n'+entity.columns.map(c=>(c.pk?'PK ':c.fk?'FK ':'')+c.name).join('\n');
   put('shape',['Editable ERD entity '+entity.name,q.x,q.y,5.6,p.kind==='erd-edge'?2.4:1.07,{text,bold:true,size:12.5,color:t.ink,fill:t.soft,stroke:entity.external?'C48B31':t.primary,pad:.14}]);
  }
  if(p.kind==='erd-edge'){const e=p.edges[0];put('shape',['Relationship cardinality',.8,4.7,11.7,1.4,{text:e.name+'\n'+(e.source||'Unknown')+' ('+e.sourceCardinality+') to '+(e.target||'Unknown')+' ('+e.targetCardinality+')'+(e.sourceId===e.targetId?'\nSelf relationship':'')+(e.intersectEntity?'\nIntersect table: '+e.intersectEntity:''),size:13,color:t.ink,fill:t.background,stroke:t.background}]);}
 },theme,index);
}
function canvasPages(report,theme,start){const pages=[];
 for(const a of report.canvases||[])for(const s of a.screens){const chunks=Math.max(1,Math.ceil(s.controls.length/12));
  for(let part=0;part<chunks;part++)pages.push(N.makeSlide(a.name+' / '+s.name,`${a.side||'Canvas app'} / Editable structural controls / part ${part+1} of ${chunks}`,(put,t)=>{
   s.controls.slice(part*12,(part+1)*12).forEach((c,i)=>{const x=.68+(i%3)*4.18,y=1.7+Math.floor(i/3)*1.24;put('shape',['Canvas control '+c.name,x,y,3.98,1.05,{text:c.name+'\n'+c.kind+(c.parent?' / '+c.parent:'')+'\n'+String(c.text).slice(0,110),size:11.3,color:t.ink,fill:t.soft,stroke:t.primary,pad:.10}]);});
  },theme,start+pages.length+1));
 }return pages;
}
function rulePages(report,theme,start){const pages=[];
 for(const r of report.rules||[]){const parts=Math.max(1,Math.ceil(r.steps.length/8));for(let part=0;part<parts;part++)pages.push(N.makeSlide(r.name,`${r.side||'Business rule'} / Scope: ${r.scope} / Table: ${r.table||'not supplied'} / ${r.state}`,(put,t)=>{
  put('shape',['Rule scope',.7,1.6,11.9,.55,{text:r.scope+' / '+r.scopeEvidence+(r.formIds.length?' / '+r.formIds.join(', '):''),size:12,color:t.ink,fill:t.soft,stroke:t.primary}]);
  r.steps.slice(part*8,(part+1)*8).forEach((step,i)=>put('shape',['Business rule '+step.kind,.7,2.35+i*.52,11.9,.45,{text:step.kind+' / '+step.name,size:12,color:t.ink,fill:t.soft,stroke:t.background}]));
  if(!r.steps.length)put('shape',['Missing business rule definition',.7,2.6,11.9,1.1,{text:'Condition and action metadata not decoded. Packaged definitions appear as editable source text where available.',size:14,color:t.ink,fill:t.background,stroke:t.background}]);
 },theme,start+pages.length+1));}return pages;
}
async function appendSlides(blob,pages){
 const zip=await root.JSZip.loadAsync(await blob.arrayBuffer());let pres=await zip.file('ppt/presentation.xml').async('string'),rels=await zip.file('ppt/_rels/presentation.xml.rels').async('string'),types=await zip.file('[Content_Types].xml').async('string'),count=Object.keys(zip.files).filter(p=>/^ppt\/slides\/slide\d+\.xml$/.test(p)).length;
 for(const page of pages){count++;zip.file(`ppt/slides/slide${count}.xml`,page);zip.file(`ppt/slides/_rels/slide${count}.xml.rels`,'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>');
  pres=pres.replace('</p:sldIdLst>',`<p:sldId id="${255+count}" r:id="rId${count+1}"/></p:sldIdLst>`);rels=rels.replace('</Relationships>',`<Relationship Id="rId${count+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${count}.xml"/></Relationships>`);types=types.replace('</Types>',`<Override PartName="/ppt/slides/slide${count}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>`);
 }zip.file('ppt/presentation.xml',pres);zip.file('ppt/_rels/presentation.xml.rels',rels);zip.file('[Content_Types].xml',types);return zip.generateAsync({type:'blob',compression:'DEFLATE'});
}
async function pptx(report,opts={}){
 const blob=await basePptx(report,opts),theme=N.selectTheme(opts),zip=await root.JSZip.loadAsync(await blob.arrayBuffer()),count=Object.keys(zip.files).filter(p=>/^ppt\/slides\/slide\d+\.xml$/.test(p)).length,pages=[];
 for(const erd of report.erds||[])for(const p of root.SolutionERD.pages(erd))pages.push(erdPage(p,theme,count+pages.length+1,erd.side));
 pages.push(...canvasPages(report,theme,count+pages.length));pages.push(...rulePages(report,theme,count+pages.length));pages.push(...codePages(report,theme,count+pages.length));
 return appendSlides(blob,pages);
}
office.docx=docx;office.pptx=pptx;
})(globalThis);
