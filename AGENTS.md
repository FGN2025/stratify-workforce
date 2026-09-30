# Project Architecture Decisions

- FGN Academy is the product identity; tenant names and branding represent organization context and content ownership, never the public product name. This prevents tenant data from replacing the platform brand.
- Public Course discovery and the authenticated learner workspace use separate layouts and route boundaries. This keeps prospective learners out of application chrome while preserving the full role-aware workspace after sign-in.
- Work Order publication readiness is enforced by a database activation trigger, with the UI providing matching preflight feedback. This keeps every publishing path consistent while allowing incomplete drafts.