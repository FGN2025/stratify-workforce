

# Revised Plan: AI Tutor Implementation with Lovable AI

## Overview

Implement a comprehensive AI Tutor system ("Atlas") that provides contextual, personalized guidance throughout the learning funnel. The system will be **immediately functional** since `LOVABLE_API_KEY` is already auto-provisioned by Lovable Cloud.

---

## Key Insight: API Key Already Available

The `LOVABLE_API_KEY` is automatically provisioned and managed by Lovable Cloud - it cannot be deleted and is always available in edge functions. This means:

- **No admin configuration required** to enable basic AI tutoring
- **Graceful degradation** only needed for edge cases (rate limits, quota exhaustion)
- **Ready for testing immediately** after deployment

---

## Architecture

```text
AI TUTOR SYSTEM ARCHITECTURE
════════════════════════════════════════════════════════════════════

                    ┌─────────────────────────────┐
                    │   Floating Chat Interface   │
                    │   (TutorChat Component)     │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────▼───────────────┐
                    │   useTutorChat Hook         │
                    │   - Message state           │
                    │   - Streaming handler       │
                    │   - Context injection       │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────▼───────────────┐
                    │   ai-tutor Edge Function    │
                    │   POST /chat (streaming)    │
                    │   GET /status               │
                    └─────────────┬───────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
    ┌─────────▼────────┐  ┌──────▼──────┐  ┌────────▼────────┐
    │  Lovable AI      │  │  Database   │  │  User Context   │
    │  Gateway         │  │  Storage    │  │  Builder        │
    │  (Gemini Flash)  │  │  Messages   │  │  (Progress/XP)  │
    └──────────────────┘  └─────────────┘  └─────────────────┘
```

---

## Database Schema

### Table: tutor_conversations

Tracks conversation sessions with context about where the user initiated the chat.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References auth.users |
| title | TEXT | Auto-generated or user-set title |
| context_type | TEXT | general, course, work_order, lesson, game, onboarding |
| context_id | UUID | Links to specific course, work order, etc. |
| game_title | TEXT | Optional: Fiber_Tech, ATS, etc. |
| is_active | BOOLEAN | Current conversation flag |
| message_count | INTEGER | Total messages in thread |
| created_at | TIMESTAMPTZ | Session start |
| updated_at | TIMESTAMPTZ | Last activity |

### Table: tutor_messages

Stores individual messages with metadata for analytics.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| conversation_id | UUID | References tutor_conversations |
| role | TEXT | 'user', 'assistant', or 'system' |
| content | TEXT | Message content |
| metadata | JSONB | tokens_used, model, latency_ms |
| created_at | TIMESTAMPTZ | Message timestamp |

### RLS Policies

- Users can only access their own conversations and messages
- Messages require a valid conversation owned by the user
- Realtime enabled for live streaming updates

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/ai-tutor/index.ts` | Edge function for streaming chat |
| `src/hooks/useTutorChat.ts` | Chat state, streaming, persistence |
| `src/hooks/useTutorContext.ts` | Build context from current page/activity |
| `src/components/tutor/TutorChatButton.tsx` | Floating action button |
| `src/components/tutor/TutorChatPanel.tsx` | Sliding chat panel UI |
| `src/components/tutor/TutorMessage.tsx` | Message component with markdown |
| `src/components/tutor/TutorTypingIndicator.tsx` | Animated streaming indicator |
| `src/contexts/TutorContext.tsx` | Global tutor state provider |
| `src/types/tutor.ts` | TypeScript interfaces |

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Wrap with TutorProvider |
| `src/components/layout/AppLayout.tsx` | Add TutorChatButton |

---

## Edge Function: ai-tutor

The function uses the auto-provisioned `LOVABLE_API_KEY` with graceful error handling:

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /status | Check AI availability and quota |
| POST | /chat | Stream a chat response |

### Key Implementation Details

```typescript
// Always available - auto-provisioned by Lovable Cloud
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

// Graceful handling for edge cases only
if (!LOVABLE_API_KEY) {
  return new Response(
    JSON.stringify({ 
      error: "AI service temporarily unavailable",
      available: false 
    }),
    { status: 503 }
  );
}

