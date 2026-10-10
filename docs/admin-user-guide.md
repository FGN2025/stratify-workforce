# FGN Academy administration guide

## Operating model

Studio is the authoring authority for challenges, Work Orders and Courses. Academy receives, reviews, publishes, curates, assigns, verifies and governs that content.

```text
Pick an Academy app → Create in Studio → Review Inbox → Publish and operate in Academy
```

Existing FGN.GG challenge imports and legacy mappings remain available as governed fallbacks. They are not new authoring paths.

## Access

The administration menu is role-aware:

| Role | Academy access |
|---|---|
| Community admin | Operations for their active community |
| Admin | Academy-wide operations, people, communities, marketplace and integrations |
| Super admin | Admin access plus platform settings and elevated controls |
| Developer | Developer portal access |

## Community Admin

- **Overview:** community identity, setup status and operational shortcuts.
- **Assignments:** assign, publish and make quick edits to existing Work Orders. New content opens Studio.
- **Evidence Review:** decide learner evidence; the badge shows pending work.
- **Events:** manage community events.
- **Catalog:** choose Academy apps and content visible to the community.
- **Access:** manage registration codes and member access.

Community identity and media are managed from Overview and Catalog rather than separate sidebar destinations. Pathways remain available as a tab within Marketplace.

## Academy Operations

- **Overview:** priority queues and platform summary. The large metrics appear only here.
- **Create in Studio:** select an industry app and open Studio with its discipline and simulations selected.
- **Review Inbox:** approve, reject or request revision for Studio submissions. Filter the queue by Academy app.
- **Content Operations:** review, publish, assign and make quick Work Order edits. Filter by Academy app, game or difficulty. Use **Edit in Studio** for authored content changes.
- **Evidence Review:** decide step evidence and other evidence queues.
- **People:** Accounts and Learner Progress.
- **Communities:** Registry and, for super admins, the Approval Queue.
- **Marketplace:** Apps & Disciplines, Curation and Pathways.
- **Integrations:** FGN.GG health, game sync, retries, parity, telemetry and legacy mappings.

## Platform Settings and Super Admin

Super admins see two restricted destinations:

- **Platform Settings:** authorized apps, webhooks, credential types, Discord and AI configuration.
- **Super Admin:** tenants, roles, audit logs and dangerous operations.

## Content lifecycle

1. Open **Create in Studio** and choose the originating Academy app.
2. Author once in Studio and choose FGN.GG, Academy or both as destinations.
3. Review the package in **Review Inbox**.
4. Approval creates inactive Academy content.
5. Complete publication-readiness checks in **Content Operations**.
6. Publish, curate and assign in Academy.

Nothing becomes learner-visible merely because Studio submitted it or an Academy reviewer approved it.

## Work Orders

- Use Academy quick edit for title, criteria, category, publication state and governed legacy fields.
- Use **Edit in Studio** for authored content changes.
- Publication checks apply to every activation path.
- The FGN.GG import fallback remains available until Studio distribution to FGN.GG is live.
- Do not use time estimates; difficulty, criteria and evidence requirements describe the work.

## Evidence Review

Evidence remains open while any piece is pending or claimed. A reviewer can approve, reject, request revision or mark supported outcomes according to the configured evidence model. Partner supporting evidence does not independently issue XP or credentials.

## Advanced registries and legacy tools

- SIM Games, Categories and Resources remain internal registries; they are not learner navigation.
- Challenge Registry, Mappings, Tracks and Activity Mapping support existing FGN.GG links and manual overrides.
- Automatic Breakroom sync remains active. Breakroom Mapper is retired.
- Course Builder remains direct-link only until the first real Studio package passes joint acceptance, then its old address will redirect.
- Old admin bookmarks continue to resolve to the matching hub or tab.

## Common actions

| Action | Location |
|---|---|
| Create a challenge, Work Order or Course | Create in Studio |
| Review Studio content | Review Inbox |
| Publish or assign a Work Order | Content Operations |
| Review learner evidence | Evidence Review |
| Invite or manage an account | People → Accounts |
| Inspect learner progress | People → Learner Progress |
| Approve a community | Communities → Approval Queue |
| Edit an app identity | Marketplace → Apps & Disciplines |
| Diagnose FGN.GG delivery | Integrations |
| Manage trusted external apps | Platform Settings → Authorized Apps |
| Manage roles or audit logs | Super Admin |

## Troubleshooting

- **A destination is missing:** confirm the active community and your role; the menu hides destinations you cannot use.
- **A Work Order will not publish:** resolve the publication-readiness message in Content Operations.
- **A Studio package cannot be approved:** wait for package validation or review its validation errors.
- **An old bookmark opened a different page:** legacy addresses redirect into the consolidated hub that now owns that function.
