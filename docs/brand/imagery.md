# FGN Imagery Rules

Distilled from FGN Brand Guide v2 §7. Applies to every cover image, hero photo, marketing illustration, and challenge-card thumbnail uploaded to fgn.academy, play.fgn.gg, and fgn.business.

The brand reads as **infrastructure that powers play, not a gaming clan**. The aesthetic is shared across every property — what differs is the surrounding HTML chrome, not the image itself.

## Aesthetic register

- Photoreal cinematic photograph or photoreal painted concept-art.
- **NOT** stylized illustration, cartoon, vector, or 3D-render product shots.
- **NOT** AAA-game cinematic-trailer drama. We are training, not entertainment.

## People rule

- Workers may appear in the frame, but only mid-task in proper PPE.
- Faces obscured or angled — by hardhats, side angles, focus on the work, motion blur.
- **Never** a portrait headshot. **Never** posed at the camera. **Never** direct eye contact.
- No "happy worker waving." No team huddles. No "diverse team in hardhats smiling" stock boilerplate.

The work being done must look real and recognizable to a tradesperson in the field.

## Composition

- Machinery-led — equipment is the dominant subject (60–70% of the frame).
- Three-quarter angle, low or eye-level camera, single strong focal point.
- Worker, if present, is supporting cast.
- Equipment in real worksites and real environments. Never floats in abstract dark space.

## Lighting

- Natural time-of-day: dawn, dusk, sodium-vapor dock yards, stormy mountain passes, golden-hour fields.
- Brand mode controls UI chrome only — it does **not** apply a brand-color filter to imagery.

## FGN-distinctive content (good)

- Class 8 American semi-trucks in working context (CDL detail: load straps, mud flaps, DOT signage)
- Modern agricultural equipment with optional in-game HUD overlay (Precision Farming yield maps, soil-pH zones)
- Heavy construction equipment in active worksites
- Fiber Tech OTDR equipment readouts

## Avoid

- Generic Industry-4.0 / futuristic-factory aesthetic
- Stock business charts or floating data abstractions
- LinkedIn-influencer worker portraits
- Text or logos baked into the image (FGN wordmark always lives in the HTML chrome)
- Manufacturer-trademarked badging visible on equipment
- Melted hands, extra fingers, warped equipment geometry

## AI generation

The cover-image pipeline lives in `supabase/functions/scorm-build/_lib/course-enhancer/`. Defaults: OpenAI `gpt-image-2`, fallback `gpt-image-1-mini`. See Brand Guide §8 for the full prompt skeleton.
