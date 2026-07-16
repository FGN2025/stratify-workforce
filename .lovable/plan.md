## Item 1 — Fix recursive RLS on `community_memberships`

### Recursive policy (verbatim, from `pg_policies`)

**`Members can view approved members in community`** (SELECT)
```sql
USING (
  (request_status = 'approved'::membership_request_status)
  AND (EXISTS (
    SELECT 1
    FROM community_memberships cm
    WHERE ((cm.user_id = auth.uid())
      AND (cm.tenant_id = community_memberships.tenant_id)
      AND (cm.request_status = 'approved'::membership_request_status))
  ))
)
```

The `EXISTS` subquery selects `community_memberships` inside its own policy → recursion.

Other policies are safe (use `auth.uid()`, `has_role()`, or `has_tenant_role()` which is already `SECURITY DEFINER`).

### Fix — Option B, hardened one-arg form (per user refinement)

Drop `p_user` so the RPC can't be used as a membership oracle; the policy only ever needs `auth.uid()`.

```sql
CREATE OR REPLACE FUNCTION public.is_approved_member(p_tenant uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_memberships
    WHERE user_id = auth.uid()
      AND tenant_id = p_tenant
      AND request_status = 'approved'
  );
$$;

REVOKE ALL ON FUNCTION public.is_approved_member(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_approved_member(uuid) TO authenticated;

DROP POLICY "Members can view approved members in community" ON public.community_memberships;

CREATE POLICY "Members can view approved members in community"
ON public.community_memberships
FOR SELECT
TO authenticated
USING (
  request_status = 'approved'
  AND public.is_approved_member(tenant_id)
);
```

Behavior unchanged: approved members of a tenant see other approved members of the same tenant; recursion gone; no oracle beyond "am I in tenant X" (which the caller already knows).

### Regression paths to spot-check

- `src/hooks/useMyCommunities.ts`, `useCommunityReview.ts`, `useMembershipReview.ts`, `useMembershipRequest.ts`, `usePendingMembershipCount.ts`
- `src/components/communities/MembershipReviewQueue.tsx`, `MyCommunities.tsx`, `JoinCommunityButton.tsx`
- DB helpers `current_tenant_id`, `user_tenant_id`, `is_tenant_admin` (SECURITY DEFINER — unaffected)
- MCP `list_my_communities` returns non-error JSON

## Item 2 — Verify manifest exposes all 8 tools

1. Confirm `src/lib/mcp/index.ts` registers 8 (already does).
2. `app_mcp_server--extract_mcp_manifest` → confirm `.lovable/mcp/manifest.json` lists 8.
3. `supabase--deploy_edge_functions ["mcp"]`.
4. Live `tools/list` via `supabase--curl_edge_functions` POST to `/mcp` with headers `Accept: application/json, text/event-stream` + `Content-Type: application/json`, body `{"jsonrpc":"2.0","id":1,"method":"tools/list"}`. Paste returned names.

## Report

1. Original + replacement policy verbatim; Option B (hardened one-arg).
2. Regression paths list.
3. Live `tools/list` with 8 names.
4. `verify_jwt=true` unchanged; only 1 policy + 1 helper touched.

## Out of scope

No new tables/columns, no tool renames, no service-role usage, no other policy changes.