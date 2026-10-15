import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);const JSZip=require('../vendor/jszip.cjs');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const dist=path.join(root,'dist');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const write=(p,s)=>{const dest=path.join(dist,p);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,s);};
const copy=p=>{const dest=path.join(dist,p);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,p),dest);};
fs.rmSync(dist,{recursive:true,force:true});fs.mkdirSync(dist,{recursive:true});
// The online page is the single source of truth for application script order.
// This prevents the standalone HTML and offline ZIP from shipping stale runtime modules.
const sourcePage=read('index.html');
const scriptPaths=[...sourcePage.matchAll(/<script\s+src="((?:vendor|src)\/[A-Za-z0-9_./-]+\.js)"\s+defer><\/script>/g)].map(match=>match[1]);
if(!scriptPaths.includes('src/app.js')||!scriptPaths.includes('src/component-catalog.js')||!scriptPaths.includes('src/object-explorer.js')||!scriptPaths.includes('src/object-ui.js'))throw new Error('Offline build is missing a required application module.');
for(const p of ['index.html','src/styles.css',...scriptPaths,'LICENSE'])copy(p);
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
let page=sourcePage;
const styles=read('src/styles.css');
const js=scriptPaths.map(p=>read(p).replaceAll('</script','<\\/script')).join('\n;\n');

