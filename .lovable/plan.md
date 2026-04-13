

# Plan: Insert 13 Track 4 Fiber_Tech Work Orders

## What

Insert 13 work order rows into `work_orders` for the Track 4 Fiber Optics challenges. These are the rows the `sync-challenge-completion` edge function needs to match incoming completions from play.fgn.gg.

## Changes

**Single data insert** using the insert tool with your exact SQL, plus one addition: set `channel_id = '71c8c91e-4086-46ff-805a-7fc8b765468b'` (the Fiber-Tech Simulator channel) on all 13 rows so they appear correctly in channel-filtered views and work order listings.

```text
#   Title                                                        XP   Difficulty
1   CS Fiber: Underground Utility Trench Excavation              15   intermediate
2   CS Fiber: Conduit Placement and Backfill                     17   intermediate
3   CS Fiber: Road Crossing and Bore Operations                  20   advanced
4   RC Fiber: Site Assessment and Route Survey                   13   beginner
5   RC Fiber: Debris Clearance and Right-of-Way Prep             12   intermediate
6   RC Fiber: Access Road and Staging Area Prep                  12   intermediate
7   RC Fiber: Infrastructure Cable Run                           17   intermediate
8   CS Fiber: Underground Conduit Systems and Bedding Standards  16   intermediate
9   RC Fiber: Aerial Route Assessment and Pole Line Evaluation   15   intermediate
10  CS Fiber: Pre-Construction Safety and 811 Compliance         13   beginner
11  CS Fiber: Directional Bore Planning and HDD Site Operations  18   advanced
12  CS Fiber: OSP Handoff — Construction to Splicing Crew        20   advanced
13  RC Fiber: Cable Run Documentation and Route Closeout         16   intermediate
```

`ON CONFLICT (source_challenge_id) DO NOTHING` makes it safe to re-run.

## Verification

After insert, query to confirm all 13 rows exist with correct `game_title`, `channel_id`, and `source_challenge_id` values.

## No code changes needed

The edge function already references these `source_challenge_id` values — once the rows exist, the completion→notification pipeline will work end-to-end.

