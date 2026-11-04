# Mightora Solution Explorer

**Inspect. Understand. Compare.** A free, MIT-licensed Power Platform solution explorer that runs entirely in your browser. Open exported ZIPs or supported unpacked XML/YAML source-control folders.

Live site (once deployed): https://solution-explorer.mightora.io

## Features

- Inspect traditional Dataverse XML solutions alongside Microsoft YAML source-control manifests and selected YAML component definitions. ZIP upload remains supported; use the local folder picker for unpacked repositories. Multi-solution folders select the first manifest with a visible warning.
- Generate a shared evidence-backed documentation record for every recognised object: seven plain-English questions, technical properties, direct references, data interactions, confidence, risks, source locations and explicit missing information.
- Explore seven architecture evidence inventories: Execution impact, Data lineage, Application architecture, Security privileges, Integrations, Dependencies and potential automation cycles. Export each map to CSV or include all seven in editable full-solution Word/PowerPoint reports.
- Inspect modern flow YAML where a WDL definition with triggers/actions is packaged. Existing JSON flow inspection and column-matched feedback-loop analysis remain available.
- See the [51-family coverage matrix and remaining gaps](COVERAGE.md). Recognition is not a claim of universal support or observed runtime behaviour.

- Discover extended component families: roles and privileges, field security, BPFs, custom APIs, plug-ins and images, PCF controls, choices and keys, charts, dashboards, commands/ribbon, connectors and webhooks, SLAs and routing, templates, duplicate detection, data maps, offline profiles, Power Pages, Copilot Studio and AI assets. Manifest-only entries are labelled **Discovered**, while unsupported type codes are shown explicitly.
- Review declared missing dependencies and distinguish **Inspected**, **Discovered**, **Referenced** and **Unsupported** metadata.
- Open pre-filled GitHub issue forms for parser defects and feature requests without uploading your files.


- Drag and drop **managed or unmanaged Dataverse solution export ZIPs**.
- Browse **tables, columns, relationships, cloud flows, classic workflows, web resources, environment variable definitions, connection references, apps, forms and views** where metadata is available.
- Inspect **all web resources** in the ZIP inventory: search by name/type, see format and size, read packaged HTML/JavaScript/CSS/XML/JSON/SVG as inert source, preview PNG/JPEG/GIF/WebP images, and download original files. HTML/scripts/SVG are never executed. Resources that exist only as metadata are clearly labelled.
- Explore the **complete mapped table-relationship graph**, including one-to-many, many-to-one and many-to-many links. Click a table to focus, search relationships, filter by relationship type, inspect unresolved endpoints, export an SVG of the visible map, or export **every discovered relationship** as CSV. Unlike the compact architecture summary, this view does not silently drop links after a fixed number.
- Search and filter components, inspect properties, export inventories as **JSON or CSV**.
- Produce self-contained **SVG** diagrams and **Mermaid** text for a data model, component landscape or flow integrations.
- Load a second ZIP for **component-level change detection** (added, removed, changed, unchanged) and export a change report.
- Explore **fictional teaching ZIPs**, including project tracker versions v1.0/v1.1 for comparison and a managed-package example for inspection coverage. Each example can be loaded directly or downloaded to test ZIP ingestion; builds also publish them under `examples/`.
- Compare **two independently loaded ZIPs (A → B)**, drill into before/after properties, reverse direction and export JSON/CSV change reports.
- Analyse **Power Automate complexity and table impact**: action/nesting charts, Dataverse trigger and write tables with available column names, table → flow → table mapping, and candidate retrigger paths. Self-trigger and multi-flow feedback cycles are highlighted, especially where a written column overlaps another flow's selected trigger columns.
- Download **fully offline HTML** or a **standalone offline ZIP**, generated from the same sources as the online app.
- Inspect resource origins using the **Network Transparency** panel and your browser Developer Tools.

## Example ZIPs

The gallery includes Project Tracker, Service Desk, Grant Applications, Volunteer Events and architecture showcase examples. All six packages are entirely fictional and **not importable into Dataverse**. They contain illustrative XML/JSON to exercise the explorer parser. The live download routes are `/examples/<id>-demo.zip`; offline HTML can generate the same files without network access.

