# Current scope and limitations

This first release parses **XML-based Dataverse exported solution ZIPs**. Microsoft has also introduced a distributed YAML source-control format; such ZIPs are flagged, but individual YAML components are **not yet** fully parsed. Do not treat an empty result as proof that a solution has no components.

- **Columns / relationships:** common XML export structures are supported, but newer metadata forms may not be captured.
- **Cloud flows:** workflow entries and typical flow JSON definitions are supported; nested actions and runtime semantics are not fully analysed.
- **Connections:** connection references can be listed, but live credentials, environment-specific connection instances and secrets are neither retrievable nor exposed.
- **Environment variables:** names/types can be included, **values are deliberately withheld**.
- **Web resources:** inventories cover manifest records and webresource paths; source code is not interpreted.
- **Comparison:** checks supported normalised component properties, not an XML canonical diff, text source diff, full dependency graph or operational compatibility.
- **Diagram:** data-model edges use discovered relationships, and integration edges use discovered flow connection references; it does not infer invisible business dependencies.
- **ZIP limits:** 75 MB archive, 130 MB estimated decompressed data, 4,000 files and 20 MB per parsed metadata entry. These limit accidental resource exhaustion, but are not a complete sandbox against malicious archives.
- **Browser:** offline HTML is tested in Chromium; Safari and Firefox require further device verification.
- **Privacy:** standard solution metadata can contain organisationally sensitive names. Check generated reports before sharing. Network timing APIs don't provide a complete audit.
- **Security:** static client-side processing reduces data exposure but does not guarantee a zero-risk application; review code and independent scanning evidence.

Exports from different Dataverse versions can have different structures. Please open a minimal anonymised test case as a GitHub issue when support is missing.

## Sample packages
The six built-in ZIP examples are fictional exercises using export-like XML structures. They are not genuine Dataverse exports, do not contain complete dependency metadata, and cannot be imported. The offline application generates the same sample ZIPs entirely in the browser.

## Managed solution conversion
Dataverse does not support simply converting managed packages to unmanaged by changing ZIP flags or repacking them. The recovery checklist is an assessment, not a converter or a means of bypassing managed properties. Obtain the original unmanaged source or rebuild components with appropriate rights and tests.

## Flow Explorer limitations

The flow map is a **static interpretation** of exported Power Automate Workflow Definition Language (WDL), not a live Power Automate designer. It cannot execute or validate flows, show run histories, discover runtime values, or guarantee that every connector or custom action is supported. Dashed diagram links indicate containment; solid links represent explicit `runAfter` links or trigger entries. There is no inferred serial sequence between independent actions. For safety, expressions are described by function names without arguments, and input/output field names are allowlisted while secrets and parameter values are intentionally omitted. Flow map shows up to 140 nodes (inventory up to 250); nested actions are handled to a maximum depth of 20. Standard `Workflows/*.json` and selected `ClientData` XML variants are supported; other packaging formats may have no extractable definitions.

## Expanded Dataverse component coverage

The extended catalog reads well-known XML elements and numeric solution manifest component types. **Discovery does not mean the component was fully parsed.** Some components only expose their name and type in solution.xml; root references are not equivalent to their complete component definition. Custom APIs, plug-ins, security roles, Power Pages, Copilot Studio and AI Builder have different formats across platform versions. Some Microsoft solution component numeric values are internal-only or unavailable in the public list. Unknown values are labelled unsupported; they are not guessed. Where available, the application lists `MissingDependency` manifest declarations, not an exhaustive runtime dependency graph. Never upload customer solution ZIPs to issue reports. Redact solution names and secrets before submitting example XML.

## Object browser

The object hierarchy is a read-only local interpretation of component metadata. It shows real nested XML objects when detected, not an editable replica of Power Apps, Dataverse or the Power Automate designer. Export schema variations and inaccessible binary formats (.msapp, plug-in DLLs), unsupported XML tags, omitted source or configuration values may prevent deep inspection. Structural extraction is capped at 160 nested objects per component and 6,000 total object nodes for safety; the component list itself remains browsable beyond these limits. Object cross-links are restricted to recognised references and declared manifest missing dependencies. Missing links do not imply no runtime dependencies.
