# Mightora Solution Explorer

**Inspect. Understand. Compare.** A free, MIT-licensed Dataverse solution ZIP explorer designed to run entirely in your browser.

Live site (once deployed): https://solution-explorer.mightora.io

## Features

- Discover extended component families: roles and privileges, field security, BPFs, custom APIs, plug-ins and images, PCF controls, choices and keys, charts, dashboards, commands/ribbon, connectors and webhooks, SLAs and routing, templates, duplicate detection, data maps, offline profiles, Power Pages, Copilot Studio and AI assets. Manifest-only entries are labelled **Discovered**, while unsupported type codes are shown explicitly.
- Review declared missing dependencies and distinguish **Inspected**, **Discovered**, **Referenced** and **Unsupported** metadata.
- Open pre-filled GitHub issue forms for parser defects and feature requests without uploading your files.


- Drag and drop **managed or unmanaged Dataverse solution export ZIPs**.
- Browse **tables, columns, relationships, cloud flows, classic workflows, web resources, environment variable definitions, connection references, apps, forms and views** where metadata is available.
- Search and filter components, inspect properties, export inventories as **JSON or CSV**.
- Produce self-contained **SVG** diagrams and **Mermaid** text for a data model, component landscape or flow integrations.
- Load a second ZIP for **component-level change detection** (added, removed, changed, unchanged) and export a change report.
- Explore **five fictional teaching ZIPs**, including project tracker versions v1.0/v1.1 for comparison and a deliberately managed example for recovery guidance. Each example can be loaded directly or downloaded to test ZIP ingestion; builds also publish them under `examples/`.
- Compare **two independently loaded ZIPs (A → B)**, drill into before/after properties, reverse direction and export JSON/CSV change reports.
- Assess managed solutions with an **exportable recovery checklist**. This does not convert or create an unmanaged import package.
- Download **fully offline HTML** or a **standalone offline ZIP**, generated from the same sources as the online app.
- Inspect resource origins using the **Network Transparency** panel and your browser Developer Tools.

## Example ZIPs

The gallery includes Project Tracker v1.0, Project Tracker v1.1, Service Desk (managed teaching example), Grant Applications, and Volunteer Events. All five packages are entirely fictional and **not importable into Dataverse**. They contain illustrative XML/JSON to exercise the explorer parser. The live download routes are `/examples/<id>-demo.zip`; offline HTML can generate the same files without network access.

For authentic Microsoft-created solutions, use [Microsoft Copilot Studio Samples](https://github.com/microsoft/CopilotStudioSamples). These projects have different coverage and must be reviewed before import or use.

## Managed/unmanaged limitation

**Managed solutions cannot be directly converted into unmanaged solutions by editing a ZIP or using SolutionPackager.** Microsoft's supported ALM workflow is to retain the original unmanaged solution in the development environment, then export it as required. This tool offers read-only analysis, a component inventory, and a recovery assessment/checklist to help locate original source or plan an authorised rebuild. It never produces a purported converted ZIP. See [Microsoft's SolutionPackager documentation](https://learn.microsoft.com/power-platform/alm/solution-packager-tool).

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

## Shared footer, author and evidence badges

The online site uses the official `mightora-author` and `mightora-footer` components, with shared stylesheet and live YAML footer navigation. The author includes the prescribed portrait, biography and links. Directly above the footer are real GitHub Actions status badges for CI, CodeQL and Pages, plus dynamic repository licence and latest-commit badges sourced through Shields.io. The offline edition replaces external status images with non-live evidence links so it works without network requests; it retains a locally styled footer and author section.

## Power Automate Flow Explorer

Upload a Dataverse solution ZIP to see the flow definitions in its `Workflows/*.json` files, or open a standalone exported flow JSON. The Flow Explorer maps triggers, actions, conditions, loops, scopes, switch cases, branch nesting, and explicit `runAfter` dependencies. Click nodes to inspect allowlisted metadata, then download SVG, Mermaid, or sanitized JSON. A branching demo is included. Everything runs in the browser and the same feature works offline. Sensitive parameter values, literal expressions, access tokens, and connection credentials are intentionally not retained or exported. Diagram traversal is capped at 250 steps and display at 140.

The **Component showcase · full architecture** package is a fictional test case covering plug-ins, roles, choices, custom APIs, controls, integrations, Power Pages, Copilot topics, AI and missing dependencies. It is not importable into Dataverse.
