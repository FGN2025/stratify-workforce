
# Plan: Comprehensive API Documentation System

## Overview

Build a complete documentation suite for the FGN Ecosystem APIs, including markdown reference docs for internal use, an interactive developer portal at `/developers`, and OpenAPI 3.0 specifications for machine-readable integration.

## Documentation Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         API DOCUMENTATION SYSTEM                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌──────────────────────────────────────────────────────────────────────────┐  │
│   │                    DOCUMENTATION LAYERS                                   │  │
│   │                                                                           │  │
│   │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                │  │
│   │  │  Markdown     │  │  In-App       │  │  OpenAPI      │                │  │
│   │  │  Reference    │  │  Developer    │  │  Specs        │                │  │
│   │  │  Docs         │  │  Portal       │  │  (JSON/YAML)  │                │  │
│   │  │               │  │               │  │               │                │  │
│   │  │  /docs/api/   │  │  /developers  │  │  /docs/       │                │  │
│   │  │               │  │               │  │  openapi/     │                │  │
│   │  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘                │  │
│   │          │                  │                  │                         │  │
│   │          │                  │                  │                         │  │
│   │          ▼                  ▼                  ▼                         │  │
│   │  ┌─────────────────────────────────────────────────────────────────┐    │  │
│   │  │                    TARGET AUDIENCES                              │    │  │
│   │  │                                                                  │    │  │
│   │  │  Internal Team    │   Partner Devs    │   SDK Generation        │    │  │
│   │  │  GitHub/Code      │   CDL Quest       │   Postman Import        │    │  │
│   │  │  Review           │   CDL Exchange    │   Auto-docs             │    │  │
│   │  └─────────────────────────────────────────────────────────────────┘    │  │
│   │                                                                           │  │
│   └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Markdown Reference Documentation

Create a `/docs/api/` folder structure with comprehensive API reference files.

### File Structure

```text
docs/
├── api/
│   ├── README.md                    # API Overview & Quick Start
│   ├── authentication.md            # Auth guide (API keys, JWT)
│   ├── credential-api/
│   │   ├── README.md                # Credential API overview
│   │   ├── public-endpoints.md      # GET /passport/:slug, POST /verify
│   │   ├── authenticated-endpoints.md  # GET /credentials/mine
│   │   └── authorized-app-endpoints.md # POST /issue, GET /user/:email
│   ├── public-catalog/
│   │   ├── README.md                # Catalog API overview
│   │   ├── games.md                 # GET /games
│   │   ├── courses.md               # GET /courses, GET /courses/:id
│   │   ├── work-orders.md           # GET /work-orders, GET /work-orders/:id
│   │   └── skills.md                # GET /skills
│   └── integration-guides/
│       ├── cdl-quest.md             # CDL Quest integration example
│       └── cdl-exchange.md          # CDL Exchange integration example
└── openapi/
    ├── credential-api.yaml          # OpenAPI 3.0 spec
    └── public-catalog.yaml          # OpenAPI 3.0 spec
```

### Documentation Content

Each markdown file will include:
- Endpoint URL and method
- Request headers and parameters
- Request body schema (with TypeScript types)
- Response schema with examples
- Error codes and handling
- Code examples (JavaScript/TypeScript, cURL)

---

## Part 2: In-App Developer Portal

Create a `/developers` page with interactive API documentation.

