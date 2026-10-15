# Mightora Solution Explorer — Dataverse web resource edition

The standalone `solution-explorer.html` contains the same Mightora Solution Explorer parser, forms, flows, comparison and Office report code as the public website. It adds a **same-environment** solution picker to a model-driven Power App. The user signs in to Dataverse through Microsoft; this tool collects **no credentials**.

## Install

1. Download `solution-explorer-Dataverse.zip`, or download `dataverse/solution-explorer.html` directly from `https://solution-explorer.mightora.io/`.
2. Extract the ZIP if applicable. It contains a single HTML web resource, this README, and MIT licence. **This ZIP is NOT a Dataverse solution-import package.**
3. Go to [Power Apps](https://make.powerapps.com/) and select the target environment.
4. Open an unmanaged solution in **Solutions**. Add a **New → More → Web resource → Webpage (HTML)** and upload `solution-explorer.html`. Save and **Publish**. Check the full web-resource name, including your publisher's prefix (for example `abc_solution_explorer.html`).
5. Edit your model-driven app. Choose **Add page → Web resource**, pick the uploaded HTML and enable **Show in navigation**. Save and publish the model-driven app.
6. Open the app as a user with appropriate privileges. Select an unmanaged solution and **Open in Explorer** to export-and-unpack into the current browser session. Choose **A** or **B** to compare solutions.
7. To upgrade, replace the HTML contents of the existing web resource with a newer build, save and publish; no app navigation change is required.

You may optionally open the HTML web resource in a model-driven dialog with `Xrm.Navigation.navigateTo({pageType:'webresource',webresourceName:'<publisher>_solution_explorer.html'}, {target:2,width:{value:90,unit:'%'},height:{value:90,unit:'%'}})` in a command-bar script. Use the installed publisher-prefixed name.

## What it does

- Lists Dataverse solution metadata via a **same-origin** authenticated `GET /api/data/v9.2/solutions` using the current user's Microsoft sign-in session. Metadata response privileges apply.
- For a regular **unmanaged** solution, calls `POST /api/data/v9.2/ExportSolution` with `SolutionName` and `Managed:false`, decodes the returned Base64 ZIP in memory, and opens it using the exact existing Solution Explorer parser. Supports editable Word/PowerPoint reports, forms and Power Automate visualisations.
- **Microsoft does not allow exporting an installed managed solution or the Default Solution.** For those solutions, the tool uses `GET /api/data/v9.2/solutioncomponents` to show a **partial** list of component-type codes and IDs. Names, XML definitions, plug-in internals, forms and flows are **not** reconstructable from those references; the UI marks them `Discovered` or `Unsupported`. The existing ZIP upload can still inspect an original managed ZIP if you have one legitimately.
- Supports loading an environment solution into **A** and **B** for comparisons. It also retains local ZIP upload for either slot.
- Read-only: no solution publish, Dataverse record create, update or delete actions. Note that ExportSolution is a server-side *export operation*, not a record modification.

## Safety and limitations

- The HTML file is self-contained: JavaScript, CSS and Mightora logo are embedded. There is no separate Mightora backend, CDN, tracking, analytics, or token handling.
- The web resource only makes same-origin Dataverse API requests (`connect-src 'self'`) and does not transmit solution content outside the tenant. Downloading a generated report saves it to the user's device.
- The solution export is capped at **75 MB** (uncompressed ZIP text checks also apply). Inventory listing is limited to 1,500 solutions; metadata-only references to 5,000 components. Limits prevent excessive memory use. Very large exports may still take time and consume Dataverse resources.
- This is **not an offline edition**: authenticated Dataverse discovery and export require a live environment. The separate public/offline Mightora Solution Explorer remains unchanged.
- Browser same-origin context, host security policies, custom security roles, managed solution visibility, and actual ExportSolution privileges must be verified in a real Dataverse tenant. Automated tests simulate API responses and do not prove tenant compatibility.
- When a flow, form, or component is not in the returned metadata, reports will not invent its internals. Changes to a managed solution's installation can only be examined at the component-reference level unless an original ZIP is provided.
- Never include passwords or access tokens in web resources. Restrict which users can discover/export solutions according to your organisation's governance policy.

## Relevant Microsoft references

- https://learn.microsoft.com/en-us/power-apps/maker/data-platform/export-solutions
- https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/reference/exportsolution?view=dataverse-latest
- https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/reference/solutioncomponent?view=dataverse-latest
- https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/getglobalcontext-clientglobalcontext.js.aspx
- https://learn.microsoft.com/en-us/power-apps/maker/model-driven-apps/create-remove-pages

Source: https://github.com/mightora/solution-explorer.mightora.io · MIT.