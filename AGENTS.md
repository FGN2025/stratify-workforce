# Project Architecture Decisions

- FGN Academy is the product identity; tenant names and branding represent organization context and content ownership, never the public product name. This prevents tenant data from replacing the platform brand.
- Public Course discovery and the authenticated learner workspace use separate layouts and route boundaries. This keeps prospective learners out of application chrome while preserving the full role-aware workspace after sign-in.
- Work Order publication readiness is enforced by a database activation trigger, with the UI providing matching preflight feedback. This keeps every publishing path consistent while allowing incomplete drafts.- Inbound learner-identity retries for every learning source go through one source-aware queue (`play_replay_queue.source_slug`) drained by `process-play-replay-queue`. This keeps retry behavior consistent across Play, BBW and future partners.

- Program selection is independent of tenant context; the `programs` registry (read publicly via the `program-registry` feed) is the single source for cross-vertical navigation. Games, trades, industries and programs link many-to-many and skills stay canonical, so programs like Scout Merits can span many trades and games without new data models.
