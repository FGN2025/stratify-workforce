# Membership page: rename, admin filters, scoped view for community admins

## What changes for each person

- **Everyone:** the page title "Skills Communities" changes to **"Communities"**. The new subtitle reads "Join your school, employer or training program to unlock its courses and Work Orders." The list heading drops the word "skills" (for example, "12 communities").
- **Platform admins:** the "Filter" button starts working. It filters by organization type (school, employer, training center and so on), verified/unverified, and parent organization. Search and filters run on the list that is already loaded, so nothing extra is fetched.
- **Community admins** (owner, admin or moderator of a community): they see only the communities they belong to, plus the child communities under those, instead of the whole directory. Totals for communities and members count only those.
- **Learners:** they see the approved directory with search, as they do today.

## Performance

- The page now loads communities with one request. Today each community card loads its own extra details from the server, so a page of 20 cards means about 40 extra requests. The cards will use the data that is already loaded.
- The page now waits for sign-in to finish before loading. This stops a wasted first request made before sign-in.
- The fix from earlier today (the page no longer asks for private contact fields) stays in place.

## Technical details

- `useCommunities` takes a scope: `all` (platform admin), `managed` (community admin: IDs from `community_memberships` with role owner/admin/moderator, expanded with `get_child_tenants`, then one `tenants.in('id', ids)` query using `TENANT_COLUMNS`), or `directory` (learner/anon, current behavior). The query key includes the scope and user ID and waits on `session?.access_token`.
- The scope is resolved from `useUserRole` plus the user's community membership roles.
- `CommunityCard`: remove the two per-card `tenants` queries (lines 38 and 65) and pass the parent name and needed fields from the page.
- Filter UI: a Popover with checkboxes, shown only to platform admins. Shadcn Select uses `none` instead of empty values.
- Hiding communities in the page is for display only. Access is still enforced by the existing database rules, which stay unchanged.
- Check: sign in as a platform admin, as `qa-reviewer` (community-scoped) and as `qa-learner`, and confirm the counts, the list and the request count on the network tab.
