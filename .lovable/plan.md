
# Align fgn.academy with FGN Brand Guide v2 (Pathways pillar)

Decision locked in: **fgn.academy is the Pathways property → Amber primary stays.** Current `#f49d14` is essentially the guide's `#F59E0B` so no visible CTA reskin is needed. The work is making the rest of the guide enforceable in code and docs.

## What changes

### 1. Lock pillar tokens in CSS + Tailwind (the most important rule in the guide)

The guide's "Pillar Locks" rule says the same pillar gets the same color on every property, every chart, every badge. Today these colors are scattered (hardcoded `text-blue-400`, `text-purple-500`, `bg-amber-500/10`, etc.). Add the four canonical tokens once:

```text
src/index.css :root
  --brand-pillar-perf:  262 83% 58%   /* #7C3AED violet  */
  --brand-pillar-play:  180 100% 42%  /* #00D4D4 cyan    */
  --brand-pillar-path:  38 92% 50%    /* #F59E0B amber   */
  --brand-pillar-fiber: 214 100% 59%  /* #2E8BFF azure   */
```

Expose in `tailwind.config.ts` as `brand: { perf, play, path, fiber }` so usages become `text-brand-perf`, `bg-brand-play/10`, `border-brand-amber` per §6 of the guide.

Also nudge `--primary` from `37 91% 52%` → `38 92% 50%` to match the exact Pathways hex. Negligible visual change.

### 2. Replace ad-hoc pillar colors

Sweep these files to use the new pillar tokens instead of arbitrary Tailwind palette colors:

- `src/components/profile/AchievementCard.tsx` — `rarityColors` blue/purple/amber → pillar tokens
- `src/components/admin/AdminHero.tsx` — `text-blue-400`, `text-amber-400`, `text-emerald-400`, `bg-amber-500/10` → tokens
- Chart vars `--chart-1..5` in `src/index.css` → align to perf/play/path/fiber + success/danger
- `src/hooks/useGameChannelColors.ts` `DEFAULT_COLORS` — keep game accents (those are per-game, not pillar), but make sure ATS/Construction/etc. are still their own values, not silently flipped to pillar tokens

### 3. Typography — add Rajdhani for headings (Arcade mode spec)

Brand guide §4 (Arcade mode): Orbitron display · **Rajdhani 600 headings** · Inter body. You already use Inter. Adding Rajdhani is the minimum change that aligns headings without redesigning every hero.

- `bun add @fontsource/rajdhani`
- Import 500/600/700 in `src/index.css`
- Tailwind: add `display: ['Rajdhani', 'Inter', ...]` and apply `font-display` to h1/h2 in app shell (HeroSection, AdminHero, PageHero)
- **Skip Orbitron** for now — your Industrial Command Center memory rejects neon/sci-fi treatment. Document the deviation.

### 4. FGN wordmark & naming hygiene

Per §1 + §5:
- Use "FGN" stand-alone in chrome; expand to **"Fiber Gaming Network"** only in learner-facing copy (academy is Arcade audience, not Enterprise). Audit `JoinFGNAcademyDialog`, footers, alt text — replace any "Federated Generative Network" string here.
- Wordmark color rule: white on dark surface (current background). Add a check that no component recolors the FGN logo to amber/accent.

### 5. Imagery rule documentation (§7)

The brand guide adds a full visual-language spec — photoreal cinematic, machinery-led, faces obscured, no stock-photo huddles. This is enforced at content time, not code time, but we should:

- Add `docs/brand/imagery.md` distilling §7.1–7.6 (aesthetic register, people rule, composition, lighting, FGN-distinctive content) so anyone uploading hero/cover images via the admin Media Library has a reference.
- Add a one-line caption under the upload field in `TenantMediaSettings.tsx` linking to the doc.

### 6. Component token additions (§6)

Add the missing semantic tokens the guide names:
- `--brand-glow` (amber glow utility — already implicit in `glow-primary`, just rename for clarity)
- `--shadow-elevation` — declared but currently unused; map to a soft Enterprise-mode shadow for the few light-surface components (PDF passport export, embed widget)

### 7. Memory update

Update `mem://style/aesthetic`:
- Note that academy = **Pathways pillar** (Arcade audience, Amber primary by design — this matches the guide, not a deviation)
- Add new `mem://style/pillar-tokens` documenting the four locked pillar colors and that they must never be tenant-overridden (only `--brand-primary` / `--brand-secondary` may be)
- Note Rajdhani-for-headings adoption; Orbitron intentionally skipped due to Industrial Command Center aesthetic

## Out of scope (call out, don't do)

- **Light-surface "Enterprise mode" toggle** (`?mode=enterprise`) — guide describes it but academy is fully Arcade; building the toggle is a separate effort if/when academy is embedded in a provider portal.
- **Switching to Cyan primary** — explicitly rejected; academy is Pathways.
- **Cover-image AI pipeline (§8)** — already lives in `scorm-build/_lib/course-enhancer/`; brand guide just documents what's shipped. No code changes needed.
- **Text-generation rules (§9)** — already encoded in `_lib/course-enhancer/prompts/style-guide.ts`. Verified, no drift.

## Files touched

```text
src/index.css                                  (pillar vars, chart vars, font import)
tailwind.config.ts                             (brand.* colors, fontFamily.display)
src/components/profile/AchievementCard.tsx     (rarity → pillar tokens)
src/components/admin/AdminHero.tsx             (hardcoded colors → tokens)
src/components/marketplace/HeroSection.tsx     (font-display on h1)
src/components/marketplace/PageHero.tsx        (font-display on h1)
src/components/admin/AdminHero.tsx             (font-display on h1)
src/components/settings/TenantMediaSettings.tsx (imagery-rules link)
src/components/marketplace/JoinFGNAcademyDialog.tsx (naming audit)
docs/brand/imagery.md                          (NEW — §7 distilled)
mem://style/aesthetic                          (updated)
mem://style/pillar-tokens                      (NEW)
package.json                                   (+ @fontsource/rajdhani)
```

No DB migrations, no edge function changes, no breaking visual changes for users.
