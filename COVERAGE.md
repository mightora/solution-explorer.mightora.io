# Power Platform solution component coverage

Verified against the `main` baseline at `e9aaa4a` on 4 November 2026, and updated for this documentation expansion. The baseline had 51 recognised component families and 92 passing regression tests. It primarily understood exported XML/JSON; individual canvas `.pa.yaml` files were supported, but the Microsoft YAML source-control manifest was not.

## What the status means

- **Partially inspected**: meaningful structured configuration is extracted, but a full runtime interpretation cannot be established from a static package.
- **Identified / selected metadata**: the type, name, manifest code and selected XML/YAML scalar fields or contained objects may be available; deep semantics are not supported consistently.
- **Unsupported**: a manifest type is not mapped. It is shown as `unknown` and never silently dropped.
- **Fully inspected**: none of the families meet this stronger claim across all Microsoft export versions and runtime behaviour.
- **Not present in supplied source**: a per-import condition, not a global parser status. No customer solution was provided for this assessment. The application reports missing manifest paths and absent definitions for each selected ZIP/folder.

The coverage column on individual objects distinguishes inspected, discovered-only, externally referenced and unsupported records. It describes what was *present in the selected package*, not the completeness of Microsoft's platform or the runtime configuration.

## Recognised families (51)

| Family | Depth | Key extraction / material gaps |
| --- | --- | --- |
| Tables | Partially inspected | Table identity, selected ownership and key metadata; custom runtime behaviour unknown |
| Columns | Partially inspected | Type, requiredness and selected constraints; computed formula semantics incomplete |
| Relationships | Partially inspected | Named endpoints, cardinality indicators and source columns where available |
| Flows / classic workflows | Partially inspected | WDL triggers/actions, nesting, Dataverse writes and monitored columns; dynamic operations unresolved |
| Web resources | Partially inspected | Inventory, text source and registered library references; script execution not analysed |
| Environment variables | Identified / selected metadata | Definition only; **values excluded** |
| Connection references | Identified / selected metadata | Connector references only; credentials excluded |
| Applications | Partially inspected | Model-driven identities; canvas screen/control/Power Fx source where available; custom-page behaviour incomplete |
| Forms | Partially inspected | FormXML tabs, sections, fields and registered JavaScript event handlers |
| Views | Partially inspected | Saved-query columns and FetchXML references |
| Business rules | Partially inspected | Scope, state, triggers, supported conditions/actions; runtime effects unverified |
| Business process flows | Identified / selected metadata | Identity, stages and selected process metadata |
| Custom actions | Identified / selected metadata | Identity and primary table where exported |
| Custom APIs | Identified / selected metadata | Selected binding and invocation contract properties |
| Custom API parameters | Identified / selected metadata | Names and selected parameter types |
| Plug-in assemblies | Identified / selected metadata | Identity/version; binary assemblies never decompiled |
| Plug-in types | Identified / selected metadata | Registration identity and assembly references |
| Plug-in steps | Partially inspected | Message, stage, mode, filtering attributes where exported; implementation writes unknown |
| Plug-in images | Identified / selected metadata | Alias/image type and selected registered attributes |
| PCF controls | Identified / selected metadata | Control identity/configuration; binary runtime code not reconstructed |
| Security roles | Identified / selected metadata | Declared nested privileges and levels when present; user/team assignments absent |
| Role privileges | Identified / selected metadata | Privilege name and depth/level when present |
| Field security profiles | Identified / selected metadata | Profiles only; assignments not established |
| Field permissions | Identified / selected metadata | Selected read/update/create flags |
| Choices / option sets | Identified / selected metadata | Identity and option counts; complete semantics vary by source |
| Alternate keys | Identified / selected metadata | Selected schema names/columns |
| Charts | Identified / selected metadata | Identity and selected view/table metadata |
| Dashboards | Identified / selected metadata | Layout identity, not live charts or datasets |
| Site maps | Identified / selected metadata | Navigation source when packaged |
| Ribbon customisations | Identified / selected metadata | Packaged XML and selected rules |
| Commands / ribbon rules | Identified / selected metadata | Identifiers and selected references |
| Custom connectors | Identified / selected metadata | Package identity; external API behaviour and secrets unknown |
| Endpoints / webhooks | Identified / selected metadata | Registration identity and endpoint-type metadata; calls unverified |
| SLAs | Identified / selected metadata | SLA identity and selected applicability |
| SLA items | Identified / selected metadata | Selected child metadata |
| Routing | Identified / selected metadata | Rule identity and selected targets |
| Queues | Identified / selected metadata | Queue names and selected configuration |
| Data mappings | Identified / selected metadata | Source/target names where present |
| Duplicate detection | Identified / selected metadata | Rule identity and participating tables |
| Email templates | Identified / selected metadata | Template identity and type; content may be omitted |
| Mobile offline profiles | Identified / selected metadata | Profile identity and selected items |
| Reports | Identified / selected metadata | Metadata only; report binaries not reconstructed |
| Power Pages components | Identified / selected metadata | Identifiers, template references and selected permissions; site runtime unavailable |
| Power Pages web templates | Identified / selected metadata | Template identity and packaged source where recognisable |
| Copilot Studio agents | Identified / selected metadata | Agent identity and selected language metadata |
| Copilot Studio topics | Identified / selected metadata | Topic identity and selected settings; conversation semantics incomplete |
| AI prompts | Identified / selected metadata | Identity and selected model-type metadata |
| AI Builder models | Identified / selected metadata | Identity and configuration name; models not reconstructed |
| Connection roles | Identified / selected metadata | Identity only where present |
| Hierarchy rules | Identified / selected metadata | Identity only where present |
| Unknown component code | Unsupported | Preserved as an inspectable unmapped manifest entry |

