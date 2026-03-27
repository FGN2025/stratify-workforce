

# Rename "Sync Tester" Tab → "FGN Play Integration"

## Problem
The tab containing the Integration Health Check and Challenge Sync Tester is labeled "Sync Tester" — not descriptive enough and doesn't match the expected "FGN Play Integration" name.

## Change

**File: `src/pages/Admin.tsx`**

Rename the tab trigger from "Sync Tester" to "FGN Play" (keeping it short to fit the tab bar):

```
// Line 257-258: Change label
<TabsTrigger value="sync-tester" className="text-amber-400 ...">
  FGN Play
</TabsTrigger>
```

This is a single-line label change — no structural modifications needed. The `IntegrationHealthCheck` and `ChallengeSyncTester` components remain inside this tab as-is.

