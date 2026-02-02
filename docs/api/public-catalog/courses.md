# Public Catalog API - Courses

## GET /courses

List all published courses with summary information.

### Request

```
GET /courses?limit={limit}&offset={offset}&difficulty={level}
```

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Results per page (max: 100) |
| `offset` | number | 0 | Number of results to skip |
| `difficulty` | string | - | Filter by level: beginner, intermediate, advanced, expert |

### Response

```json
{
  "courses": [
    {
      "id": "uuid",
      "title": "CDL Fundamentals",
      "description": "Learn the basics of commercial driving",
      "cover_image_url": "https://...",
      "difficulty_level": "beginner",
      "estimated_hours": 10,
      "xp_reward": 500,
      "module_count": 5,
      "lesson_count": 20,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "total": 15,
  "limit": 50,
  "offset": 0
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique course identifier |
| `title` | string | Course title |
| `description` | string | Course description |
| `cover_image_url` | string | Cover image URL |
| `difficulty_level` | string | beginner, intermediate, advanced, expert |
| `estimated_hours` | number | Estimated completion time |
| `xp_reward` | number | XP earned on completion |
| `module_count` | number | Number of modules |
| `lesson_count` | number | Total lessons across all modules |
| `created_at` | string | ISO 8601 timestamp |

### Example

```bash
# Get all courses
curl https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/public-catalog/courses

# Get beginner courses, page 2
curl "https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/public-catalog/courses?difficulty=beginner&limit=10&offset=10"
```

---

## GET /courses/:id

Get detailed course information including modules and lessons.

### Request

```
GET /courses/{course_id}
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `course_id` | string | Yes | UUID of the course |

### Response

```json
{
  "course": {
    "id": "uuid",
    "title": "CDL Fundamentals",
    "description": "Learn the basics of commercial driving licensing and vehicle operation.",
    "cover_image_url": "https://...",
    "difficulty_level": "beginner",
    "estimated_hours": 10,
    "xp_reward": 500,
    "created_at": "2026-01-01T00:00:00Z",
    "modules": [
      {
        "id": "uuid",
        "title": "Module 1: Pre-Trip Inspection",
        "description": "Learn to perform thorough vehicle inspections",
        "order_index": 1,
        "xp_reward": 100,
        "lessons": [
          {
            "id": "uuid",
            "title": "Introduction to Pre-Trip",
            "lesson_type": "video",
            "duration_minutes": 15,
            "xp_reward": 25,
            "order_index": 1
          },
          {
            "id": "uuid",
            "title": "Exterior Inspection",
            "lesson_type": "article",
            "duration_minutes": 10,
            "xp_reward": 25,
            "order_index": 2
          },
          {
            "id": "uuid",
            "title": "Pre-Trip Quiz",
            "lesson_type": "quiz",
            "duration_minutes": 5,
            "xp_reward": 50,
            "order_index": 3
          }
        ]
      }
    ]
  }
}
```

### Lesson Types

| Type | Description |
|------|-------------|
| `video` | Video lesson |
| `article` | Text/reading content |
| `quiz` | Assessment quiz |
| `work_order` | Practical simulation exercise |

### Errors

| Status | Error | Description |
|--------|-------|-------------|
| 404 | `Course not found` | Course doesn't exist or isn't published |

### Example

```bash
curl https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/public-catalog/courses/123e4567-e89b-12d3-a456-426614174000
```

### TypeScript

```typescript
interface Lesson {
  id: string;
  title: string;
  lesson_type: 'video' | 'article' | 'quiz' | 'work_order';
  duration_minutes: number;
  xp_reward: number;
  order_index: number;
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  xp_reward: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  difficulty_level: string;
  estimated_hours: number | null;
  xp_reward: number;
  created_at: string;
  modules?: Module[];
}

interface CoursesListResponse {
  courses: Course[];
  total: number;
  limit: number;
  offset: number;
}

interface CourseDetailResponse {
  course: Course;
}

// List courses
async function listCourses(params?: {
  limit?: number;
  offset?: number;
  difficulty?: string;
}): Promise<CoursesListResponse> {
  const url = new URL('https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/public-catalog/courses');
  
  if (params?.limit) url.searchParams.set('limit', params.limit.toString());
  if (params?.offset) url.searchParams.set('offset', params.offset.toString());
  if (params?.difficulty) url.searchParams.set('difficulty', params.difficulty);
  
  const response = await fetch(url.toString());
  return response.json();
}

// Get course details
async function getCourse(courseId: string): Promise<CourseDetailResponse> {
  const response = await fetch(
    `https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/public-catalog/courses/${courseId}`
  );
  
  if (!response.ok) {
    throw new Error('Course not found');
  }
  
  return response.json();
}

// Usage
const { courses, total } = await listCourses({ difficulty: 'beginner', limit: 10 });
console.log(`Found ${total} beginner courses`);

const { course } = await getCourse(courses[0].id);
console.log(`${course.title} has ${course.modules?.length || 0} modules`);
```

### Notes

- Only global courses (no tenant) are returned
- Modules and lessons are sorted by `order_index`
- Lesson content is not included (only metadata)
