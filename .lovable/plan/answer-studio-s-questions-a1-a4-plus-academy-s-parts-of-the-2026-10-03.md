# Answer Studio's questions A1–A4, plus Academy's parts of the questionnaire and D1–D8

Goal: give Studio a written answer to every item, backed by live checks where it asks for them. Items Academy can't answer are marked "Don't know yet" with an owner named.

## A1 — Contract documentation and versioning
- Add a JSON Schema for every successful (200) response of the Studio catalog: capabilities, skills, work-orders, vocabulary, sources. Each one comes with a cleaned-up example taken from real data.
- Declare types for: Work Order title (string or null, plus the preview fallback rule), the version fields (catalogVersion, recordVersion, sourceVersion: what they are and how to compare them), and vocabulary term objects.
- Add fixed value lists for visibilityMode, maturity and maturityState, curationState, and each vocabulary group.
- Publish a versioning rule:
  - Adding an optional field or a new endpoint does not change the contract version, and readers must ignore fields they don't know.
  - Removing or renaming a field, changing a type, narrowing a value list, or changing a meaning is a breaking change. It gets a new contract version, and the old one keeps working for at least 90 days through supportedContractVersions.
  - Adding a value to a fixed list counts as breaking unless that list is marked "open" in the schema.
- Serve the schemas at `/schemas/{name}.json`, linked from the OpenAPI document. Add a self-check that compares a live response against its schema.

## A2 — Curation branch (live)
- Use a temporary Work Order owned by another organization, set up three ways for FGN Global: curated with included = true, curated with included = false, and no curation entry at all.
- Read it through the Studio catalog with an FGN Global token. Expected results: shown, hidden, hidden.
- Record the token's organization, the record ids and the responses. Then remove the temporary records.

## A3 — Visibility values
- Write down what each value means, taken from the database: every visibilityMode value, what null means (no restriction set, so owner-or-curation decides), and curationSupported (always true today; false would mean curation entries are ignored for that record).
- Confirm in writing that Studio's rule is correct: decide visibility from the owner and strict curation only.

## A4 — Second test scope
- Name a second test organization: a QA child organization, kept separate from FGN Global.
- Issue it its own Studio token and run the negative isolation checks:
  - A token from one organization can't see the other's Work Orders.
  - A cursor from one organization is refused for the other.
  - Curation entries belonging to the other organization are never returned.
- Record the results and include steps for revoking and cleaning up.

## Specialist-site questionnaire (Academy's side only)
- Academy covers only how it connects to each site: which organization in Academy each site maps to, how the shared skill catalog is used, and the Studio contract described above.
- Questions about who owns each site, its content templates and its awards (Merits, Sim Racing, Railway, Maritime) are marked "Don't know yet — site owner." No changes are made to those sites.

## D1–D8 (Academy's side)
- Record D2 as resolved: configurator.fgn.gg, with Studio live at studio.fgn.gg.
- D5: confirm whether Academy accepts the configurator's new address, and add it to the approved list if you approve.
- D6: deliver the A1–A4 answers, the second organization, the test records, and the steps for withdrawing access.
- D1, D3, D4, D7 and D8 are marked as needing a named person from you.

## Deliverable
`docs/phase-3-studio-answers-a1-a4.md`: answers, live evidence, questionnaire, and D1–D8 status. Links are added to the Studio handoff document and the contract inventory.

## Technical details
- studio-catalog: add the `/schemas/*` routes and value-list constants, and set curationSupported from data instead of always returning true. Update openapi.json and the YAML copy. Add a versioning section to docs/api/studio-catalog/README.md.
- Test data: one temporary QA organization (a child of FGN Global), one temporary Work Order owned by it, and tenant_work_order_curation rows, all deleted afterwards. A QA studio_tokens app for the second organization, revoked after the tests.
- Out of scope: FGN.GG, Merits, Maritime, Railroading and Sim Racing code. No change to visibility rules.
