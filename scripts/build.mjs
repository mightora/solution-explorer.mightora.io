import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);const JSZip=require('../vendor/jszip.cjs');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const dist=path.join(root,'dist');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const write=(p,s)=>{const dest=path.join(dist,p);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,s);};
const copy=p=>{const dest=path.join(dist,p);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,p),dest);};
fs.rmSync(dist,{recursive:true,force:true});fs.mkdirSync(dist,{recursive:true});
for(const p of ['index.html','src/styles.css','src/parser.js','src/samples.js','src/diagrams.js','src/app.js','vendor/jszip.min.js','LICENSE'])copy(p);
// Produce downloadable teaching ZIPs from the exact same sample definitions used in the browser.
const sampleScope={};sampleScope.globalThis=sampleScope;
vm.runInNewContext(read('src/samples.js'),sampleScope,{filename:'src/samples.js'});
for(const sample of sampleScope.SolutionSamples.catalog){
 const packageZip=new JSZip();
 for(const [name,contents] of sampleScope.SolutionSamples.files(sample.id))packageZip.file(name,contents);
 const bytes=await packageZip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});
 write(`examples/${sample.id}-demo.zip`,bytes);
}
write('examples/README.txt','Mightora Solution Explorer - fictional teaching ZIPs\nThese files mimic metadata structures for trying the explorer. They are NOT Dataverse import packages, nor Microsoft-certified exports.\n');
let page=read('index.html');
const styles=read('src/styles.css');const scriptPaths=['vendor/jszip.min.js','src/parser.js','src/samples.js','src/diagrams.js','src/app.js'];
const js=scriptPaths.map(p=>read(p).replaceAll('</script','<\\/script')).join('\n;\n');
const offlineCsp=`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; font-src data:; object-src 'none'; base-uri 'none'; form-action 'none'">`;
let offline=page.replace('<html lang="en-GB">','<html lang="en-GB" data-offline="true">').replace('<meta name="theme-color"',offlineCsp+'\n<meta name="theme-color"');
offline=offline.replace(/<!-- ONLINE_STYLES -->[\s\S]*?<!-- END_ONLINE_STYLES -->/,`<style>${styles}</style>\n<style>mightora-header .local-header,mightora-footer .local-footer{display:flex}mightora-author .author-section-inner{display:flex}a[href^="http"]:hover{opacity:.9}</style>`);
offline=offline.replace(/<!-- HEADER_FOOTER_PATCH -->[\s\S]*?<!-- END_HEADER_FOOTER_PATCH -->/,'');
offline=offline.replace(/<!-- ONLINE_SCRIPTS -->[\s\S]*?<!-- END_ONLINE_SCRIPTS -->/,`<script>${js}</script>`);
// Embed the exact approved Mightora header asset when it has been retrieved at build time.
// The CI workflow retrieves this public logo from the upstream Mightora source.
const brandFile=path.join(root,'assets/mightora-logo.png');
if(fs.existsSync(brandFile)){
  const logo=fs.readFileSync(brandFile).toString('base64');
  offline=offline.replace('<span class="logo-emblem">m</span><span>Mightora</span>',`<img src="data:image/png;base64,${logo}" width="140" height="32" alt="Mightora" style="width:140px;height:auto;max-height:34px;object-fit:contain">`);
} else console.warn('Official Mightora logo asset not present. Offline preview uses a text fallback; CI fetches the approved image.');
offline=offline.replace(/<img src="https:\/\/techtweedie\.github\.io[^>]+>/g,'<span class="author-avatar" role="img" aria-label="TechTweedie author profile" style="background:#ebe8fd;display:grid;place-items:center;color:#6654cc;font-weight:850;font-size:23px">IT</span>');
offline=offline.replace(/<img src="https:\/\/raw\.githubusercontent\.com\/TechTweedie[^>]+>/g,'');
offline=offline.replace(/<a class="btn btn-outline" id="offline-html-link"[^>]+>Offline HTML ↓<\/a>/g,'').replace(/<a class="btn btn-primary" id="offline-zip-link"[^>]+>Offline ZIP ↓<\/a>/g,'');
// Ensure strict, no-remote CSP doesn't block local release by fetching linked canonical metadata.
write('downloads/solution-explorer-offline.html',offline);
const license=read('LICENSE');const readme=`Mightora Solution Explorer — Offline Edition\n==========================================\n\n1. Extract this ZIP.\n2. Double-click index.html on Windows, macOS, or Linux.\n3. Load your Dataverse solution ZIP (no internet or installation required).\n4. Work with metadata, diagrams, comparisons and exports entirely within your browser.\n\nThis is the same application code used by the online edition.\nNetwork access is blocked by the offline page's Content Security Policy.\nNo data, secrets, or telemetry is transmitted.\n\nLimitations: This release targets standard XML-based Dataverse solution exports.\nThe source control YAML format is not fully supported. Solution metadata may\nbe partial, and comparisons represent supported metadata fields rather than\nsemantic analysis of every component's source code.\n\nOriginal project: https://github.com/mightora/solution-explorer.mightora.io\nLicence: MIT — see LICENSE\n`;
write('downloads/README.txt',readme);
const zip=new JSZip();zip.file('index.html',offline);zip.file('README.txt',readme);zip.file('LICENSE',license);const data=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:8}});write('downloads/solution-explorer-offline.zip',data);
// Keep real evidence links as links; never fabricate pass/fail status badges.
write('.nojekyll','');write('robots.txt','User-agent: *\nAllow: /\nSitemap: https://solution-explorer.mightora.io/sitemap.xml\n');
write('sitemap.xml','<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://solution-explorer.mightora.io/</loc></url></urlset>');
write('CNAME','solution-explorer.mightora.io\n');
console.log(`Built ${path.relative(root,dist)}: online app + ${(data.length/1024).toFixed(1)} KB standalone offline ZIP`);