### Developer Portal Layout

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         FGN.ACADEMY DEVELOPER PORTAL                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │ Hero Section                                                              │   │
│  │ "Build with FGN.Academy APIs"                                            │   │
│  │ [Get API Key] [View OpenAPI Spec]                                        │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌──────────────┬───────────────────────────────────────────────────────────┐   │
│  │ Navigation   │  Content Area                                              │   │
│  │              │                                                            │   │
│  │ Overview     │  ┌────────────────────────────────────────────────────┐   │   │
│  │ Quick Start  │  │ Authentication                                     │   │   │
│  │ Auth Guide   │  │                                                    │   │   │
│  │              │  │ The FGN.Academy API uses two authentication       │   │   │
│  │ ─────────    │  │ methods depending on the endpoint type:           │   │   │
│  │ CREDENTIAL   │  │                                                    │   │   │
│  │ API          │  │ ┌─────────────────────────────────────────────┐   │   │   │
│  │ • Passport   │  │ │ Public Endpoints      │ No auth required    │   │   │   │
│  │ • Verify     │  │ │ Authenticated         │ Bearer token (JWT)  │   │   │   │
│  │ • Issue      │  │ │ Authorized Apps       │ X-App-Key header    │   │   │   │
│  │ • User       │  │ └─────────────────────────────────────────────┘   │   │   │
│  │              │  │                                                    │   │   │
│  │ ─────────    │  │ Example Request:                                  │   │   │
│  │ PUBLIC       │  │ ┌─────────────────────────────────────────────┐   │   │   │
│  │ CATALOG      │  │ │ curl -X POST \                              │   │   │   │
│  │ • Games      │  │ │   https://vfzj.../credential-api/issue \   │   │   │   │
│  │ • Courses    │  │ │   -H "X-App-Key: your_api_key" \           │   │   │   │
│  │ • Work Ords  │  │ │   -H "Content-Type: application/json" \    │   │   │   │
│  │ • Skills     │  │ │   -d '{"user_email": "...", ...}'          │   │   │   │
│  │              │  │ └─────────────────────────────────────────────┘   │   │   │
│  │ ─────────    │  │                                                    │   │   │
│  │ API Try-It   │  └────────────────────────────────────────────────────┘   │   │
│  │ (Live Test)  │                                                            │   │
│  │              │                                                            │   │
│  └──────────────┴───────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Developer Portal Components

| Component | Purpose |
|-----------|---------|
| `DeveloperPortal.tsx` (page) | Main page layout with sidebar navigation |
| `ApiSidebar.tsx` | Collapsible navigation for API sections |
| `EndpointCard.tsx` | Displays single endpoint with method badge |
| `CodeBlock.tsx` | Syntax-highlighted code with copy button |
| `ApiTryIt.tsx` | Interactive API testing panel |
| `ResponseViewer.tsx` | Pretty-printed JSON response display |
| `SchemaTable.tsx` | Request/response schema documentation |

### Portal Features

1. **Endpoint Reference**: All endpoints listed with method badges (GET, POST)
2. **Code Examples**: JavaScript, cURL, Python snippets with copy buttons
3. **Schema Documentation**: Tables showing request/response fields
4. **Live API Tester**: Send requests to public endpoints directly
5. **Authentication Guide**: Step-by-step for getting API keys
6. **Integration Examples**: Full code samples for CDL Quest/Exchange

---

## Part 3: OpenAPI 3.0 Specifications

Create machine-readable API specs for tooling integration.

### OpenAPI Spec Structure

```yaml
# docs/openapi/credential-api.yaml
openapi: 3.0.3
info:
  title: FGN.Academy Credential API
  version: 1.0.0
  description: |
    Credential management API for the FGN ecosystem.
    Enables external apps to issue, verify, and query skill credentials.
  contact:
    name: FGN Academy Support
    url: https://fgn.academy/developers
    
servers:
  - url: https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api
    description: Production

security:
  - ApiKeyAuth: []
  - BearerAuth: []

paths:
  /passport/{slug}:
    get:
      summary: Get public passport
      tags: [Public]
      parameters:
        - name: slug
          in: path
          required: true
          schema:
            type: string
        - name: game
          in: query
          schema:
            type: string
            enum: [ATS, Farming_Sim, Construction_Sim, Mechanic_Sim]
      responses:
        '200':
          description: Passport with credentials
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PassportResponse'
        '404':
          description: Passport not found
          
  /credentials/verify:
    post:
      summary: Verify a credential
      tags: [Public]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/VerifyRequest'
      responses:
        '200':
          description: Verification result
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/VerifyResponse'

  /credentials/issue:
    post:
      summary: Issue a credential (authorized apps only)
      tags: [Authorized Apps]
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/IssueRequest'
      responses:
        '201':
          description: Credential issued
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/IssueResponse'

components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-App-Key
    BearerAuth:
      type: http
      scheme: bearer
      
  schemas:
    PassportResponse:
      type: object
      properties:
        passport:
          type: object
          properties:
            slug:
              type: string
            user:
              $ref: '#/components/schemas/User'
        credentials:
          type: array
          items:
            $ref: '#/components/schemas/Credential'
```