// Model selection: Gemini Flash for speed/cost balance
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "google/gemini-3-flash-preview",
    messages: [...],
    stream: true,
  }),
});
```

### Error Handling Matrix

| Status | Meaning | User Message |
|--------|---------|--------------|
| 200 | Success | Normal streaming |
| 401 | Auth failed | "Please sign in to chat" |
| 402 | Quota exhausted | "AI credits temporarily unavailable" |
| 429 | Rate limited | "Atlas is busy, try again shortly" |
| 503 | Service unavailable | "AI service temporarily unavailable" |

---

## Context-Aware Tutoring

Atlas adapts based on where the user is in the application:

| Context | Information Injected | Tutor Behavior |
|---------|---------------------|----------------|
| **General** | User XP, level, enrolled courses | Career guidance, next steps |
| **Work Order** | Criteria, difficulty, attempts | Task-specific help, tips |
| **Course/Lesson** | Module progress, quiz scores | Explain concepts, Q&A |
| **Game (ATS)** | CDL skills, regulations | Driving tips, DOT rules |
| **Game (Fiber_Tech)** | Fiber skills, certs | Splicing, OTDR guidance |
| **Onboarding** | Profile completeness | Setup guidance |

---

## Chat Interface Design

### Floating Action Button (FAB)

```text
┌────────────────────────────────────────────────────────────────────┐
│                          (App Content)                             │
│                                                                    │
│                                                          ┌──────┐  │
│                                                          │  🎓  │  │
│                                                          │ Ask  │  │
│                                                          │Atlas │  │
│                                                          └──────┘  │
└────────────────────────────────────────────────────────────────────┘
```

- Fixed position bottom-right
- Gradient background matching primary theme
- Subtle pulse animation on first visit
- Badge for unread suggestions (future)

### Chat Panel (Sheet/Drawer)

```text
┌─────────────────────────────────────┐
│  🎓 Atlas AI Tutor            [✕]  │
│  Fiber-Tech • Splicing Work Order   │
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Hi! I see you're working on   │  │
│  │ a fiber splicing scenario.    │  │
│  │ Need any tips?                │  │
│  └───────────────────────────────┘  │
│                                     │
│          ┌───────────────────────┐  │
│          │ Yes, I'm having       │  │
│          │ trouble with fusion   │  │
│          │ splice loss values    │  │
│          └───────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Great question! For single-   │  │
│  │ mode fiber, aim for <0.1 dB   │  │
│  │ per splice. Here's how:       │  │
│  │                               │  │
│  │ 1. Clean fiber tips with...  │  │
│  │ ▌                             │  │  ← Streaming cursor
│  └───────────────────────────────┘  │
│                                     │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Ask Atlas anything...          │ │
│ └───────────────────────────┬────┘ │
│                             │ ➤  │ │
└─────────────────────────────────────┘
```

### Message Features

- Markdown rendering with `react-markdown`
- Code block syntax highlighting
- User messages right-aligned (blue gradient)
- Assistant messages left-aligned (surface bg)
- Relative timestamps
- Copy message button on hover

---

## Tutor Personas

### Atlas (General Tutor)

```text
You are "Atlas", an AI tutor for FGN Academy - a workforce development 
platform that uses simulation games to train future professionals.

Student Context:
- XP: {xp} | Level: {level}
- Active Tracks: {games}
- Current Page: {currentPage}

Guidelines:
1. Be encouraging but practical
2. Reference their actual progress
3. Suggest specific next steps (work orders, courses)
4. Keep responses concise (2-3 paragraphs max)
5. Use markdown formatting for lists and emphasis
```

### CDL Trainer (ATS Context)

```text
You are a CDL training specialist helping students practice in 
American Truck Simulator. You understand DOT regulations, pre-trip 
inspections, hours of service, and safe driving practices.

Current Activity: {workOrderTitle}
Criteria: {criteria}
```

### Fiber-Tech Expert

```text
You are a fiber optics installation trainer helping students master 
telecommunications infrastructure skills.

Focus Areas: fusion splicing, OTDR testing, cable management, 
safety practices, FOA/CFOT certifications.
```

---

## Implementation Order

### Phase 1: Foundation (This Implementation)
1. Database migration - conversations and messages tables
2. Edge function - ai-tutor with streaming
3. TypeScript types - Message, Conversation, Context
4. Hooks - useTutorChat, useTutorContext
5. UI components - FAB, Panel, Message
6. Integration - TutorProvider in App.tsx

### Phase 2: Future Enhancements
- Conversation history sidebar
- Suggested questions based on context
- Voice input (Web Speech API)
- Admin analytics dashboard
- Quick action buttons
- Multi-turn memory with summarization

---

## Mobile Responsiveness

| Breakpoint | Behavior |
|------------|----------|
| Desktop (lg+) | Side panel (400px width) |
| Tablet (md) | Side panel (350px width) |
| Mobile (sm) | Full-screen sheet from bottom |

---

## Summary

This implementation provides:

1. **Immediately Functional** - Uses auto-provisioned `LOVABLE_API_KEY`
2. **No Admin Setup Required** - Works out of the box
3. **Streaming Responses** - Real-time token-by-token via SSE
4. **Context Awareness** - Adapts to current page/activity
5. **Persistent History** - Conversations saved to database
6. **Game-Specific Personas** - Specialized guidance per track
7. **Error Resilience** - Graceful handling of rate limits
8. **Mobile Ready** - Full-screen on small devices

