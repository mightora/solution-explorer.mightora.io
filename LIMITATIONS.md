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
The five built-in ZIP examples are fictional exercises using export-like XML structures. They are not genuine Dataverse exports, do not contain complete dependency metadata, and cannot be imported. The offline application generates the same sample ZIPs entirely in the browser.

## Managed solution conversion
Dataverse does not support simply converting managed packages to unmanaged by changing ZIP flags or repacking them. The recovery checklist is an assessment, not a converter or a means of bypassing managed properties. Obtain the original unmanaged source or rebuild components with appropriate rights and tests.

## Flow Explorer limitations

The flow map is a **static interpretation** of exported Power Automate Workflow Definition Language (WDL), not a live Power Automate designer. It cannot execute or validate flows, show run histories, discover runtime values, or guarantee that every connector or custom action is supported. Dashed diagram links indicate containment; solid links represent explicit `runAfter` links or trigger entries. There is no inferred serial sequence between independent actions. For safety, expressions are described by function names without arguments, and input/output field names are allowlisted while secrets and parameter values are intentionally omitted. Flow map shows up to 140 nodes (inventory up to 250); nested actions are handled to a maximum depth of 20. Standard `Workflows/*.json` and selected `ClientData` XML variants are supported; other packaging formats may have no extractable definitions.