For authentic Microsoft-created solutions, use [Microsoft Copilot Studio Samples](https://github.com/microsoft/CopilotStudioSamples). These projects have different coverage and must be reviewed before import or use.

## Managed/unmanaged limitation

**Managed solutions cannot be directly converted into unmanaged solutions by editing a ZIP or using SolutionPackager.** Microsoft's supported ALM workflow is to retain the original unmanaged solution in the development environment, then export it as required. Solution Explorer retains read-only support for managed exports but no longer includes a dedicated managed-to-unmanaged recovery panel. See [Microsoft's SolutionPackager documentation](https://learn.microsoft.com/power-platform/alm/solution-packager-tool).

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

All ZIP/folder reading, XML/YAML/JSON parsing, diagram generation, comparison and export run in the current browser tab. No ZIP contents are sent to an application server. The online edition makes requests for Mightora shared UI and brand assets; the offline edition embeds its assets and blocks network access with a restrictive Content Security Policy. It deliberately excludes environment-variable values from the parsed model and exports. The in-page resource monitor is partial; verify requests independently with F12 → Network → Preserve log.

Packaged textual web resources, canvas sources, FormXML and rule definitions are retained in memory for inspection and documentation. Component JSON and full solution JSON include these sources. Source text can itself contain confidential data or hardcoded credentials, so review exports before sharing. Environment-variable values remain excluded from the parsed metadata. The model-driven Dataverse edition additionally resolves web resource names associated with managed solution component IDs when the signed-in user has permission and retrieves source only on request through the same-origin Dataverse Web API. Other managed-solution components remain a partial reference inventory, not a full export.

ZIPs and folders are subject to size and entry-count limits; XML/YAML/JSON is parsed as inert data and never executed. See [LIMITATIONS.md](LIMITATIONS.md) and [COVERAGE.md](COVERAGE.md) for scope and caveats.

## Project layout

```text
index.html                  Website and search-engine metadata
src/parser.js               Dataverse XML/JSON extraction and comparison
src/diagrams.js             Local SVG diagram generator
src/relationship-map.js     Full relationship graph data and safe SVG rendering
src/relationship-ui.js      Search, focus, map and all-links CSV controls
src/webresources.js         Web resource file catalog and format classification
src/webresource-ui.js       Inert source and safe image inspector
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

Upload a Dataverse solution ZIP to see the flow definitions in its `Workflows/*.json` files, or open a standalone exported flow JSON. The Flow Explorer maps triggers, actions, conditions, loops, scopes, switch cases, branch nesting, and explicit `runAfter` dependencies. Click nodes to inspect allowlisted metadata, then download SVG, Mermaid, or sanitized JSON. A branching demo is included. Everything runs in the browser and the same feature works offline. The structural flow map omits sensitive literal values. Packaged automation source is separately available as editable text and may include literals that require review before sharing. The interactive overview displays up to 140 steps; Word/PowerPoint exports use all inspected steps, subject to an explicitly reported 5,000-step inspection safety limit.

The **Component showcase · full architecture** package is a fictional test case covering plug-ins, roles, choices, custom APIs, controls, integrations, Power Pages, Copilot topics, AI and missing dependencies. It is not importable into Dataverse.

## Object hierarchy browser

Expand every discovered component family in the **Object Explorer**. Select an object to inspect allowlisted attributes, contained subobjects extracted from available XML, related components and its inspection coverage. Supports search, inspection-level filtering, paging through large families, keyboard-accessible disclosure controls, and per-object JSON export. Packaged source is available as inert text and in individual Word/PowerPoint/JSON exports. Environment-variable values remain excluded. The raw source of scripts and automation definitions can contain sensitive literals. The detail hierarchy has a per-component safety limit of 160 nodes and a total budget of 6,000 nodes; metadata not present in an export remains visibly unavailable. This functionality also works offline.

## Editable technical report exports (.docx and .pptx)

Solution Explorer supports client-side Microsoft Word and PowerPoint reports in the live and fully offline application. A single solution produces a solution architecture report with component inventory, data dictionary (tables/columns), relationship model, integrations, automation, security and known dependencies. A/B comparison produces a change-impact report with added, removed, changed, unchanged components, property-level differences, data model changes, and indicative test/review flags. Word reports contain editable paragraphs and tables, plus native editable ERD drawing groups. Other architecture maps use editable structural tables. PowerPoint reports use native editable Office text boxes, rectangular nodes and connectors rather than screenshots. Theme and font can be selected before download.

Reports describe locally extracted metadata, not live environment state. All extracted components, detailed properties, source files, form tabs/sections/controls, and packaged textual sources are paginated without a silent row/slide cutoff. Exported flow documentation includes table-change triggers and filtered columns, write actions and target columns, potential retrigger links and cycle findings. The same detail is available in editable Word and PowerPoint content, with extra native shape-based previews in PowerPoint. Large exports consume memory; use individual exports when appropriate. Binary assemblies are not decompiled, and parser safety bounds or missing definitions are reported rather than invented. Do not assume a missing change in exported metadata guarantees unchanged runtime behaviour.

## Model-driven form preview

When a Dataverse exported solution contains `FormXml`, Solution Explorer extracts form names and static tabs/sections/fields into a read-only interactive preview. In single and A/B documentation, editable Word tables describe the form hierarchy and native PowerPoint shapes show representative wireframes. The parser never runs scripts or includes live form data. Managed form layering, PCF controls and runtime visibility are not simulated. The component showcase example includes an illustrative Application Review form.

## Editable diagram coverage (Word and PowerPoint)

The single-solution and A→B change reports include **every available diagram family derivable from extracted metadata**: solution-component landscape; table relationships; integration and connection references; security; business logic; plug-in registrations; explicit missing dependencies; per-flow branching/runAfter maps; and model-driven form previews. Comparison reports add before/after diagrams for both exports and a colour-coded change-component view. Form controls and Power Automate steps are rendered as editable Office objects, not screenshot images.

The online **Power Automate Flow Explorer** now uses a structured, branch-aware SVG: clearly labelled condition YES/NO and switch branches, nested scope guides, and solid connectors only for explicit runAfter dependencies. Trigger-entry links are visually distinct. Independent actions are not falsely shown as sequential.

Word uses editable table-based structural diagrams with explicit edge inventories; PowerPoint uses native shapes and connectors. The flow parser supports up to 5,000 inspected steps per flow (and the interactive visual map still previews up to 140); Office flow diagrams paginate the complete inspected set. The full ERD includes every exported table, isolated tables, columns and named external endpoints. Each relationship has a separate editable diagram page, so edges crossing overview pages are preserved. Binary definitions or absent metadata cannot be reconstructed.

## Model-driven app / Dataverse environment edition

Download [`solution-explorer.html`](https://solution-explorer.mightora.io/dataverse/solution-explorer.html) as a single self-contained Webpage (HTML) web resource or [`solution-explorer-Dataverse.zip`](https://solution-explorer.mightora.io/downloads/solution-explorer-Dataverse.zip) for installation files. In the app, the signed-in user can enumerate installed environment solutions and open unmanaged solutions using the supported Dataverse `ExportSolution` action, passing the exported ZIP into the existing browser parser without creating an external backend. For installed managed/Default solutions, Microsoft forbids export; the edition instead displays a clearly incomplete component-reference inventory from `solutioncomponents`. Compare two slots or import local ZIPs as before. Installation and security: [Dataverse README](dataverse/README.md).

## Persistent navigation

The main Mightora header and horizontal section menu remain visible while scrolling the public and offline editions. The section bar stays immediately beneath the shared header rather than covering it. A small local-only runtime measures their actual heights on resize to ensure hash links and keyboard focus do not conceal section headings. Mobile users can swipe or horizontally scroll the section bar. Inside the model-driven Dataverse web resource, the compact dark topbar is sticky; its links remain accessible on narrow screens.

## Component documentation and full ERD

Every object in **Object explorer** has separate Word, PowerPoint and JSON downloads. **Apps and rules** provides direct access to canvas apps, forms, saved views and business rules, including scope filtering. Complete solution and comparison reports include detailed component sections and source from both comparison sides.

- **Full ERD:** all packaged tables and columns, isolated tables, explicit primary and foreign keys, N:1 and N:N edges, self links, intersect table names and named external endpoints. Unknown endpoints and optionality remain explicit. Export SVG, Mermaid, CSV, editable Word or editable PowerPoint. Word uses native editable drawing groups for individual relationships and tables for column dictionaries. PowerPoint uses native shapes, lines and text, with separate relationship pages to retain every edge.
- **Canvas apps:** inspect current `Src/*.pa.yaml`, legacy `*.fx.yaml` and supported older `Controls/*.json`, directly or within a solution's nested `.msapp`. View screen/control hierarchies and literal coordinates. Power Fx and raw source are editable in reports. Dynamic layouts and formulas are never executed. Resave older apps in Studio when source is absent.
- **Forms:** inspect OnLoad handlers in registration order, enabled state, library/function, execution-context flag, parameters and packaged JavaScript. Other exported event registrations also appear in component reports. Missing libraries are marked. Dynamic registrations and indirect calls are not resolved.
- **Business rules:** category-2 workflows and BusinessRule records show Entity, All forms, Specific form or Unknown scope, including evidence, table, state, form IDs, triggers, recognised condition/action nodes and full packaged definitions. Workflow ownership `Scope` values are never mistaken for rule execution scope.
- **Views:** exported column layouts, FetchXML and layout XML are documented. JavaScript OnLoad belongs to forms, rather than saved Dataverse views.

Nested canvas extraction is limited to 4,000 entries per app, 40 MB total decompressed nested content and 4 MB per inspected source file. These limits are checked before source inflation. Exceeded limits are reported, with the app remaining visible as incomplete.

Format references: [canvas source](https://learn.microsoft.com/power-apps/maker/canvas-apps/power-apps-yaml), [business-rule scopes](https://learn.microsoft.com/power-apps/maker/data-platform/data-platform-create-business-rule), [workflow process-trigger scope](https://learn.microsoft.com/power-apps/developer/data-platform/reference/entities/workflow#processtriggerscope), [form events](https://learn.microsoft.com/power-apps/developer/model-driven-apps/clientapi/events-forms-grids).

Vendored `js-yaml` 4.3.2 (MIT) is used with its JSON schema for inert canvas source parsing and is also available to the shared footer. Attribution: [vendor/JS-YAML-LICENSE.md](vendor/JS-YAML-LICENSE.md). No runtime package download is required.

## Trace, search and change-impact exploration

The **Trace and search** section links each component to incoming (where used) and outgoing (requires) references. Expand up to eight hops, follow clickable graph nodes, navigate Back/Forward, or start a guided app, column or automation investigation. Object Explorer has a direct **Where used and impact** action. Form field labels link to column exploration; OnLoad registrations can jump to static function/property definition candidates.

Reference direction is **dependent → required component**. Evidence is kept separate:

- **Declared dependency:** an explicit manifest MissingDependency record.
- **Metadata reference:** form controls/libraries, saved-view columns/FetchXML, rule scope/fields, flow connection references and recognised registration properties.
- **Reference found in source:** an exact exported name in packaged source, with a path and line number. This is static evidence, not proof of execution.
- **Possible text match:** ambiguous column names, display names or unbound literals. These are excluded by default and can be included explicitly.

Source search covers metadata, JavaScript, Power Fx, FetchXML and other packaged text. Results are paged in groups of 100 with full match counts. Select a location to see a line-numbered excerpt and linked component references, or download the complete original source. Code is never executed.

Load solution B to compare the selected component's properties, extracted form/canvas/rule structure or corresponding source path side by side. Small comparisons align inserted/deleted lines. Large comparisons disclose positional fallback or a comparison size limit. Missing components/source paths are stated explicitly.

Export the current exploration graph as SVG or JSON, or generate an editable Word/PowerPoint review with reference evidence, discovered impact paths and a suggested verification checklist. Full and individual technical reports also include reference inventories. These are review prompts rather than verified breaking-change predictions.

Processing remains in memory and works from the same maintained online, offline and Dataverse code. Graph scanning is bounded at 32 million source characters and 50,000 distinct evidence edges; coverage warnings identify partial scans. The on-screen graph displays up to 60 nodes, while SVG/JSON exports contain the complete selected graph within those extraction budgets. Each edge retains up to eight representative locations and an exact count of all scanned occurrences. Missing/dynamic definitions remain outside the static analysis.

### Power Automate complexity and table impact

The **Flow impact** section adds action-count and maximum-nesting bar charts across the currently loaded flows, table-sorted Dataverse row-change triggers (including explicit column filters), create/update/upsert target tables and columns, and an interactive table → flow → table diagram. Filter by flow, table or column; select a flow in a chart, table or diagram to inspect it using the existing step explorer. The fictional table-impact demo includes reciprocal table dependencies and a scheduled flow.

All processing stays local and is included in online, offline and Dataverse editions. Counts include control containers and all branches, exclude triggers, and start nesting at zero for top-level actions. Analytics reads the definition independently of the existing 250-step inspector limit. A 20,000-node / 100-level analysis limit marks results incomplete. The existing solution loader includes at most 100 flow definitions; inventory-only entries without definitions cannot be analysed.

Only recognised Dataverse connector operations are mapped. Schema/column names are retained; input values, row-filter values, expressions and environment URLs are not. Dynamic tables and bodies are explicitly unresolved. HTTP calls, child flows, custom actions, deletes and relationship operations are not inferred as column writes. Writes in conditional branches are possible, not guaranteed. Selected-environment operations remain separate from current-environment table nodes. Logical/entity-set names are unified only when supported by actual solution table metadata; no pluralisation guesses are made. Trigger select-column filters apply to updates, not creates/deletes. Existing explorers and export controls remain available.
