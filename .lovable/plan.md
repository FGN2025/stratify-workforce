

# Plan: Fix play.fgn.gg URL Path (singular → plural)

## Problem
The Academy links to `play.fgn.gg/challenge/{id}` but the correct route is `play.fgn.gg/challenges/{id}` (plural). This causes the 404.

Confirmed: fetching `https://play.fgn.gg/challenges/48b739d9-...` returns the Roadcraft challenge page successfully.

## Changes

### 1. `src/pages/WorkOrderDetail.tsx` (lines 287-289)
Change `/challenge/` → `/challenges/` in both URL template strings.

### 2. `src/components/admin/WorkOrderAdminPanel.tsx` (line 51)
Change `/challenge/` → `/challenges/` in the admin panel external link.

## Impact
Two-character fix (`s` added in two files). All "Continue on Play" buttons and admin detail links will open the correct page on play.fgn.gg.

