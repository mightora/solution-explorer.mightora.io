/* Extend native, editable Office exports with every diagram derivable from the parsed solution.
 * No SVG screenshots or binary image layers are inserted; everything is editable text, tables or shapes. */
(function(root){
'use strict';
const office=root.SolutionOffice,baseDocx=office.docx,basePptx=office.pptx;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c])).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'');
const clip=(s,n=150)=>String(s??'').replace(/[\r\n\t]+/g,' ').slice(0,n);
const rawTable=(rows)=>{
 const count=rows[0]?.length||1,w=Math.floor(9500/count);
 return `<w:tbl><w:tblPr><w:tblW w:type="dxa" w:w="9500"/><w:tblBorders><w:top w:val="single" w:sz="6" w:color="D5DEED"/><w:bottom w:val="single" w:sz="6" w:color="D5DEED"/><w:insideH w:val="single" w:sz="4" w:color="E7EBF5"/><w:insideV w:val="single" w:sz="4" w:color="E7EBF5"/></w:tblBorders></w:tblPr><w:tblGrid>${rows[0].map(()=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${rows.map((row,i)=>`<w:tr>${row.map(v=>`<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/><w:shd w:fill="${i?'FFFFFF':'E9E6FC'}"/></w:tcPr><w:p><w:r><w:rPr>${i===0?'<w:b/>':''}</w:rPr><w:t>${esc(clip(v,350))}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`).join('')}</w:tbl>`;
};
const para=(s,style='')=>`<w:p>${style?`<w:pPr><w:pStyle w:val="${style}"/></w:pPr>`:''}<w:r><w:t xml:space="preserve">${esc(clip(s,1500))}</w:t></w:r></w:p>`;
function diagramWord(v){
 let xml=para((v.side?v.side+' — ':'')+v.title,'Heading2')+para(v.note||'Diagram based on extracted metadata, not live system behaviour.');
 if(v.kind==='flow'){
  const model=root.SolutionFlowExplorer.layout(v,250),steps=model.rows.filter(r=>r.kind==='step');
  if(!steps.length)return xml+para('No mapped flow steps in this export.');
  // Branch-aware visual path. The table is intentionally editable in Word.
  const rows=[['CONTAINER / BRANCH','ACTION PATH','KIND','EXPLICIT runAfter']];
  for(const r of steps){const s=r.step;rows.push([clip((r.depth?'↳ '.repeat(Math.min(r.depth,4)):'')+s.branch,75),clip(s.name,110),clip(s.type,45),Object.entries(s.runAfter||{}).map(([k,st])=>k+' ['+st.join(', ')+']').join('; ')||'No explicit prerequisite']);}
  xml+=rawTable(rows)+para('Connected steps may also appear inside conditional branches, loops or scopes. No implied sequencing between independent actions.');
  if(v.warnings?.length)xml+=para('Extraction warnings: '+v.warnings.join('; '));
  return xml;
 }
 if(!v.nodes?.length)return xml+para('No supported entities for this diagram.');
 xml+=rawTable([['OBJECT','COMPONENT FAMILY / STATUS'],...v.nodes.map(n=>[n.label,clip(n.kind+(n.status?' · '+n.status:''),120)])]);
 if(v.edges?.length){const labels=new Map(v.nodes.map(n=>[n.id,n.label]));
  xml+=para('Editable connection map — source → link → target');
  xml+=rawTable([['SOURCE','RELATIONSHIP / EVIDENCE','TARGET'],...v.edges.map(e=>[labels.get(e.from)||e.from,clip(e.label||e.kind||'Link',90),labels.get(e.to)||e.to])]);
 }else xml+=para('The export did not provide reliable edges for this view. No relationships were invented.');
 return xml;
}
async function docx(report,opts){
 const result=await baseDocx(report,opts),visuals=report.visuals||[];
 if(!visuals.length)return result;
 const zip=await root.JSZip.loadAsync(await result.arrayBuffer());
 const path='word/document.xml',original=await zip.file(path).async('string');
 let content=para('Architecture and automation diagrams','Heading1')+
  para('All maps below are represented as editable Word tables and text. PowerPoint exports offer richer, editable native shapes.');
 for(const d of visuals)content+=diagramWord(d);
 if(!original.includes('<w:sectPr>'))throw Error('Unexpected Word document structure: diagrams cannot be appended.');
 zip.file(path,original.replace('<w:sectPr>',content+'<w:sectPr>'));
 return zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
}
const EMU=n=>Math.round(n*914400);
const colors={mightora:{base:'FFFFFF',text:'213453',soft:'F4F2FD',bar:'6957DB',line:'23A397',muted:'61738C'},light:{base:'FFFFFF',text:'213453',soft:'EDF2F8',bar:'34577F',line:'237F8D',muted:'61738C'},dark:{base:'16213A',text:'F5F7FF',soft:'2A3655',bar:'9B91F1',line:'5BD7C5',muted:'D0D8ED'}};
const colorFor=status=>status==='removed'?'BA5256':status==='added'?'178F76':status==='changed'?'8065C4':null;
const ptext=(text,size=11,color='213453',bold=false)=>`<a:p><a:pPr/><a:r><a:rPr lang="en-GB" sz="${Math.round(size*100)}"${bold?' b="1"':''}><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:rPr><a:t>${esc(clip(text,180))}</a:t></a:r><a:endParaRPr lang="en-GB"/></a:p>`;
function box(id,name,x,y,w,h,text,color,opts={}){
 const fill=opts.fill||'FFFFFF',stroke=opts.stroke||fill;
 return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${esc(clip(name,90))}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${EMU(x)}" y="${EMU(y)}"/><a:ext cx="${EMU(w)}" cy="${EMU(h)}"/></a:xfrm><a:prstGeom prst="${opts.round?'roundRect':'rect'}"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${fill}"/></a:solidFill><a:ln w="${opts.lineWidth||7000}"><a:solidFill><a:srgbClr val="${stroke}"/></a:solidFill></a:ln></p:spPr><p:txBody><a:bodyPr wrap="square" anchor="ctr" lIns="${EMU(.10)}" rIns="${EMU(.10)}" tIns="${EMU(.03)}" bIns="${EMU(.03)}"/><a:lstStyle/>${text.split('\n').map((s,i)=>ptext(s,i===0?(opts.fontSize||12):9.5,color,i===0&&!!opts.bold)).join('')}</p:txBody></p:sp>`;
}
function connector(id,x1,y1,x2,y2,color,dashed=false){
 const x=Math.min(x1,x2),y=Math.min(y1,y2),w=Math.max(.01,Math.abs(x2-x1)),h=Math.max(.01,Math.abs(y2-y1));
 return `<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="${id}" name="Editable dependency connector"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm${(x1>x2)!==(y1>y2)?' flipH="1"':''}><a:off x="${EMU(x)}" y="${EMU(y)}"/><a:ext cx="${EMU(w)}" cy="${EMU(h)}"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="16000"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill>${dashed?'<a:prstDash val="dash"/>':''}<a:headEnd type="triangle"/></a:ln></p:spPr></p:cxnSp>`;
}
function slide(title,subtitle,items,links,theme,num){
 const c=colors[theme]||colors.mightora;let shapes='',id=2;
 function add(name,x,y,w,h,text,color=c.text,o={}){shapes+=box(id++,name,x,y,w,h,text,color,o);}
 add('Slide background',0,0,13.333,7.5,'',c.text,{fill:c.base});
 add('Mightora accent',0,0,13.333,.11,'',c.text,{fill:c.bar});
 add('Diagram heading',.55,.30,12.2,.55,title,c.text,{fill:c.base,bold:true,fontSize:20});
 add('Diagram scope',.58,.98,12.0,.48,subtitle,c.muted,{fill:c.base,fontSize:10.5});
 const positions=new Map();
 // Graph nodes: three columns x three rows. Flow nodes: two columns x five rows.
 const flow=items.some(x=>x.flow),cols=flow?2:3;const gapX=flow?.28:.18;
 const colW=flow?5.95:3.86,rowH=flow?1.00:1.57;
 const cardH=flow?.72:1.04,baseX=.6,baseY=1.65;
 for(let k=0;k<items.length;k++){
  const n=items[k],x=baseX+(k%cols)*(colW+gapX),y=baseY+Math.floor(k/cols)*rowH;
  positions.set(n.id,{x,y,w:colW,h:cardH});
 }
 for(const e of links||[]){const a=positions.get(e.from),b=positions.get(e.to);if(!a||!b)continue;
  const color=e.kind==='nested'?'9D8AC5':c.line;
  shapes+=connector(id++,a.x+a.w/2,a.y+cardH/2,b.x+b.w/2,b.y+cardH/2,color,e.kind==='nested');
 }
 for(const n of items){const p=positions.get(n.id),accent=colorFor(n.status)||c.bar;
  add('Editable node '+n.label,p.x,p.y,p.w,p.h,(n.label||'Object')+'\n'+(n.detail||n.kind||''),c.text,{fill:c.soft,stroke:accent,lineWidth:14500,round:true,fontSize:flow?11:12,bold:true});
 }
 add('Diagram guidance',.58,6.95,12.0,.19,flow?'Teal: explicit runAfter  ·  Purple dashed: nested action  ·  No implied sequence':'Edges are shown only for metadata-supported links.',c.muted,{fill:c.base,fontSize:8});
 add('Slide number',12.65,7.21,.35,.17,String(num),c.muted,{fill:c.base,fontSize:7});
 return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${shapes}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}
