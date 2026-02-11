
## Fix Fiber-Tech "Tech Certification" Resource Color

### The Problem

The "Tech Certification" resource under Fiber-Tech Simulator is displaying with a violet color (`#8B5CF6`) instead of blue (`#3B82F6`). This happened because:

1. The resource exists in the `sim_resources` table with the old purple color hardcoded in the `accent_color` field
2. The color swap (ATS → purple, Fiber-Tech → blue) was applied to configuration defaults, but this database record wasn't updated
3. The sidebar (AppSidebar.tsx) reads `resource.accent_color` directly from the database, so it displays the stale violet color

### Solution

**Update the database record** for the Tech Certification resource to use the correct blue color for Fiber-Tech:
- Current: `accent_color = '#8B5CF6'` (violet)
- New: `accent_color = '#3B82F6'` (blue)

This is a one-line SQL UPDATE statement that will immediately fix the sidebar display and any other places where this resource appears.

### Implementation

1. Execute a simple SQL UPDATE to change the accent_color for the Tech Certification resource
2. The change will propagate immediately to the UI since the sidebar queries the database in real-time

### Why This Happened

When resources are admin-managed (stored in the database), their accent colors are stored as individual records. During the color swap, only the hardcoded configuration defaults were updated, but pre-existing database records retained their old values.

