# Verify Darcy's passport link end to end

## What I found already
- Darcy (darcy@fgn.gg) already has a linked Play identity record, created 3 Sept, Play ID `84d2999e-…`.
- Five signed requests from Play were accepted that day with valid signatures, so the signing handshake works.
- The Academy signing key and ecosystem key are both available in this workspace, so I can send a genuine signed request exactly as Play does, without needing anything from the Play team.

## The check to run
1. Send one signed request to Academy's passport-link endpoint using Darcy's Play ID and email, exactly the way Play sends it.
2. Confirm the response is a success with a link to Darcy's Skill Passport, an expiry time, and whether the match came from the existing link or from email.
3. Confirm a fresh link record was stored and the Play identity record shows a new "last seen" time.
4. Open the returned link in a browser to confirm it lands on the passport page and the link is single-use (a second open fails as expected).
5. Send one request with an unknown Play ID and no matching email to confirm it still returns "not linked".

## Notes
- This creates a small number of test records (a link token, an audit row); nothing existing is modified or deleted.
- No code changes are expected unless the test surfaces a defect, in which case I'll report it before changing anything.
