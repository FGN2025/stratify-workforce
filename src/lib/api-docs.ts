// API Documentation Data Structures
// Centralized data for the developer portal

export const API_BASE_URL = 'https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
export type AuthType = 'none' | 'bearer' | 'apikey';

export interface ApiParameter {
  name: string;
  location: 'path' | 'query' | 'header' | 'body';
  type: string;
  required: boolean;
  description: string;
  example?: string;
  enum?: string[];
}

export interface ApiResponse {
  status: number;
  description: string;
  example?: Record<string, unknown>;
}

export interface ApiEndpoint {
  id: string;
  method: HttpMethod;
  path: string;
  title: string;
  description: string;
  auth: AuthType;
  tags: string[];
  parameters: ApiParameter[];
  requestBody?: {
    description: string;
    example: Record<string, unknown>;
  };
  responses: ApiResponse[];
}

export interface ApiSection {
  id: string;
  title: string;
  description: string;
  baseUrl: string;
  endpoints: ApiEndpoint[];
}

// Credential API Endpoints
export const CREDENTIAL_API: ApiSection = {
  id: 'credential-api',
  title: 'Credential API',
  description: 'Issue, verify, and query skill credentials in the FGN ecosystem.',
  baseUrl: `${API_BASE_URL}/credential-api`,
  endpoints: [
    {
      id: 'get-passport',
      method: 'GET',
      path: '/passport/{slug}',
      title: 'Get Public Passport',
      description: 'Retrieve a user\'s public skill passport by URL slug.',
      auth: 'none',
      tags: ['Public', 'Passports'],
      parameters: [
        {
          name: 'slug',
          location: 'path',
          type: 'string',
          required: true,
          description: 'Public URL slug of the passport',
          example: 'john-doe-cdl',
        },
        {
          name: 'game',
          location: 'query',
          type: 'string',
          required: false,
          description: 'Filter credentials by game',
          enum: ['ATS', 'Farming_Sim', 'Construction_Sim', 'Mechanic_Sim'],
        },
      ],
      responses: [
        {
          status: 200,
          description: 'Passport with credentials',
          example: {
            passport: {
              slug: 'john-doe-cdl',
              user: { username: 'john-doe', avatar_url: null, employability_score: 85 },
            },
            credentials: [],
          },
        },
        { status: 404, description: 'Passport not found or not public' },
      ],
    },
    {
      id: 'verify-credential',
      method: 'POST',
      path: '/credentials/verify',
      title: 'Verify Credential',
      description: 'Verify the authenticity of a credential using its verification hash.',
      auth: 'none',
      tags: ['Public', 'Verification'],
      parameters: [],
      requestBody: {
        description: 'Verification hash from the credential',
        example: { verification_hash: 'a1b2c3d4e5f6...' },
      },
      responses: [
        {
          status: 200,
          description: 'Verification result',
          example: { valid: true, expired: false, credential: {} },
        },
        { status: 400, description: 'Missing verification_hash' },
        { status: 404, description: 'Credential not found' },
      ],
    },
    {
      id: 'list-credential-types',
      method: 'GET',
      path: '/catalog/credential-types',
      title: 'List Credential Types',
      description: 'Get all active credential types available in the system.',
      auth: 'none',
      tags: ['Public', 'Catalog'],
      parameters: [
        {
          name: 'game',
          location: 'query',
          type: 'string',
          required: false,
          description: 'Filter by game title',
          enum: ['ATS', 'Farming_Sim', 'Construction_Sim', 'Mechanic_Sim'],
        },
      ],
      responses: [
        {
          status: 200,
          description: 'List of credential types',
          example: { credential_types: [] },
        },
      ],
    },
    {
      id: 'get-my-credentials',
      method: 'GET',
      path: '/credentials/mine',
      title: 'Get My Credentials',
      description: 'Retrieve all credentials for the authenticated user.',
      auth: 'bearer',
      tags: ['Authenticated', 'Credentials'],
      parameters: [
        {
          name: 'game',
          location: 'query',
          type: 'string',
          required: false,
          description: 'Filter by game title',
          enum: ['ATS', 'Farming_Sim', 'Construction_Sim', 'Mechanic_Sim'],
        },
      ],
      responses: [
        { status: 200, description: 'User\'s credentials', example: { credentials: [] } },
        { status: 401, description: 'Authorization required' },
      ],
    },
    {
      id: 'issue-credential',
      method: 'POST',
      path: '/credentials/issue',
      title: 'Issue Credential',
      description: 'Issue a new credential to a user (authorized apps only).',
      auth: 'apikey',
      tags: ['Authorized Apps', 'Credentials'],
      parameters: [],
      requestBody: {
        description: 'Credential issuance request',
        example: {
          user_email: 'trainee@example.com',
          credential_type_key: 'ats_pre_trip',
          score: 95,
          skills_verified: ['pre_trip_inspection', 'defensive_driving'],
          external_reference_id: 'session_12345',
        },
      },
      responses: [
        { status: 201, description: 'Credential issued successfully' },
        { status: 400, description: 'Invalid credential type' },
        { status: 401, description: 'Invalid API key' },
        { status: 403, description: 'Insufficient permissions' },
        { status: 404, description: 'User not found' },
      ],
    },
    {
      id: 'get-user-credentials',
      method: 'GET',
      path: '/credentials/user/{email}',
      title: 'Get User Credentials',
      description: 'Retrieve credentials for a specific user by email (authorized apps only).',
      auth: 'apikey',
      tags: ['Authorized Apps', 'Credentials'],
      parameters: [
        {
          name: 'email',
          location: 'path',
          type: 'string',
          required: true,
          description: 'URL-encoded user email/username',
          example: 'trainee%40example.com',
        },
        {
          name: 'game',
          location: 'query',
          type: 'string',
          required: false,
          description: 'Filter by game title',
          enum: ['ATS', 'Farming_Sim', 'Construction_Sim', 'Mechanic_Sim'],
        },
      ],
      responses: [
        { status: 200, description: 'User\'s credentials' },
        { status: 401, description: 'Invalid API key' },
        { status: 403, description: 'App does not have read permission' },
        { status: 404, description: 'User not found' },
      ],
    },
  ],
};

