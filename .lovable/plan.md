

# Plan: Fix Indentation Mismatch Between Course and External Resource Carousels

## Problem
The "Available Courses" carousel is wrapped in a `<div className="container">` (which adds horizontal padding via Tailwind's `container` class), while the "External Training Resources" carousel sits outside that wrapper with no padding. This causes misaligned left edges.

## Fix

**File: `src/pages/Learn.tsx`**

Move the "External Training Resources" `HorizontalCarousel` (lines 102-117) **inside** the `<div className="container">` block so both carousels share the same horizontal padding. The Tabs component and the external resources carousel will both be children of the same container.

Alternatively, if the Tabs wrapper should only cover the tab UI, move the external carousel into its own `<div className="container">` wrapper to match the padding independently.

Recommended approach: wrap the external carousel in its own `<div className="container">` since it's semantically separate from the Tabs section.