function pagesFor(v,theme){
 const pages=[];
 if(v.kind==='flow'){
  const layout=root.SolutionFlowExplorer.layout(v,250),steps=layout.rows.filter(r=>r.kind==='step').map(r=>r.step);
  if(!steps.length)return [];
  for(let i=0;i<steps.length;i+=10){
   const subset=steps.slice(i,i+10),ids=new Set(subset.map(n=>n.id));
   const elements=subset.map(s=>({id:s.id,label:clip(s.name,58),detail:clip((s.branch||'Main')+' · '+s.type+(s.operation?' · '+s.operation:''),96),kind:s.type,flow:true}));
   const links=(v.edges||[]).filter(e=>ids.has(e.from)&&ids.has(e.to)&&e.kind!=='start');
   pages.push({title:v.title,subtitle:(v.side?v.side+' · ':'')+'Branch-aware action map · part '+(Math.floor(i/10)+1)+'/'+Math.ceil(steps.length/10)+' · '+v.note,items:elements,links});
  }
  return pages;
 }
 if(!v.nodes?.length)return [];
 for(let i=0;i<v.nodes.length;i+=9){const nodes=v.nodes.slice(i,i+9),ids=new Set(nodes.map(n=>n.id));
  pages.push({title:v.title,subtitle:(v.side?v.side+' · ':'')+'Editable component map · part '+(Math.floor(i/9)+1)+'/'+Math.ceil(v.nodes.length/9)+' · '+v.note,items:nodes,links:(v.edges||[]).filter(e=>ids.has(e.from)&&ids.has(e.to))});
 }
 return pages;
}
function formContinuation(form,tab,part,total,theme){
 const fields=(tab.sections||[]).flatMap(s=>s.fields.map(f=>({section:s.name,field:f}))),portion=fields.slice(part*10,(part+1)*10);
 const items=portion.map((item,i)=>({id:'field'+i,label:clip(item.field.label||item.field.field||'Control',68),detail:clip(item.section+'  ·  '+(item.field.kind||'Field')+(item.field.field?'  ['+item.field.field+']':''),95),kind:'field',flow:true}));
 return {title:'Form preview — '+form.name,subtitle:(form.side?form.side+' · ':'')+form.table+' · '+tab.name+' · editable control layout ('+(part+1)+'/'+total+')',items,links:[]};
}
function additionalFormPages(report){
 const all=report.forms||[],pages=[];
 // The core PPTX engine already includes the first 24 form/tab pages (at most 3 tabs/form).
 let baseShown=0;
 for(const form of all){
  for(let j=0;j<(form.tabs||[]).length;j++){
   const tab=form.tabs[j],isInBase=j<3&&baseShown<24;
   if(isInBase){baseShown++;continue;}
   const fieldCount=tab.sections.reduce((n,s)=>n+s.fields.length,0),total=Math.max(1,Math.ceil(fieldCount/10));
   for(let k=0;k<total;k++)pages.push(formContinuation(form,tab,k,total));
  }
 }
 return pages;
}
async function pptx(report,opts){
 const output=await basePptx(report,opts),visuals=report.visuals||[];
 if(!visuals.length)return output;
 const zip=await root.JSZip.loadAsync(await output.arrayBuffer());
 const slides=Object.keys(zip.files).filter(p=>/^ppt\/slides\/slide\d+\.xml$/.test(p));let count=slides.length;
 let pres=await zip.file('ppt/presentation.xml').async('string'),rel=await zip.file('ppt/_rels/presentation.xml.rels').async('string'),ct=await zip.file('[Content_Types].xml').async('string');
 let omitted=0;const limit=Infinity;
 for(const item of [...visuals.flatMap(v=>pagesFor(v,opts?.theme)),...additionalFormPages(report)]){
  if(count>=limit){omitted++;continue;}
  count++;
  zip.file(`ppt/slides/slide${count}.xml`,slide(item.title,item.subtitle,item.items,item.links,opts?.theme,count));
  zip.file(`ppt/slides/_rels/slide${count}.xml.rels`,`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`);
  pres=pres.replace('</p:sldIdLst>',`<p:sldId id="${256+count-1}" r:id="rId${count+1}"/></p:sldIdLst>`);
  rel=rel.replace('</Relationships>',`<Relationship Id="rId${count+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${count}.xml"/></Relationships>`);
  ct=ct.replace('</Types>',`<Override PartName="/ppt/slides/slide${count}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>`);
 }
 if(omitted){
  // Ensure the user is not left with a silent suggestion that all diagrams were included.
  zip.file('ppt/diagram-coverage.txt',`${omitted} diagram continuation slide(s) were omitted after the ${limit}-slide technical export limit. Use editable DOCX and the flow inventory for full available metadata.`);
 }
 zip.file('ppt/presentation.xml',pres);zip.file('ppt/_rels/presentation.xml.rels',rel);zip.file('[Content_Types].xml',ct);
 return zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
}
office.docx=docx;
office.pptx=pptx;
})(globalThis);
