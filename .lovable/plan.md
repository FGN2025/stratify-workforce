# Work Order publication readiness

## Build
- Add one shared readiness check for a meaningful title, summary, cover image, and at least one task with a usable title and brief.
- Enforce the check in the backend whenever a draft Work Order is activated, including activation from either admin screen.
- Show administrators the missing publication requirements instead of publishing incomplete content.
- Keep drafts editable and preserve existing Work Order and tenant identifiers.
- Let Work Order and task titles wrap on learner cards, workspace lists, and admin listings instead of truncating them.

## Validation
- Confirm an incomplete draft cannot be activated and reports its missing fields.
- Confirm a complete Work Order can be activated.
- Verify cards and task lists at desktop and mobile widths, then confirm the preview builds without errors.

## Technical details
- Use an SQL readiness function and activation trigger so every client path receives the same rule.
- Treat an authored title or existing generated/source title as meaningful, and accept the Work Order cover or imported source cover as its image.
- Require a non-placeholder task title and a substantive task description; existing active records remain unchanged until republished.