const offlineAuthorStyles=`
/* Standalone styles: mirror the upstream shared Mightora author/footer components without network. */
mightora-author{display:block;background:linear-gradient(110deg,#222e4d,#111827);background-size:cover;background-position:center}
.author-section-overlay{background:rgba(0,0,0,.45);padding:5rem 1.5rem}
.author-section-inner{max-width:780px;margin:0 auto;display:flex;gap:2rem;align-items:center}
.author-photos{display:flex;flex-direction:column;gap:1rem;align-items:center;flex-shrink:0}
.author-avatar{width:120px;height:120px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,.4)}
.author-blog-logo{width:110px;height:auto}
.author-heading{font-size:1.375rem;font-weight:800;color:#fff;margin:0 0 .75rem}
.author-bio{font-size:.9375rem;line-height:1.7;color:rgba(255,255,255,.88);margin:0 0 1.25rem}
.author-bio strong{color:#fff}
.author-links{display:flex;gap:.75rem;flex-wrap:wrap}
.author-link{display:inline-block;background:rgba(255,255,255,.15);color:#fff;text-decoration:none;padding:.4rem .875rem;border-radius:.375rem;font-size:.875rem;font-weight:600;border:1px solid rgba(255,255,255,.3)}
.author-link:hover{background:rgba(255,255,255,.28);color:#fff}
mightora-footer{display:block;background:#111827;color:rgba(255,255,255,.75);padding:3rem 0 0}
.footer-main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2rem;margin-bottom:2.5rem}
.footer-section-title{font-size:.8rem;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.5);font-weight:700;margin-bottom:.75rem}
.footer-links{list-style:none;display:flex;flex-direction:column;gap:.45rem;padding:0;margin:0}
.footer-links a{color:rgba(255,255,255,.65);font-size:.875rem;text-decoration:none}
.footer-links a:hover{color:white}
.footer-bottom{border-top:1px solid rgba(255,255,255,.1);padding:1.25rem 0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.75rem}
.footer-copy{font-size:.8rem;color:rgba(255,255,255,.4)}
.footer-copy a{color:rgba(255,255,255,.6)}
.footer-bottom-links{display:flex;gap:1rem}
@media(max-width:768px){.footer-main{grid-template-columns:1fr;gap:1.5rem}}
@media(max-width:600px){.author-section-inner{flex-direction:column;text-align:center}.author-links{justify-content:center}}
`;
const offlineCsp=`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; font-src data:; object-src 'none'; base-uri 'none'; form-action 'none'">`;
let offline=page.replace('<html lang="en-GB">','<html lang="en-GB" data-offline="true">').replace('<meta name="theme-color"',offlineCsp+'\n<meta name="theme-color"');
offline=offline.replace(/<!-- ONLINE_STYLES -->[\s\S]*?<!-- END_ONLINE_STYLES -->/,`<style>${styles}</style>\n<style>${offlineAuthorStyles}</style>`);
offline=offline.replace(/<!-- HEADER_FOOTER_PATCH -->[\s\S]*?<!-- END_HEADER_FOOTER_PATCH -->/,'');
offline=offline.replace(/<!-- ONLINE_SCRIPTS -->[\s\S]*?<!-- END_ONLINE_SCRIPTS -->/,`<script>${js}</script>`);
// Embed the exact approved Mightora header asset when it has been retrieved at build time.
// The CI workflow retrieves this public logo from the upstream Mightora source.
const brandFile=path.join(root,'assets/mightora-logo.png');
if(fs.existsSync(brandFile)){
  const logo=fs.readFileSync(brandFile).toString('base64');
  offline=offline.replace('<span class="logo-emblem">m</span><span>Mightora</span>',`<img src="data:image/png;base64,${logo}" width="140" height="32" alt="Mightora" style="width:140px;height:auto;max-height:34px;object-fit:contain">`);
} else console.warn('Official Mightora logo asset not present. Offline preview uses a text fallback; CI fetches the approved image.');
// Embed official author and brand imagery for the offline edition when fetched by CI.
// If unavailable in a developer's environment, show a local fallback rather than request a network resource.
const offlineAssets=[
 ['https://techtweedie.github.io/images/author/ian-tweedie-sq2_hu_a380911c6f4726de.png','assets/author-avatar.png'],
 ['https://raw.githubusercontent.com/TechTweedie/techtweedie.github.io/v2/assets/images/site/main-logo.png','assets/author-blog-logo.png']
];
for(const [url,relative] of offlineAssets){
  const asset=path.join(root,relative);
  if(fs.existsSync(asset)) offline=offline.replaceAll(url,'data:image/png;base64,'+fs.readFileSync(asset).toString('base64'));
}
offline=offline.replace(/<img src="https:\/\/techtweedie\.github\.io[^>]+>/g,'<span class="author-avatar" role="img" aria-label="Ian Tweedie" style="background:#ebe8fd;display:grid;place-items:center;color:#6654cc;font-weight:850;font-size:23px">IT</span>');
offline=offline.replace(/<img src="https:\/\/raw\.githubusercontent\.com\/TechTweedie[^>]+>/g,'');
// A static offline app cannot make live badge requests; preserve source links without faking status.
offline=offline.replace(/<img src="https:\/\/(?:github\.com|img\.shields\.io)[^"]+" alt="([^"]+)" height="20" loading="lazy">/g,(_match,alt)=>'<span class="offline-evidence-label">'+alt+' ↗</span>');
offline=offline.replace('Badge status is supplied by GitHub or Shields.io, not self-certified by Mightora.','Online badge status is supplied by GitHub or Shields.io. Offline links are for optional verification, not live statuses.');
// Offline footer displays local navigation; online remains powered by the shared YAML component.
offline=offline.replace('<mightora-footer>', '<mightora-footer><div class="container"><div class="footer-main"><div><div class="footer-section-title">Explore</div><ul class="footer-links"><li><a href="#workspace">Workspace</a></li><li><a href="#examples">Sample solutions</a></li><li><a href="#comparison">Compare versions</a></li></ul></div><div><div class="footer-section-title">Mightora</div><ul class="footer-links"><li><a href="https://mightora.io">Mightora.io ↗</a></li><li><a href="https://techtweedie.github.io">TechTweedie ↗</a></li></ul></div><div><div class="footer-section-title">Project information</div><ul class="footer-links"><li><a href="https://github.com/mightora/solution-explorer.mightora.io">Source on GitHub ↗</a></li><li><a href="https://github.com/mightora/solution-explorer.mightora.io/blob/main/LICENSE">MIT licence ↗</a></li></ul></div></div></div>');
const authorBackground=path.join(root,'assets/author-background.png');
if(fs.existsSync(authorBackground)){
 const bg='data:image/png;base64,'+fs.readFileSync(authorBackground).toString('base64');
 offline=offline.replace('</style>\\n<style>${offlineAuthorStyles}</style>', '</style>\\n<style>${offlineAuthorStyles}</style>'); // Background is injected below.
 offline=offline.replace('</head>', '<style>mightora-author{background-image:url("'+bg+'")}</style></head>');
}
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
