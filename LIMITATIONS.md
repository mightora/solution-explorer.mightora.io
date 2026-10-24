# Current scope and limitations

This first release parses **XML-based Dataverse exported solution ZIPs**. Microsoft has also introduced a distributed YAML source-control format; such ZIPs are flagged, but general solution YAML components are **not yet** fully parsed (canvas `.pa.yaml` source has specific support). Do not treat an empty result as proof that a solution has no components.

- **Columns / relationships:** common XML export structures are supported, but newer metadata forms may not be captured.
- **Cloud flows:** workflow entries and typical flow JSON definitions are supported; nested actions and runtime semantics are not fully analysed.
- **Connections:** connection references can be listed, but live credentials, environment-specific connection instances and secrets are neither retrievable nor exposed.
- **Environment variables:** names/types can be included, **values are deliberately withheld**.
- **Web resources:** inventories include manifest records and packaged paths. Where a payload is present, the resource inspector displays text sources (up to 1 MB) without executing them, previews selected raster images (up to 8 MB) and allows original-file download (up to 20 MB). Executable HTML/JavaScript/SVG is not run. Binary formats and content absent from a ZIP cannot be previewed. In the signed-in Dataverse edition, included web resources can be resolved and fetched read-only if permissions allow; resources not included in the selected solution are intentionally excluded.
- **Comparison:** checks supported normalised component properties, not an XML canonical diff, text source diff, full dependency graph or operational compatibility.
- **Diagram:** the complete relationship map includes every discovered table relationship with both endpoints, marks external tables and separately lists definitions without enough endpoint data. The existing compact architecture view is a size-limited summary. Neither can infer relationships omitted from source exports, runtime calls, implicit dependencies or missing live metadata. Large all-table graphs may be visually dense; focus/search controls help inspect them.
- **ZIP limits:** 75 MB archive, 130 MB estimated decompressed data, 4,000 files and 20 MB per parsed metadata entry. These limit accidental resource exhaustion, but are not a complete sandbox against malicious archives.
- **Browser:** automated source/build checks and Office package/render checks run locally. Browser/device verification must be repeated for the current release; Safari and Firefox require device verification.
- **Privacy:** standard solution metadata can contain organisationally sensitive names. Check generated reports before sharing. Network timing APIs don't provide a complete audit.
- **Security:** static client-side processing reduces data exposure but does not guarantee a zero-risk application; review code and independent scanning evidence.

Exports from different Dataverse versions can have different structures. Please open a minimal anonymised test case as a GitHub issue when support is missing.

## Sample packages
The six built-in ZIP examples are fictional exercises using export-like XML structures. They are not genuine Dataverse exports, do not contain complete dependency metadata, and cannot be imported. The offline application generates the same sample ZIPs entirely in the browser.

## Managed solution conversion
Dataverse does not support simply converting managed packages to unmanaged by changing ZIP flags or repacking them. The recovery checklist is an assessment, not a converter or a means of bypassing managed properties. Obtain the original unmanaged source or rebuild components with appropriate rights and tests.

## Flow Explorer limitations

The flow map is a **static interpretation** of exported Power Automate Workflow Definition Language (WDL), not a live Power Automate designer. It cannot execute or validate flows, show run histories, discover runtime values, or guarantee that every connector or custom action is supported. Dashed diagram links indicate containment; solid links represent explicit `runAfter` links or trigger entries. There is no inferred serial sequence between independent actions. In the structural flow map, expressions are described by function names without arguments and input/output field names are allowlisted. Raw packaged definitions are separately included as editable source and may contain sensitive literals. Flow map shows up to 140 nodes (inventory up to 250); nested actions are handled to a maximum depth of 20. Standard `Workflows/*.json` and selected `ClientData` XML variants are supported; other packaging formats may have no extractable definitions.

## Expanded Dataverse component coverage

The extended catalog reads well-known XML elements and numeric solution manifest component types. **Discovery does not mean the component was fully parsed.** Some components only expose their name and type in solution.xml; root references are not equivalent to their complete component definition. Custom APIs, plug-ins, security roles, Power Pages, Copilot Studio and AI Builder have different formats across platform versions. Some Microsoft solution component numeric values are internal-only or unavailable in the public list. Unknown values are labelled unsupported; they are not guessed. Where available, the application lists `MissingDependency` manifest declarations, not an exhaustive runtime dependency graph. Never upload customer solution ZIPs to issue reports. Redact solution names and secrets before submitting example XML.

## Object browser

The object hierarchy is a read-only local interpretation of component metadata. It shows real nested XML objects when detected, not an editable replica of Power Apps, Dataverse or the Power Automate designer. Export schema variations and inaccessible binary formats (such as plug-in DLLs and canvas packages without supported source), unsupported XML tags, omitted source or configuration values may prevent deep inspection. Structural extraction is capped at 160 nested objects per component and 6,000 total object nodes for safety; the component list itself remains browsable beyond these limits. Object cross-links are restricted to recognised references and declared manifest missing dependencies. Missing links do not imply no runtime dependencies.

## Editable DOCX and PPTX report generation

Both Word and PowerPoint exports are generated entirely in the browser from the already-parsed solution metadata using locally bundled ZIP/Open XML code. The full ERD uses native editable Word drawing groups for relationship diagrams and editable tables for all column definitions. PowerPoint diagrams use editable native shapes and connector lines. Source material such as flow inputs, binary PCF resources, plug-in assemblies, custom page definitions and normal Dataverse records are not reconstructed. Comparison is an extracted component/metadata diff, not a full semantic parser or a verified breaking-change assessment. Reports paginate all extracted components, all table columns and packaged textual source without a silent row/slide cap. Very large reports can exhaust browser memory; each component is also exportable separately. Review all reports before external distribution; names and structural data may be confidential.

