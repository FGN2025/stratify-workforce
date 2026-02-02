
# Convert Grid Sections to Horizontal Carousels

## Level of Effort

**Effort Level: LOW** (30-45 minutes)

The existing `HorizontalCarousel` component already implements all the required functionality. This task involves replacing grid containers with the carousel component across multiple pages.

---

## Scope Summary

| Page | Section | Current Layout | Action |
|------|---------|----------------|--------|
| `/work-orders` | Active Competitions | 3-column grid | Convert to carousel |
| `/` (Index) | Popular This Week | 3-column grid | Convert to carousel |
| `/communities` | Communities Grid | 3-column grid | Convert to carousel |
| `/learn` | Course Catalog | 3-column grid | Convert to carousel |
| `/events` | Upcoming Events (list view) | 3-column grid | Convert to carousel |

---

## Implementation Details

### 1. WorkOrders.tsx - Active Competitions (Lines 185-206)

**Current code:**
```jsx
<section>
  <div className="flex items-center gap-3 mb-4">
    <Trophy className="h-5 w-5 text-primary" />
    <div>
      <h2 className="...">Active Competitions</h2>
      <p className="...">Compete with other operators...</p>
    </div>
  </div>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {filteredWorkOrders.slice(0, 6).map((wo) => (
      <EventCard ... />
    ))}
  </div>
</section>
```

**Replace with:**
```jsx
<HorizontalCarousel
  title="Active Competitions"
  subtitle="Compete with other operators for top rankings"
  icon={<Trophy className="h-5 w-5" />}
  viewAllLink="/work-orders?filter=competitions"
>
  {filteredWorkOrders.slice(0, 6).map((wo) => (
    <div key={`competition-${wo.id}`} className="w-72 shrink-0 snap-start">
      <EventCard 
        workOrder={wo}
        community={getRandomCommunity()}
      />
    </div>
  ))}
</HorizontalCarousel>
```

---

### 2. Index.tsx - Popular This Week (Lines 144-165)

**Current code:**
```jsx
<section>
  <div className="flex items-center gap-3 mb-4">
    <TrendingUp className="h-5 w-5 text-primary" />
    <div>
      <h2 className="...">Popular This Week</h2>
      <p className="...">Top-rated training scenarios...</p>
    </div>
  </div>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {workOrders.slice(0, 6).map((wo) => (
      <EventCard ... />
    ))}
  </div>
</section>
```

**Replace with:**
```jsx
<HorizontalCarousel
  title="Popular This Week"
  subtitle="Top-rated training scenarios based on completions"
  icon={<TrendingUp className="h-5 w-5" />}
  viewAllLink="/work-orders?sort=popular"
>
  {workOrders.slice(0, 6).map((wo) => (
    <div key={`popular-${wo.id}`} className="w-72 shrink-0 snap-start">
      <EventCard 
        workOrder={wo}
        community={getRandomCommunity()}
      />
    </div>
  ))}
</HorizontalCarousel>
```

---

### 3. Communities.tsx - Communities Grid (Lines 95-104)

**Current code:**
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {filteredCommunities.map((community, idx) => (
    <CommunityCard ... />
  ))}
</div>
```

**Replace with:**
```jsx
<HorizontalCarousel
  title="All Communities"
  subtitle={`${filteredCommunities.length} training organizations`}
  icon={<Users className="h-5 w-5" />}
>
  {filteredCommunities.map((community, idx) => (
    <div key={community.id} className="w-72 shrink-0 snap-start">
      <CommunityCard 
        community={community}
        featured={idx === 0}
      />
    </div>
  ))}
</HorizontalCarousel>
```

**Note:** Also add import for `HorizontalCarousel` at the top of the file.

---

### 4. Learn.tsx - Course Catalog (Lines 71-75)

**Current code:**
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {availableCourses.map((course) => (
    <CourseCard key={course.id} course={course} />
  ))}
</div>
```

**Replace with:**
```jsx
<HorizontalCarousel
  title="Available Courses"
  subtitle={`${availableCourses.length} courses to explore`}
  icon={<BookOpen className="h-5 w-5" />}
>
  {availableCourses.map((course) => (
    <div key={course.id} className="w-80 shrink-0 snap-start">
      <CourseCard course={course} />
    </div>
  ))}
</HorizontalCarousel>
```

**Note:** Also add import for `HorizontalCarousel` and update the loading skeleton to match horizontal layout.

---

### 5. Events.tsx - Upcoming Events List View (Lines 242-250)

**Current code:**
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {upcomingEvents.map((event) => (
    <EventCard ... />
  ))}
</div>
```

**Replace with:**
```jsx
<HorizontalCarousel
  title="Upcoming Events"
  subtitle={`${upcomingEvents.length} events scheduled`}
  icon={<CalendarIcon className="h-5 w-5" />}
>
  {upcomingEvents.map((event) => (
    <div key={event.id} className="w-80 shrink-0 snap-start">
      <EventCard
        event={event}
        onClick={() => handleEventClick(event.id)}
      />
    </div>
  ))}
</HorizontalCarousel>
```

**Note:** Also add import for `HorizontalCarousel` at the top of the file.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/WorkOrders.tsx` | Replace Active Competitions grid with carousel |
| `src/pages/Index.tsx` | Replace Popular This Week grid with carousel |
| `src/pages/Communities.tsx` | Add import, replace communities grid with carousel |
| `src/pages/Learn.tsx` | Add import, replace course catalog grid with carousel |
| `src/pages/Events.tsx` | Add import, replace list view grid with carousel |

---

## UX Improvements Included

1. **Consistent scroll behavior** - All sections will use the same left/right scrolling pattern
2. **Navigation arrows** - Desktop users get explicit left/right chevron buttons
3. **Gradient edge indicators** - Visual cues showing more content is available
4. **Snap-to-card scrolling** - Cards snap into place for clean browsing on mobile
5. **View All links** - Optional links to full list views where applicable

---

## Optional Enhancement: Touch/Swipe Gesture Support

The current `HorizontalCarousel` relies on native browser scroll behavior which already supports touch swiping. No additional changes needed for mobile gesture support.
