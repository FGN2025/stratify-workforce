# T-24h: Academy → Play strict-flip notice

**Post at:** 2026-05-25 16:00 UTC (24h before cutover)
**Channels:** `#fgn-ecosystem-eng`, Phase E thread, email to play.fgn.gg devs
**From:** FGN Academy
**Cutover at:** 2026-05-26 16:00 UTC — `PLAY_WEBHOOK_STRICT=true`, legacy `X-App-Key` accept branches dropped.

---

## TL;DR

In **24 hours** Academy flips `PLAY_WEBHOOK_STRICT=true` on `play-webhook-receiver` and drops every legacy `X-App-Key` accept branch on inbound surfaces. After the flip, any inbound webhook whose `X-Play-Signature` does not match `hex(hmac_sha256(PLAY_WEBHOOK_SECRET, rawBody))` returns **`401 invalid signature`** and the body is not processed.

If you've been signing per the contract (`docs/play-to-academy-hmac-contract-ping.md` §3) you don't need to do anything — we'll see your signed traffic continue to land. If you're still unsigned or signing with the old hex secret, you have ~24h.

---

## Parity window result (2026-05-12 16:00 → 2026-05-25 16:00 UTC)

| Signal | Target | Actual |
|---|---|---|
| Inbound completions verified end-to-end | ≥ 1 real fire, `sig_ok: true` | **2** confirmed (2026-05-12 16:00 UTC, 2026-05-13 02:00 UTC) |
| Signature mismatches in 6h rolling window | 0 | **0** |
| Dispatch parity (direct vs webhook → `sync-challenge-completion`) | ≥ 99.5% | **100%** on observed pairs |
| `delivery_id` per-event uniqueness | unique per dispatch | **confirmed** — fresh UUID on 2026-05-13 fire (`1cbd3ca0…`) vs prior (`a7478df2…`) |
| `play_sync_attempts` errors on `webhook:*` rows | 0 | **0** |

Parity dashboard rebuilt against `play_sync_attempts` (`direction='inbound'`, `action LIKE 'webhook:%' OR 'direct:%'`) — the prior `ecosystem_sync_log` reference was a phantom table and has been removed from the runbook.

**Conclusion:** crypto path is clean, idempotency keys are per-event, both observed completions issued credentials without error. Strict-flip is safe.

---

## What changes at T0 (2026-05-26 16:00 UTC)

1. `PLAY_WEBHOOK_STRICT=true` on `play-webhook-receiver`.
   - Missing or mismatched `X-Play-Signature` → `401 { error: "invalid signature", detail }`.
   - `play_sync_attempts.request.sig_mode` will read `strict` on accepted rows; rejected rows still log with `sig_mode='strict'` + `sig_reason`.
2. `X-App-Key` accept branches removed from `sync-challenge-completion`, `academy-passport-link`, `play-webhook-receiver`. Only `X-Ecosystem-Key` (outbound) and `X-Play-Signature` (inbound webhook) are honored.
3. No URL changes. No envelope changes. No payload changes.

Both flips are env-flag gated — instant rollback if anything regresses, no redeploy.

---

## What we still need from you before T0

Re-flag of the 4 open asks from `docs/play-to-academy-hmac-contract-ping.md` §9. Only #2 is hard-blocking parity reporting; the others are quality-of-life.

1. ✅ **`delivery_id` per-event** — confirmed on `challenge_completion`. Please confirm same behavior on `achievement_earned` and `evidence_approved` if you've fired either.
2. ⚠️ **Direct-POST repoint** — direct path is still hitting `https://fgn.academy/api/ecosystem/challenge-completed` (Vite SPA black-hole, returns 200 but body discarded). Please repoint to `https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/sync-challenge-completion` **or** drop the direct path entirely now that webhook dispatch is primary. This doesn't block strict-flip, but it does mean half our parity rows are write-only.
3. ⚠️ **Sample `evidence_approved` firing** — receiver shipped 2026-05-12, validated against synthetic payloads, **zero production firings** in `play_sync_attempts` to date. One real fire (any tenant) before T0 would let us confirm credential issuance under your live envelope.
4. ⚠️ **HMAC sample request** — one signed request dump (curl `-v` or `play_sync_attempts` row id) against the rotated `PLAY_WEBHOOK_SECRET`, so we can byte-diff signed bytes one last time before strict.

If any of these are problematic for the 2026-05-26 16:00 UTC window, reply on the Phase E thread and we can slip strict-flip 24–72h. Lenient mode stays safe indefinitely.

---

## Rollback

If strict-flip surfaces anything unexpected after T0:

```bash
# academy on-call
supabase secrets set PLAY_WEBHOOK_STRICT=false --project-ref vfzjfkcwromssjnlrhoo
```

Receiver picks up the env change on next cold start (~30s). Mismatched signatures return to lenient logging. No data loss — failed `401`s never wrote `play_sync_attempts` rows, so Play's retry logic recovers them on the next dispatch.

Full strict-flip rollback runbook: `docs/phase-e-strict-cutover-2026-05-26.md`.

---

## Contact

- Phase E thread (primary)
- `#fgn-ecosystem-eng` (async)
- Academy on-call rotation (incidents only) — shared runbook

— FGN Academy