// Public Catalog API Endpoints
export const PUBLIC_CATALOG_API: ApiSection = {
  id: 'public-catalog',
  title: 'Public Catalog API',
  description: 'Browse training content: courses, work orders, and skills taxonomy.',
  baseUrl: `${API_BASE_URL}/public-catalog`,
  endpoints: [
    {
      id: 'list-games',
      method: 'GET',
      path: '/games',
      title: 'List Games',
      description: 'Get all available simulation games with content counts.',
      auth: 'none',
      tags: ['Public', 'Games'],
      parameters: [],
      responses: [
        {
          status: 200,
          description: 'List of games',
          example: {
            games: [
              { key: 'ATS', name: 'American Truck Simulator', skills_count: 12, work_orders_count: 45 },
            ],
          },
        },
      ],
    },
    {
      id: 'list-courses',
      method: 'GET',
      path: '/courses',
      title: 'List Courses',
      description: 'Get all published training courses.',
      auth: 'none',
      tags: ['Public', 'Courses'],
      parameters: [
        {
          name: 'difficulty',
          location: 'query',
          type: 'string',
          required: false,
          description: 'Filter by difficulty level',
          enum: ['beginner', 'intermediate', 'advanced', 'expert'],
        },
        {
          name: 'limit',
          location: 'query',
          type: 'integer',
          required: false,
          description: 'Results per page (max: 100)',
          example: '50',
        },
        {
          name: 'offset',
          location: 'query',
          type: 'integer',
          required: false,
          description: 'Number of results to skip',
          example: '0',
        },
      ],
      responses: [
        {
          status: 200,
          description: 'List of courses',
          example: { courses: [], total: 0, limit: 50, offset: 0 },
        },
      ],
    },
    {
      id: 'get-course',
      method: 'GET',
      path: '/courses/{id}',
      title: 'Get Course Details',
      description: 'Get a course with its modules and lessons.',
      auth: 'none',
      tags: ['Public', 'Courses'],
      parameters: [
        {
          name: 'id',
          location: 'path',
          type: 'string',
          required: true,
          description: 'Course UUID',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
      ],
      responses: [
        { status: 200, description: 'Course with modules and lessons' },
        { status: 404, description: 'Course not found' },
      ],
    },
    {
      id: 'list-work-orders',
      method: 'GET',
      path: '/work-orders',
      title: 'List Work Orders',
      description: 'Get all active simulation challenges.',
      auth: 'none',
      tags: ['Public', 'Work Orders'],
      parameters: [
        {
          name: 'game',
          location: 'query',
          type: 'string',
          required: false,
          description: 'Filter by game title',
          enum: ['ATS', 'Farming_Sim', 'Construction_Sim', 'Mechanic_Sim'],
        },
        {
          name: 'difficulty',
          location: 'query',
          type: 'string',
          required: false,
          description: 'Filter by difficulty level',
          enum: ['beginner', 'intermediate', 'advanced', 'expert'],
        },
        {
          name: 'limit',
          location: 'query',
          type: 'integer',
          required: false,
          description: 'Results per page (max: 100)',
          example: '50',
        },
        {
          name: 'offset',
          location: 'query',
          type: 'integer',
          required: false,
          description: 'Number of results to skip',
          example: '0',
        },
      ],
      responses: [
        {
          status: 200,
          description: 'List of work orders',
          example: { work_orders: [], total: 0, limit: 50, offset: 0 },
        },
      ],
    },
    {
      id: 'get-work-order',
      method: 'GET',
      path: '/work-orders/{id}',
      title: 'Get Work Order Details',
      description: 'Get detailed information about a work order.',
      auth: 'none',
      tags: ['Public', 'Work Orders'],
      parameters: [
        {
          name: 'id',
          location: 'path',
          type: 'string',
          required: true,
          description: 'Work order UUID',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
      ],
      responses: [
        { status: 200, description: 'Work order details' },
        { status: 404, description: 'Work order not found' },
      ],
    },
    {
      id: 'list-skills',
      method: 'GET',
      path: '/skills',
      title: 'Get Skills Taxonomy',
      description: 'Get the standardized skills for a simulation game.',
      auth: 'none',
      tags: ['Public', 'Skills'],
      parameters: [
        {
          name: 'game',
          location: 'query',
          type: 'string',
          required: true,
          description: 'Game title (required)',
          enum: ['ATS', 'Farming_Sim', 'Construction_Sim', 'Mechanic_Sim'],
        },
      ],
      responses: [
        {
          status: 200,
          description: 'Skills taxonomy',
          example: { game: 'ATS', skills: [{ key: 'pre_trip_inspection', name: 'Pre-Trip Inspection' }] },
        },
        { status: 400, description: 'Missing game parameter' },
      ],
    },
  ],
};

// All APIs
export const ALL_APIS: ApiSection[] = [CREDENTIAL_API, PUBLIC_CATALOG_API];

// Helper to get auth description
export function getAuthDescription(auth: AuthType): string {
  switch (auth) {
    case 'none':
      return 'No authentication required';
    case 'bearer':
      return 'Requires Bearer token (JWT)';
    case 'apikey':
      return 'Requires X-App-Key header';
    default:
      return 'Unknown';
  }
}

// Helper to get method color
export function getMethodColor(method: HttpMethod): string {
  switch (method) {
    case 'GET':
      return 'bg-emerald-500';
    case 'POST':
      return 'bg-blue-500';
    case 'PUT':
      return 'bg-amber-500';
    case 'DELETE':
      return 'bg-red-500';
    case 'PATCH':
      return 'bg-purple-500';
    default:
      return 'bg-gray-500';
  }
}

// Code examples
export interface CodeExample {
  language: 'bash' | 'typescript' | 'python';
  label: string;
  code: string;
}

export function generateCodeExamples(endpoint: ApiEndpoint, baseUrl: string): CodeExample[] {
  const fullPath = `${baseUrl}${endpoint.path}`;
  const examples: CodeExample[] = [];

  // cURL example
  let curlCmd = `curl`;
  if (endpoint.method !== 'GET') {
    curlCmd += ` -X ${endpoint.method}`;
  }
  curlCmd += ` \\\n  "${fullPath}"`;
  
  if (endpoint.auth === 'bearer') {
    curlCmd += ` \\\n  -H "Authorization: Bearer YOUR_JWT_TOKEN"`;
  } else if (endpoint.auth === 'apikey') {
    curlCmd += ` \\\n  -H "X-App-Key: YOUR_API_KEY"`;
  }
  
  if (endpoint.requestBody) {
    curlCmd += ` \\\n  -H "Content-Type: application/json"`;
    curlCmd += ` \\\n  -d '${JSON.stringify(endpoint.requestBody.example, null, 2).replace(/\n/g, '\n  ')}'`;
  }
  
  examples.push({ language: 'bash', label: 'cURL', code: curlCmd });

  // TypeScript example
  let tsCode = `const response = await fetch("${fullPath}"`;
  if (endpoint.method !== 'GET' || endpoint.auth !== 'none') {
    tsCode += `, {\n`;
    if (endpoint.method !== 'GET') {
      tsCode += `  method: "${endpoint.method}",\n`;
    }
    tsCode += `  headers: {\n`;
    if (endpoint.auth === 'bearer') {
      tsCode += `    "Authorization": \`Bearer \${token}\`,\n`;
    } else if (endpoint.auth === 'apikey') {
      tsCode += `    "X-App-Key": apiKey,\n`;
    }
    if (endpoint.requestBody) {
      tsCode += `    "Content-Type": "application/json",\n`;
    }
    tsCode += `  },\n`;
    if (endpoint.requestBody) {
      tsCode += `  body: JSON.stringify(${JSON.stringify(endpoint.requestBody.example, null, 2).replace(/\n/g, '\n  ')}),\n`;
    }
    tsCode += `}`;
  }
  tsCode += `);\n\nconst data = await response.json();`;
  
  examples.push({ language: 'typescript', label: 'TypeScript', code: tsCode });

  return examples;
}
