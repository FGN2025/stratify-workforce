

# Plan: Backfill 6 Remaining Fiber_Tech Cover Images

## Problem
Six Fiber_Tech work orders still have `NULL` for `cover_image_url` and `fgn_origin_challenge_id`. The user has confirmed the 6 challenge IDs exist on play.fgn.gg with cover images.

## Approach
1. Call the `fetch-challenges` edge function to get the title + `cover_image_url` for each of the 6 challenge IDs
2. Match each remote challenge to the corresponding local work order by title/theme
3. Run 6 `UPDATE` statements via the insert tool to set `cover_image_url` and `fgn_origin_challenge_id`

## Mapping (to be confirmed via fetch-challenges response)

| Challenge ID (play.fgn.gg) | Local Work Order |
|---|---|
| `034e8cf3-...` | One of the 6 unmatched work orders |
| `c8298ef1-...` | (matched by title) |
| `5e9ace81-...` | ... |
| `d8b601c3-...` | ... |
| `57da5f29-...` | ... |
| `4ce440c1-...` | ... |

### Local work orders needing images:
1. `4d58c766-...` — CS Fiber: Directional Bore Planning and HDD Site Operations
2. `729f9234-...` — CS Fiber: OSP Handoff — Construction to Splicing Crew
3. `b7cc3cd3-...` — CS Fiber: Pre-Construction Safety and 811 Compliance
4. `d9f48aac-...` — CS Fiber: Underground Conduit Systems and Bedding Standards
5. `bee0f50f-...` — RC Fiber: Aerial Route Assessment and Pole Line Evaluation
6. `3a24a819-...` — RC Fiber: Cable Run Documentation and Route Closeout

## Steps
1. Invoke the `fetch-challenges` edge function (already authenticated) to retrieve the 6 challenges with their `cover_image_url` values
2. Match each challenge to the correct local work order by title similarity
3. Execute 6 UPDATE statements setting `cover_image_url` and `fgn_origin_challenge_id` on each work order

## Result
All 13 Fiber_Tech work order cards will display unique hero images from play.fgn.gg. No code changes needed.