---

## Files to Create

### Markdown Docs
| File | Content |
|------|---------|
| `docs/api/README.md` | API overview, base URLs, quick start |
| `docs/api/authentication.md` | Auth methods guide |
| `docs/api/credential-api/README.md` | Credential API overview |
| `docs/api/credential-api/public-endpoints.md` | Public endpoints reference |
| `docs/api/credential-api/authenticated-endpoints.md` | JWT-protected endpoints |
| `docs/api/credential-api/authorized-app-endpoints.md` | API key endpoints |
| `docs/api/public-catalog/README.md` | Catalog API overview |
| `docs/api/public-catalog/games.md` | Games endpoint reference |
| `docs/api/public-catalog/courses.md` | Courses endpoints reference |
| `docs/api/public-catalog/work-orders.md` | Work orders endpoints reference |
| `docs/api/public-catalog/skills.md` | Skills endpoint reference |
| `docs/api/integration-guides/cdl-quest.md` | CDL Quest integration guide |
| `docs/api/integration-guides/cdl-exchange.md` | CDL Exchange integration guide |

### OpenAPI Specs
| File | Content |
|------|---------|
| `docs/openapi/credential-api.yaml` | Credential API OpenAPI 3.0 spec |
| `docs/openapi/public-catalog.yaml` | Public Catalog OpenAPI 3.0 spec |

### Developer Portal Components
| File | Purpose |
|------|---------|
| `src/pages/Developers.tsx` | Main developer portal page |
| `src/components/developers/ApiSidebar.tsx` | API navigation sidebar |
| `src/components/developers/EndpointCard.tsx` | Endpoint documentation card |
| `src/components/developers/CodeBlock.tsx` | Syntax-highlighted code block |
| `src/components/developers/ApiTryIt.tsx` | Live API testing panel |
| `src/components/developers/SchemaTable.tsx` | Schema documentation table |
| `src/components/developers/ResponseViewer.tsx` | JSON response viewer |
| `src/lib/api-docs.ts` | API documentation data structures |

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add `/developers` route |
| `src/components/layout/AppSidebar.tsx` | Add "Developers" link in sidebar |

---

## Implementation Summary

### Phase 1: Markdown Documentation
- Create `/docs/api/` folder structure
- Write comprehensive endpoint references
- Include code examples in multiple languages
- Add integration guides for partner sites

### Phase 2: OpenAPI Specifications
- Create YAML specs for both APIs
- Include all schemas, security definitions
- Add example values for all fields
- Enable Postman/Swagger import

### Phase 3: Developer Portal
- Build `/developers` page with tabbed navigation
- Create reusable documentation components
- Implement live API testing for public endpoints
- Add copy-to-clipboard for code examples
- Responsive design for mobile viewing

### Phase 4: Integration
- Add route to App.tsx
- Add sidebar navigation link
- Link from Admin > Authorized Apps to docs
- Add "View Docs" links on API key display

---

## Technical Approach

### CodeBlock Component
- Syntax highlighting using CSS classes
- Language detection (json, bash, typescript)
- Copy button with toast confirmation
- Dark theme matching site design

### ApiTryIt Component
- Dropdown for endpoint selection
- Form fields for path/query parameters
- Headers editor for API keys
- Response panel with timing info
- Only enabled for public endpoints (security)

### Documentation Data
- Centralized in `src/lib/api-docs.ts`
- TypeScript types for endpoints, params, schemas
- Enables programmatic rendering and validation
