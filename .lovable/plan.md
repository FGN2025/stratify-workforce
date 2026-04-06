

## Comprehensive User Guide Page

### What We're Building
A new in-app help page at `/help/guide` accessible to all authenticated users. This will be a thorough reference covering the full FGN Academy ecosystem: how challenges flow between play.fgn.gg, fgn.academy, broadbandworkforce.com, and Breakroom. It expands well beyond the existing student and admin help pages.

### Structure

The page will follow the exact same pattern as `HelpAdmin.tsx` and `HelpStudent.tsx` (card-based sections with icons) but contain these sections:

1. **Platform Overview** -- What FGN Academy is, the four connected platforms (Academy, play.fgn.gg, broadbandworkforce.com, Breakroom), and how they work together
2. **Importing Challenges from play.fgn.gg** -- Admin workflow: Admin Dashboard → Work Orders → "New Work Order" → Import from FGN Play dialog. How source_challenge_id links the two platforms
3. **Challenge Completion Pipeline** -- How play.fgn.gg sends completions via the `sync-challenge-completion` webhook (X-App-Key auth, payload format, score >= 70% to pass, XP award, credential issuance)
4. **Skill Passport & Credentials** -- How completions become credentials on the Skill Passport, verification hashes, public passport URLs, employer verification flow
5. **Breakroom Integration** -- How Breakroom virtual world quizzes sync to Academy via the polling pipeline. The `breakroom_identity` table, course name mapping, 15-minute cron cycle
6. **Cross-Platform Identity** -- How users are matched: Breakroom username → FGN user_id (via breakroom_identity), FGN email → BBW account (via auth.users email)
7. **Broadband Workforce Sync** -- What data flows to broadbandworkforce.com: quiz attempts, lesson progress, enrollment status, user stats, achievements
8. **Challenge Registry** -- Admin tool at /admin/challenge-registry for managing cross-platform ID mappings, Breakroom course names, Lua/PowerShell export tools
9. **Credential API** -- Overview of the two REST APIs (Credential API and Public Catalog), auth methods (none, JWT, API Key), endpoint summary
10. **Track Completion & Knowledge Checks** -- How completing all challenges in a track (OSHA Safety, Fiber Optics) triggers knowledge check notifications
11. **Monitoring & Troubleshooting** -- Checking audit logs, signs of expired Breakroom tokens, common issues and fixes

### Files

| Action | File | Details |
|--------|------|---------|
| Create | `src/pages/HelpGuide.tsx` | New page component following HelpAdmin/HelpStudent pattern |
| Edit | `src/App.tsx` | Add route `/help/guide` wrapped in `ProtectedRoute` |
| Edit | `src/components/layout/AppSidebar.tsx` | Update the Help nav item or add a "Platform Guide" sub-item |

### Technical Notes
- Reuses existing `AppLayout`, `Card`, `CardHeader`, `CardContent`, `Badge`, `Separator` components
- Admin-specific sections (importing challenges, Challenge Registry, monitoring) will be visually tagged with an "Admin" badge
- ASCII-style diagrams rendered in `<pre>` blocks showing the data flow architecture
- No new dependencies or database changes required

