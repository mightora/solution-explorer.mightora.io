/* Mightora Office exports — fully client-side, no CDN. Native Office text, tables, shapes and lines. */
(function(root){
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c])).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'');
const compact=(x,n=500)=>String(x??'').replace(/[\r\n\t]+/g,' ').slice(0,n);
const ns='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const xmlhead='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const docMain='application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml';
const pptMain='application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml';
const officeRel='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const packageRel='http://schemas.openxmlformats.org/package/2006/relationships';
const themes={
 mightora:{primary:'6957DB',accent:'20A997',ink:'192444',muted:'54627B',background:'FFFFFF',soft:'F2F0FE',font:'Aptos'},
 light:{primary:'304E7B',accent:'267A8F',ink:'1B2739',muted:'57667B',background:'FFFFFF',soft:'EEF3F8',font:'Aptos'},
 dark:{primary:'9C91F5',accent:'50D4C8',ink:'F7F8FE',muted:'C2CCE1',background:'151D32',soft:'263452',font:'Aptos'}
};
const selectTheme=opts=>{let t={...(themes[opts?.theme]||themes.mightora)};if(opts?.font)t.font=String(opts.font).replace(/[^a-zA-Z0-9 -]/g,'').slice(0,35)||t.font;return t;};
const commonProps=()=>({'docProps/core.xml':`${xmlhead}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"><dc:creator>Mightora Solution Explorer</dc:creator><cp:lastModifiedBy>Mightora Solution Explorer</cp:lastModifiedBy></cp:coreProperties>`,
'docProps/app.xml':`${xmlhead}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Mightora Solution Explorer</Application></Properties>`});
function rels(entries){return `${xmlhead}<Relationships xmlns="${packageRel}">${entries.map(([id,type,target])=>`<Relationship Id="${id}" Type="${officeRel}/${type}" Target="${target}"/>`).join('')}</Relationships>`;}
function wRun(s,weight=false,colour=''){return `<w:r><w:rPr>${weight?'<w:b/>':''}${colour?`<w:color w:val="${colour}"/>`:''}</w:rPr><w:t xml:space="preserve">${esc(compact(s,3500))}</w:t></w:r>`;}
function wPara(s,style='',weight=false){return `<w:p>${style?`<w:pPr><w:pStyle w:val="${style}"/></w:pPr>`:''}${wRun(s,weight)}</w:p>`;}
function wCell(s,width,opts={}){return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:shd w:fill="${opts.head?'ECEAFE':'FFFFFF'}"/></w:tcPr>${wPara(s,'',!!opts.head)}</w:tc>`;}
function wordTable(rows,head=true){if(!rows.length)return wPara('No relevant components were found in the exported metadata.');
 const col=rows[0].length,width=Math.floor(9500/col);
 return `<w:tbl><w:tblPr><w:tblW w:w="9500" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="5" w:color="D9DFEB"/><w:left w:val="single" w:sz="5" w:color="D9DFEB"/><w:bottom w:val="single" w:sz="5" w:color="D9DFEB"/><w:right w:val="single" w:sz="5" w:color="D9DFEB"/><w:insideH w:val="single" w:sz="4" w:color="E9ECF2"/></w:tblBorders></w:tblPr><w:tblGrid>${rows[0].map(()=>`<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>${rows.map((row,i)=>`<w:tr>${(i===0&&head)?'<w:trPr><w:tblHeader w:val="true"/></w:trPr>':''}${row.map(v=>wCell(v,width,{head:i===0&&head})).join('')}</w:tr>`).join('')}</w:tbl>`;
}
function diagramWord(d){let output=wPara(d.title,'Heading2');output+=wPara(d.note);
 if(!d.links.length)return output+wPara('No relationships with both endpoints identified in this exported package.');
 output+=wPara('Editable relationship map: source → relationship → target. All values are editable Word table cells.');
 for(const link of d.links.slice(0,100)){
  output+=wordTable([[link.source,'→',link.target],[link.name,link.kind||'Relationship','Discovered metadata']],false);
  output+=wPara('');
 }
 if(d.links.length>100)output+=wPara(`${d.links.length-100} additional relationships are included in the relationship inventory but omitted from this visual map to keep the document manageable.`);
 return output;
}
async function docx(report,opts={}){
 if(!root.JSZip)throw Error('ZIP library not loaded.');const zip=new root.JSZip(),color=selectTheme(opts);
 let content=wPara('MIGHTORA  /  SOLUTION EXPLORER','Eyebrow')+wPara(report.title,'Title')+wPara(report.subtitle,'Subtitle')+wPara('Generated '+report.generated+'  •  Client-side metadata report');
 content+=wPara('Contents','Heading1');for(const s of report.sections)content+=wPara(s.title,'ContentsItem');
 for(const s of report.sections){
  content+=wPara(s.title,'Heading1');if(s.note)content+=wPara(s.note);
  for(const p of s.paragraphs||[])content+=wPara(p);
  for(const t of s.tables||[]){content+=wPara(t.title,'Heading2');content+=wordTable([t.headers,...t.rows]);}
 }
 if(report.diagrams?.length){content+=wPara('Editable relationship diagrams','Heading1');for(const d of report.diagrams)content+=diagramWord(d);}
 content+=wPara('Evidence and interpretation','Heading1')+wPara('This documentation records what the offline/online Solution Explorer extracted from the selected export(s). It does not prove completeness, runtime compatibility, data migrations or production readiness. Validate findings against Microsoft Power Platform and the deployed environment.');
 const styles=`${xmlhead}<w:styles ${ns}><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="${esc(color.font)}" w:hAnsi="${esc(color.font)}"/><w:sz w:val="19"/><w:color w:val="34425C"/></w:rPr><w:pPr><w:spacing w:after="100"/></w:pPr></w:style>
 <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="38"/><w:color w:val="${color.primary}"/></w:rPr></w:style>
 <w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:rPr><w:sz w:val="26"/><w:color w:val="${color.muted}"/></w:rPr></w:style>
 <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="360" w:after="150"/></w:pPr><w:rPr><w:b/><w:sz w:val="29"/><w:color w:val="${color.primary}"/></w:rPr></w:style>
 <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="220" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="${color.primary}"/></w:rPr></w:style>
 <w:style w:type="paragraph" w:styleId="Eyebrow"><w:name w:val="Eyebrow"/><w:rPr><w:b/><w:sz w:val="17"/><w:color w:val="${color.accent}"/></w:rPr></w:style>
 <w:style w:type="paragraph" w:styleId="ContentsItem"><w:name w:val="ContentsItem"/><w:rPr><w:sz w:val="19"/></w:rPr></w:style></w:styles>`;
 zip.file('[Content_Types].xml',`${xmlhead}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="${docMain}"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`);
 zip.file('_rels/.rels',rels([['rId1','officeDocument','word/document.xml'],['rId2','metadata/core-properties','docProps/core.xml'],['rId3','extended-properties','docProps/app.xml']]));
 zip.file('word/_rels/document.xml.rels',rels([['rId1','styles','styles.xml']]));
 zip.file('word/styles.xml',styles);
 zip.file('word/document.xml',`${xmlhead}<w:document ${ns}><w:body>${content}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1050" w:bottom="950" w:left="1050"/></w:sectPr></w:body></w:document>`);
 const props=commonProps();for(const [p,v] of Object.entries(props))zip.file(p,v);
 return zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
}
const I=x=>Math.round(x*914400);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function pText(s,size=16,fill='243453',bold=false,align='l'){
 const text=esc(compact(s,270));
 return `<a:p><a:pPr algn="${align}"/><a:r><a:rPr lang="en-GB" sz="${Math.round(size*100)}"${bold?' b="1"':''}><a:solidFill><a:srgbClr val="${fill}"/></a:solidFill></a:rPr><a:t>${text}</a:t></a:r><a:endParaRPr lang="en-GB"/></a:p>`;
}
function shape(id,name,x,y,w,h,opts={}){
 const fill=opts.fill||'FFFFFF',stroke=opts.stroke||fill,lines=String(opts.text??'').split('\n');
 return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${esc(name)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${I(x)}" y="${I(y)}"/><a:ext cx="${I(w)}" cy="${I(h)}"/></a:xfrm><a:prstGeom prst="${opts.geometry||'rect'}"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${fill}"/></a:solidFill><a:ln w="${opts.lineWidth||7000}"><a:solidFill><a:srgbClr val="${stroke}"/></a:solidFill></a:ln></p:spPr><p:txBody><a:bodyPr wrap="square" anchor="ctr" lIns="${I(opts.pad??0.08)}" rIns="${I(opts.pad??0.08)}" tIns="${I(0.02)}" bIns="${I(0.02)}"/><a:lstStyle/>${lines.map(l=>pText(l,opts.size||14,opts.color||'243453',!!opts.bold,opts.align||'l')).join('')}</p:txBody></p:sp>`;
}
function line(id,x1,y1,x2,y2,color='B5BDD0'){
 const x=Math.min(x1,x2),y=Math.min(y1,y2),w=Math.abs(x2-x1),h=Math.abs(y2-y1);
 return `<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="${id}" name="Relationship connector ${id}"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm${(x1>x2)!==(y1>y2)?' flipH="1"':''}><a:off x="${I(x)}" y="${I(y)}"/><a:ext cx="${Math.max(1,I(w))}" cy="${Math.max(1,I(h))}"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="18000"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:tailEnd type="none"/><a:headEnd type="triangle"/></a:ln></p:spPr><p:style><a:lnRef idx="0"><a:schemeClr val="accent1"/></a:lnRef><a:fillRef idx="0"><a:schemeClr val="accent1"/></a:fillRef><a:effectRef idx="0"><a:schemeClr val="accent1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></p:style></p:cxnSp>`;
}
function makeSlide(title,subtitle,content,theme,index){
 let shapes='',id=2;
 function rect(name,x,y,w,h,opts){shapes+=shape(id++,name,x,y,w,h,opts);}
 const dark=theme.background!=='FFFFFF';
 rect('Background',0,0,13.333,7.5,{fill:theme.background,stroke:theme.background});
 rect('Top accent',0,0,13.333,.12,{fill:theme.primary,stroke:theme.primary});
 rect('Slide title',.58,.34,11.9,.64,{text:title,size:23,bold:true,color:theme.ink,fill:theme.background,stroke:theme.background});
 if(subtitle)rect('Slide subtitle',.6,1.08,12.1,.46,{text:subtitle,size:11.5,color:theme.muted,fill:theme.background,stroke:theme.background});
 content((type,props)=>type==='shape'?rect(...props):type==='line'?(shapes+=line(id++,...props)):null,theme);
 rect('Footer',.55,7.17,11.5,.18,{text:'MIGHTORA  /  SOLUTION EXPLORER   •   Editable PowerPoint report',size:8,color:theme.muted,fill:theme.background,stroke:theme.background});
 rect('Page',12.55,7.17,.35,.2,{text:String(index),size:8,color:theme.muted,align:'r',fill:theme.background,stroke:theme.background});
 return `${xmlhead}<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${officeRel}" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${shapes}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}
function contentsPage(title,description,rows,t,position){return makeSlide(title,description,(put,theme)=>{
  let y=1.63;
  for(const r of rows){if(y>6.68)break;
   put('shape',['Detail row',.6,y,12.1,.59,{fill:theme.soft,stroke:theme.soft,text:compact(r,170),size:13,color:theme.ink,pad:.13}]);y+=.69;
  }
 },t,position);
}
function tabularPage(sectionTitle,tab,chunk,part,total,t,position){return makeSlide(sectionTitle,`${tab.title}${total>1?` · page ${part+1}/${total}`:''}`,(put,theme)=>{
 const headers=tab.headers.slice(0,6),n=headers.length,colW=11.95/n;
 for(let c=0;c<n;c++)put('shape',['Header '+c,.63+c*colW,1.75,colW-.03,.44,{fill:theme.primary,stroke:theme.primary,text:headers[c],size:10,color:t.background==='FFFFFF'?'FFFFFF':'171B32',bold:true,pad:.05}]);
 chunk.forEach((row,i)=>{let y=2.27+i*.56;for(let c=0;c<n;c++)put('shape',[`Table cell ${i+1}.${c+1}`,.63+c*colW,y,colW-.03,.52,{fill:i%2===0?theme.soft:theme.background,stroke:theme.soft,text:compact(row[c]||'—',n>4?45:90),size:n>4?9:10.5,color:theme.ink,pad:.05}]);});
 },t,position);
}
function diagramPage(diag,chunk,part,total,t,position){const nodes=chunk;
 const pos=new Map(nodes.map((n,i)=>[n,{x:.7+(i%4)*3.12,y:1.8+Math.floor(i/4)*1.9}]));
 return makeSlide(diag.title,`Editable relationship diagram${total>1?` · part ${part+1}/${total}`:''} · lines connect documented endpoints`,(put,theme)=>{
  for(const l of diag.links){const a=pos.get(l.source),b=pos.get(l.target);if(!a||!b||a===b)continue;
   put('line',[a.x+1.2,a.y+.38,b.x+1.2,b.y+.38,theme.accent]);
  }
  for(const n of nodes){const p=pos.get(n);put('shape',[`Entity ${n}`,p.x,p.y,2.44,.75,{fill:theme.soft,stroke:theme.primary,text:n,size:12,bold:true,color:theme.ink,pad:.12}]);}
 },t,position);
}
// Editable form wireframe pages: every label, input outline and section is a native PowerPoint shape.
function formLayoutPage(form,tab,t,position){
 return makeSlide('Form preview — '+form.name, (form.side?form.side+' · ':'')+form.table+' · '+tab.name+' · structural wireframe',(put,theme)=>{
   const sections=(tab.sections||[]).slice(0,4);
   const positions=[[.68,1.7],[6.8,1.7],[.68,4.25],[6.8,4.25]];
   for(let i=0;i<sections.length;i++){
    const sec=sections[i],p=positions[i],x=p[0],y=p[1],w=5.84;
    put('shape',['Section '+sec.name,x,y,w,.35,{text:sec.name,size:12,bold:true,color:theme.ink,fill:theme.soft,stroke:theme.primary,pad:.09}]);
    let shown=0;
    for(const f of sec.fields.slice(0,4)){
      let ty=y+.40+shown*.43;
      put('shape',['Label '+f.label,x+.10,ty,1.85,.32,{text:f.label,size:9.5,color:theme.ink,fill:theme.background,stroke:theme.background,pad:.03}]);
      put('shape',['Editable '+f.kind+' '+(f.field||''),x+2.0,ty,3.65,.32,{text:f.kind==='Field'?f.field:f.kind,size:9,color:theme.muted,fill:theme.background,stroke:theme.muted,pad:.04}]);
      shown++;
    }
    if(sec.fields.length>4)put('shape',['Additional controls',x+.12,y+2.16,w-.24,.18,{text:`+${sec.fields.length-4} additional controls described in the DOCX`,size:8,color:theme.muted,fill:theme.background,stroke:theme.background}]);
   }
 },t,position);
}
async function pptx(report,opts={}){
 if(!root.JSZip)throw Error('ZIP library not loaded.');const theme=selectTheme(opts),pages=[];
 const add=(s)=>{if(pages.length<225)pages.push(s);};
 add(makeSlide(report.title,report.subtitle,(put,t)=>{
 put('shape',['Report type',.9,2.0,11.5,1.0,{text:report.mode==='comparison'?'SOLUTION CHANGE ASSESSMENT':'SOLUTION TECHNICAL DOCUMENTATION',size:21,bold:true,color:t.primary,fill:t.background,stroke:t.background}]);
 put('shape',['Info',.9,3.05,10.5,1.4,{text:'Prepared locally from exported solution metadata.\nEditable native shapes, tables and relationship maps.',size:18,color:t.ink,fill:t.background,stroke:t.background}]);
 },theme,1));
 add(contentsPage('Report contents','Each table, label and diagram can be edited directly in PowerPoint.',report.sections.map(s=>s.title).slice(0,8),theme,pages.length+1));
 for(const section of report.sections){if(pages.length>=220)break;
  let intro=[section.note,...section.paragraphs].filter(Boolean);
  if(intro.length)add(contentsPage(section.title,'Documentation scope and notes',intro.slice(0,8),theme,pages.length+1));
  for(const tab of section.tables){
   if(!tab.rows.length){add(contentsPage(section.title,tab.title,['No corresponding metadata was extracted from the supplied solution export.'],theme,pages.length+1));continue;}
   const size=8,total=Math.ceil(tab.rows.length/size);
   for(let i=0;i<total;i++){if(pages.length>=220)break;add(tabularPage(section.title,tab,tab.rows.slice(i*size,(i+1)*size),i,total,theme,pages.length+1));}
  }
 }
 for(const diag of report.diagrams||[]){if(pages.length>=220)break;
  if(!diag.entities.length||!diag.links.length){add(contentsPage(diag.title,'Editable relationship diagram',['No complete relationship endpoints were extracted from this export.'],theme,pages.length+1));continue;}
  // Group diagram nodes by documented connections. The full connection list appears separately in the editable inventory tables.
  const nodes=[...new Set(diag.links.flatMap(l=>[l.source,l.target]))].slice(0,64),parts=Math.ceil(nodes.length/8);
  for(let i=0;i<parts;i++){if(pages.length>=220)break;add(diagramPage(diag,nodes.slice(i*8,(i+1)*8),i,parts,theme,pages.length+1));}
 }
 // Form previews use editable PowerPoint shapes, not screenshots.
 let formPages=0;
 for(const form of report.forms||[]){
  if(pages.length>=220||formPages>=24)break;
  for(const tab of (form.tabs||[]).slice(0,3)){
   if(pages.length>=220||formPages>=24)break;
   add(formLayoutPage(form,tab,theme,pages.length+1));formPages++;
  }
 }
 if(pages.length>=220)add(contentsPage('Presentation size limit','Some detail may be omitted to respect the 225-slide export limit. Download the DOCX or CSV for a longer report.',['Full metadata can be exported as JSON or CSV from Solution Explorer.'],theme,pages.length+1));
 const zip=new root.JSZip();
 const types=[`<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`,`<Default Extension="xml" ContentType="application/xml"/>`,`<Override PartName="/ppt/presentation.xml" ContentType="${pptMain}"/>`,`<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>`,`<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>`,`<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>`,`<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>`,`<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>`];
 for(let i=0;i<pages.length;i++){
  const n=i+1;zip.file(`ppt/slides/slide${n}.xml`,pages[i]);
  zip.file(`ppt/slides/_rels/slide${n}.xml.rels`,rels([['rId1','slideLayout','../slideLayouts/slideLayout1.xml']]));
  types.push(`<Override PartName="/ppt/slides/slide${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`);
 }
 zip.file('[Content_Types].xml',`${xmlhead}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${types.join('')}</Types>`);
 zip.file('_rels/.rels',rels([['rId1','officeDocument','ppt/presentation.xml'],['rId2','metadata/core-properties','docProps/core.xml'],['rId3','extended-properties','docProps/app.xml']]));
 zip.file('ppt/_rels/presentation.xml.rels',rels([['rId1','slideMaster','slideMasters/slideMaster1.xml'],...pages.map((_,i)=>[`rId${i+2}`,'slide',`slides/slide${i+1}.xml`]) ]));
 zip.file('ppt/presentation.xml',`${xmlhead}<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${officeRel}" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${pages.map((_,i)=>`<p:sldId id="${256+i}" r:id="rId${i+2}"/>`).join('')}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle/></p:presentation>`);
 zip.file('ppt/slideMasters/_rels/slideMaster1.xml.rels',rels([['rId1','slideLayout','../slideLayouts/slideLayout1.xml'],['rId2','theme','../theme/theme1.xml']]));
 zip.file('ppt/slideMasters/slideMaster1.xml',`${xmlhead}<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${officeRel}" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld name="Mightora technical report"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`);
 zip.file('ppt/slideLayouts/_rels/slideLayout1.xml.rels',rels([['rId1','slideMaster','../slideMasters/slideMaster1.xml']]));
 zip.file('ppt/slideLayouts/slideLayout1.xml',`${xmlhead}<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${officeRel}" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`);
 zip.file('ppt/theme/theme1.xml',`${xmlhead}<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Mightora"><a:themeElements><a:clrScheme name="Mightora"><a:dk1><a:srgbClr val="17223D"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="${theme.ink}"/></a:dk2><a:lt2><a:srgbClr val="F8F9FC"/></a:lt2><a:accent1><a:srgbClr val="${theme.primary}"/></a:accent1><a:accent2><a:srgbClr val="${theme.accent}"/></a:accent2><a:accent3><a:srgbClr val="536683"/></a:accent3><a:accent4><a:srgbClr val="A98BDD"/></a:accent4><a:accent5><a:srgbClr val="588BB6"/></a:accent5><a:accent6><a:srgbClr val="C99B6A"/></a:accent6><a:hlink><a:srgbClr val="6957DB"/></a:hlink><a:folHlink><a:srgbClr val="5847B8"/></a:folHlink></a:clrScheme><a:fontScheme name="Mightora"><a:majorFont><a:latin typeface="${esc(theme.font)}"/></a:majorFont><a:minorFont><a:latin typeface="${esc(theme.font)}"/></a:minorFont></a:fontScheme><a:fmtScheme name="Mightora"><a:fillStyleLst><a:solidFill><a:schemeClr val="accent1"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="accent1"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="lt1"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`);
 const props=commonProps();for(const [p,v] of Object.entries(props))zip.file(p,v);
 return zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
}
root.SolutionOffice={docx,pptx,themes};
})(globalThis);
