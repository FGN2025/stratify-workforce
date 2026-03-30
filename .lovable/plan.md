

# Activate Farming Simulator & Construction Simulator SIM Resources

## Summary
The sidebar already dynamically renders resources from the `sim_resources` database table, showing "Coming Soon" only when no records exist. To activate these two games, we simply need to seed placeholder resources that will appear in the sidebar and can be managed by admins going forward.

## Approach
Create a database migration that inserts initial SIM Resource records for **Farming Simulator** and **Construction Simulator**. Each will get a starter "Training Hub" resource pointing to `play.fgn.gg` as a placeholder URL (admins can update the URLs later via the SIM Resources tab when the play.fgn.gg integrations are ready).

## What Changes

| Item | Detail |
|------|--------|
| **Migration SQL** | Insert 2 `sim_resources` rows — one for `Farming_Sim`, one for `Construction_Sim` — with title, description, placeholder href (`https://play.fgn.gg`), appropriate icon, and the game's brand accent color |
| **No code changes** | The sidebar, admin manager, and hooks already support dynamic database-driven resources for all games — no frontend modifications needed |

## Seed Data

| Game | Title | Description | Icon | Color |
|------|-------|-------------|------|-------|
| Farming_Sim | Farming Training Hub | Skills development and challenge gateway for Farming Simulator | `tractor` | `#22C55E` |
| Construction_Sim | Construction Training Hub | Skills development and challenge gateway for Construction Simulator | `hard-hat` | `#F59E0B` |

## What Happens Next
- Both games will immediately show their resource links in the sidebar (replacing "Coming Soon")
- Admins can edit titles, URLs, descriptions, and add more resources via the **SIM Resources** tab
- When the play.fgn.gg chain-gate integration specs arrive, the URLs and additional resources can be updated without any code changes

