# Present the public product as FGN Academy

## Goal
Make the signed-out experience clearly belong to **FGN Academy**, while retaining the existing organization records and tenant behavior for authenticated accounts.

## Public experience
- Use **FGN Academy** as the product name in the shared chrome, home-page call to action, footer, browser title, and public social metadata instead of deriving those labels from the active organization.
- Use the FGN Academy logo on signed-out pages rather than the active tenant logo.
- Replace the signed-out sidebar’s long application menu with only:
  - Discover
  - Learn
  - Communities
- Remove the signed-out “Operations,” simulation-category tree, and “Industrial LMS” footer language. Keep Login and Register visible in the header.
- Keep protected destinations and role-based administration out of the signed-out navigation; their routes and access controls remain unchanged.

## Signed-in organization context
- Keep **FGN Academy** as the primary product identity.
- Move the active organization name and organization selector into the account dropdown, alongside the user’s identity and account actions.
- Preserve the existing tenant IDs, tenant selection, persistence, URL behavior, branding data, permissions, and content scoping. This is a presentation change, not a tenant migration or rename.
- Keep the full learner/admin navigation available after sign-in, with role-based sections continuing to follow existing permissions.

## Implementation notes
- Split sidebar items into a minimal public set and the existing authenticated set based on resolved authentication state.
- Avoid optimistic admin navigation while signed out or while authentication is unresolved, preventing the long menu from flashing publicly.
- Decouple public-facing product copy from `tenant.name` / `nav_app_name`; retain tenant-derived identity only inside authenticated organization context and tenant-specific content labels.
- Reuse the existing organization selector behavior inside the account menu rather than creating a second source of tenant state.

## Verification
- Check the signed-out home page at desktop and mobile widths: FGN Academy branding, exactly three public navigation items, no organization selector, no “Operations,” and no “Industrial LMS.”
- Sign in and confirm the account menu shows the active organization and allows switching organizations without changing IDs or access behavior.
- Confirm learner, community-admin, platform-admin, and protected navigation visibility remains role-correct after authentication resolves.
- Confirm organization names still appear where they describe content ownership or account context, including Work Order and community cards.