## Form layout preview

Form rendering uses available exported FormXML to show structural wireframes only. It is **not** a live Power Apps form preview. It cannot reproduce script-driven changes, the actual model-driven app command bar, PCF/custom control rendering, subgrid contents, design-time and runtime business rules, personalised views, missing managed layers, or data. Forms with absent or unsupported definitions are explicitly marked as not previewable. PowerPoint forms are editable wireframe shapes, while Word forms are editable layout tables. If a control or form isn't packaged, it won't be fabricated.

## Diagram completeness and change reports

The editable report diagram pack includes all **supported and extracted** diagram categories, not every possible live configuration. Visual edges are drawn only when explicitly supported by exported relationships, connection references, registration properties, or MissingDependency metadata. Data models, security and integrations may contain disconnected components because the export does not fully define their links. Power Automate flow containment is distinct from execution order: only runAfter/trigger entry links represent dependency edges. The PPTX export adds paginated action maps, canvas control structures, business-rule details, full ERD columns and separate pages for every relationship. DOCX exports use editable Word tables for complex diagrams and preserve full branch/action inspection metadata within stated parser limits. Form previews describe exported tab/section/control structures, not a pixel-perfect Power Apps runtime screen. Overview diagrams may span slides. Every full-ERD relationship additionally gets its own diagram page so cross-page edges remain visible in both Office formats.

## Installed Dataverse solution access

The embedded model-driven HTML web resource works only in a live, signed-in Dataverse origin with solution read/export permissions. It issues authenticated same-origin `solutions`, `solutioncomponents` and (for unmanaged solutions only) `ExportSolution` requests. This is not a way to export, decompile, convert or bypass protection on managed solutions: managed and Default packages only have an API component-reference inventory and full form/flow definitions usually will not be available unless an original export ZIP is supplied. Solution export can be costly, require privileges and take time; the in-browser ZIP limit is 75 MB. A successful simulated API test does not prove the page works in every model-driven host: validate in a real tenant. The downloadable Dataverse ZIP is an installation bundle, NOT a valid Power Platform solution ZIP.

## Source and runtime boundaries

Packaged web resources, selected component XML, form event parameters, automation definitions and canvas formulas are now included as editable text in full and individual reports and JSON exports. This is intentional source documentation. The source can contain customer information or hardcoded secrets, even though environment-variable values are excluded from the parsed metadata. Review it before sharing. Code, SVG, HTML and Power Fx are never executed or embedded as active application content.

Canvas previews represent supported source hierarchies and literal geometry only. Dynamic formulas, responsive containers, data binding, app runtime, custom controls and component-library rendering are not simulated. Source-free or unsupported older `.msapp` packages remain visible with a coverage notice. The nested extraction limits are 4,000 files/app, 40 MB decompressed total and 4 MB/source file. Full source is retained for successfully inspected files; uninspected files are named in warnings.

Business-rule scope derives from explicit rule scope, ProcessTriggerScope, form IDs or process-trigger metadata. Numeric workflow ownership Scope (User/BU/Organisation) does not determine Entity/All forms execution. Unknown remains Unknown. Recognised XAML/JSON condition and action nodes are a static design view; unsupported definitions remain available as source, without a claim of full semantic interpretation.

OnLoad documentation shows exported registrations and packaged libraries, including disabled registrations. It cannot establish dynamically added handlers, functions hidden in unavailable dependencies, async settings or the exact runtime path through a JavaScript library. Saved views expose FetchXML and column layout rather than form events.

ERD completeness means all tables, columns and relationships discovered in the supplied export. Metadata omitted by Dataverse or managed packaging cannot be invented. External endpoint tables are marked. PK/FK markers require explicit metadata; N:1/N:N do not imply required/optional participation. Mermaid ER notation has limited support for unknown optionality; review the export comment. Large ERDs are dense, so filtering and individual exports are provided.

## Reference and impact analysis

Dependency arrows mean dependent → required component. Declared manifest references, structured metadata, source-name occurrences and possible text matches are different evidence classes. A code comment, string or formula literal is not proof of a live call. Short column names can be ambiguous across tables. Display-name matches and unbound column matches are possible, and excluded by default. A unique form-library record context can narrow a field match, but does not establish every runtime branch or indirect call.

The graph does not resolve dynamic JavaScript, computed logical names, external code, runtime flow values, unavailable app-module bindings or every Power Fx binding. Impact is a breadth-first static review with a depth of 1–8, cycle protection and discovered paths. It cannot prove a deployment will break or that an unconnected component is independent.

Source-reference scanning is limited to 32 million characters and 50,000 evidence edges. Coverage is displayed, and original source search remains available beyond the graph scan budget. Repeated references are aggregated with exact scanned occurrence counts and up to eight representative locations per edge. The screen draws at most 60 nodes; graph SVG/JSON exports include the whole selected graph within the stated scan budgets.

Source comparison uses line alignment up to 400,000 line-pair cells, then explicitly switches to positional comparison. More than 40,000 total lines are left for an external diff to protect browser memory. The comparison is textual or structural, not a semantic code diff. Definition jumps are static candidates and can be ambiguous. Incomplete metadata and source paths are labelled. History is in memory and resets when the workspace changes.