## Input formats

| Input | Support and constraints |
| --- | --- |
| Traditional Dataverse solution ZIP | XML manifests, customizations, selected unpacked XML files and workflow JSON |
| PAC CLI unpacked XML folder | Directory picker or ZIP of source-control files; same parsing engine |
| Native Dataverse Git / PAC CLI YAML | `solutions/<name>/solution.yml`, `solutioncomponents.yml`, `rootcomponents.yml`, `missingdependencies.yml`; typed folder inventory and selected scalar metadata |
| Modern cloud-flow YAML | WDL definitions with determinable `triggers` and `actions`; unsupported YAML schemas remain identified |
| Canvas `.msapp` | Nested archive source extraction (bounded); rendered screens only when supported `.pa.yaml`/JSON sources exist |
| Unpacked folder | Local File API directory picker in browsers supporting directory selection; ZIP fallback for others |
| Multiple solution manifests | First detected manifest is selected with a warning; separate archives are preferable for comparisons |
| Binary PCF/plug-in resources | Identified but **not decompiled** |

## Architecture and report coverage

Every identified object can be selected and exported to editable Word and PowerPoint. Each documentation record includes the seven plain-English questions, available properties, source locations, classified references, data interactions, risk notes, confidence and missing-data declarations. Full solution and comparison exports include seven map inventories (execution, lineage, applications, security, integrations, dependencies, cycles) alongside all component detail sections and source appendices. Tables and Office text are editable; large inventories paginate within the existing export engine.

The execution map distinguishes trigger registration from actual downstream writes. A plug-in step can be mapped as a table-event subscriber, but its writes cannot be inferred from a DLL. Therefore the analyzer must **not** claim a confirmed flow↔plug-in feedback loop without implementing code evidence. Existing flow↔flow cycles are only potential and use WDL event and column compatibility, not observed row changes.

## Remaining priority backlog

1. Deeper versioned parsers for Power Pages site/permission metadata, Copilot topics/tools/knowledge references, AI prompts, modern custom pages and complex model-driven app module links.
2. Optional source-aware plug-in impact detection from *provided source* (never binary decompilation), with qualified event-to-write edges.
3. Richer privilege matrices covering create/read/write/delete/append/depth and field-level controls when complete metadata is present.
4. Validate against a documented set of anonymised Microsoft-generated YAML/XML fixtures across PAC CLI versions and multiple browsers; current fixtures are synthetic.
5. Replace first-manifest selection with an explicit multi-solution chooser.

Sources: [Microsoft YAML solution format](https://learn.microsoft.com/en-us/power-platform/alm/solution-source-control-yaml-format), [Dataverse component dependencies](https://learn.microsoft.com/en-us/power-platform/alm/dependency-tracking-solution-components), [PAC CLI solution commands](https://learn.microsoft.com/en-us/power-platform/developer/cli/reference/solution).
