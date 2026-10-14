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
