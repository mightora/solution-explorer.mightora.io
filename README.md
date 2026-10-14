# Mightora Solution Explorer

**Inspect. Understand. Compare.** A free, MIT-licensed Dataverse solution ZIP explorer designed to run entirely in your browser.

Live site (once deployed): https://solution-explorer.mightora.io

## Features

- Drag and drop **managed or unmanaged Dataverse solution export ZIPs**.
- Browse **tables, columns, relationships, cloud flows, classic workflows, web resources, environment variable definitions, connection references, apps, forms and views** where metadata is available.
- Search and filter components, inspect properties, export inventories as **JSON or CSV**.
- Produce self-contained **SVG** diagrams and **Mermaid** text for a data model, component landscape or flow integrations.
- Load a second ZIP for **component-level change detection** (added, removed, changed, unchanged) and export a change report.
- Use synthetic sample solutions without uploading customer files.
- Download **fully offline HTML** or a **standalone offline ZIP**, generated from the same sources as the online app.
- Inspect resource origins using the **Network Transparency** panel and your browser Developer Tools.

## Local development

```bash
npm run check
python3 -m http.server 8080 --directory dist
```

Then browse to http://localhost:8080. There are no runtime npm dependencies, build service or API.

## Deploying to GitHub Pages

1. Create a **public** repository named `mightora/solution-explorer.mightora.io`.
2. Push these files to `main`.
3. In **Settings → Pages**, set Build and deployment source to **GitHub Actions**.
4. Configure the custom domain DNS record for `solution-explorer.mightora.io` to point at your Pages host, then enable **Enforce HTTPS** when offered.
5. Workflow `.github/workflows/pages.yml` builds and deploys `dist` on `main`.

**Do not commit customer solution exports.** Use the synthetic demo and self-authored test fixtures instead.

## Privacy & security

All ZIP reading, XML/JSON parsing, diagram generation, comparison and export run in the current browser tab. No ZIP contents are sent to an application server. The online edition makes requests for Mightora shared UI and brand assets; the offline edition embeds its assets and blocks network access with a restrictive Content Security Policy. It deliberately excludes environment-variable values from the parsed model and exports. The in-page resource monitor is partial; verify requests independently with F12 → Network → Preserve log.

ZIPs are subject to size, entry count and decompressed-size limits; XML/JSON is parsed as data and never executed. See [LIMITATIONS.md](LIMITATIONS.md) for scope and caveats.

## Project layout

```text
index.html                  Website and search-engine metadata
src/parser.js               Dataverse XML/JSON extraction and comparison
src/diagrams.js             Local SVG diagram generator
src/samples.js              Synthetic demonstration solutions
src/app.js                  Browser UI, ZIP ingestion and exports
src/styles.css              Mightora-aligned responsive UI
vendor/jszip.min.js         Local vendored JSZip (MIT)
scripts/build.mjs           Builds Pages site and standalone offline HTML/ZIP
tests/                      Parsing, comparison and release integrity tests
.github/workflows/          CI, CodeQL and GitHub Pages deployment
```

The online page uses required Mightora shared web components. The downloaded HTML uses local styled fallbacks so it remains functional without external scripts. CI retrieves and embeds the **official full Mightora logo**; in network-restricted development environments without `assets/mightora-logo.png`, an offline text fallback is used until the build has access to that asset. Badge links point to **actual repository files/workflows**, not self-declared scan results.

## Licence and attribution

MIT — [LICENSE](LICENSE). JSZip is MIT-licensed (Stuk.github.io/jszip), with its licence included under `vendor/JSZIP-LICENSE.md`. A vendored test-only XML DOM parser also retains its upstream MIT licence under `tests/support/xmldom/LICENSE`.
