## Profile page: Completions section

In `src/pages/Profile.tsx` (lines ~213-225 and ~186):

1. Rename the section title `"Certifications"` → `"Completions"` and update the stat label `'Certifications'` → `'Completions'` (line 186).
2. Replace the `HorizontalCarousel` wrapper around credentials with a responsive stacked grid so cards wrap onto multiple rows instead of scrolling horizontally.
   - Use a section header (matching the existing carousel title styling) followed by a `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4` container of `<CertificationCard>` items.
3. Remove the `min-w-[220px]` from `CertificationCard` (or override via wrapper) so cards fill grid cells naturally; keep all other card styling.

No backend, data, or other section changes.