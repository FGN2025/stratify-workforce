// JSON Schemas (draft 2020-12) for every 200 response of the Studio catalog.
// Served unauthenticated at /schemas/{name}.json. Lists marked "x-enum-closed": true
// are closed: adding a value is a breaking change (new contract version).
// Lists marked "x-enum-closed": false are open: readers must accept unknown values.

const BASE = 'https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/studio-catalog/schemas';

export const VISIBILITY_MODES = ['public', 'tenant_private'] as const;
export const MATURITY_STATES = ['unclassified', 'level_1', 'level_2', 'level_3'] as const;
export const EVIDENCE_STATUSES = ['evidence_validated', 'mapped_not_validated', 'catalogued_only'] as const;
export const SCOPE_REASONS = ['owned', 'curated_in'] as const;
export const VOCABULARY_GROUPS = [
  'evidenceBases', 'assessmentOutcomes', 'evidenceTypes', 'evidenceQuality', 'demonstrationStatuses',
  'artifactKinds', 'signalStrengths', 'maturityStates', 'signalStrengthSchemes', 'curationStates',
] as const;

const str = { type: 'string' };
const nstr = { type: ['string', 'null'] };
const uuid = { type: 'string', format: 'uuid' };
const nuuid = { type: ['string', 'null'], format: 'uuid' };
const ts = { type: 'string', format: 'date-time' };
const nts = { type: ['string', 'null'], format: 'date-time' };
const int = { type: 'integer', minimum: 0 };
const closed = (values: readonly string[], nullable = false) => ({
  type: nullable ? ['string', 'null'] : 'string',
  enum: nullable ? [...values, null] : [...values],
  'x-enum-closed': true,
});
const envelope = {
  contractVersion: { ...str, description: 'Contract version that produced this response, e.g. 2026-09-23.1.' },
};
const versionDoc = {
  catalogVersion: { ...int, description: 'Monotonic integer per catalog. Increases on any change in that catalog. Compare numerically; higher is newer.' },
  catalogChangedAt: nts,
};
const scope = {
  type: 'object',
  required: ['tenantId', 'includesDescendants'],
  properties: { tenantId: uuid, includesDescendants: { type: 'boolean' }, tenantIdsInScope: { type: 'array', items: uuid }, note: str },
};
const term = {
  $id: `${BASE}/vocabulary-term.json`,
  type: 'object',
  required: ['value', 'label'],
  additionalProperties: true,
  properties: {
    value: { ...str, pattern: '^[a-z0-9_]+$', description: 'Stable machine value. Match on this, never on label.' },
    label: { ...str, description: 'Display text. May change without a contract version change.' },
  },
};

export const SCHEMAS: Record<string, Record<string, unknown>> = {
  'vocabulary-term': { $schema: 'https://json-schema.org/draft/2020-12/schema', ...term },

  capabilities: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `${BASE}/capabilities.json`,
    type: 'object',
    required: ['contractVersion', 'supportedContractVersions', 'readOnly', 'authenticated', 'catalogVersions', 'unsupported'],
    properties: {
      ...envelope,
      supportedContractVersions: { type: 'array', items: str },
      readOnly: { const: true },
      writeEndpoints: { type: 'array', maxItems: 0 },
      authenticated: { type: 'boolean' },
      tenantId: nuuid,
      tenantLabel: nstr,
      tenantSlug: nstr,
      includesDescendants: { type: 'boolean' },
      tokenExpiresAt: ts,
      scopes: { type: 'array', items: str },
      capabilities: { type: 'array', items: str },
      catalogVersions: {
        type: 'object',
        additionalProperties: { type: 'object', required: ['version', 'lastChangedAt'], properties: { version: int, lastChangedAt: ts } },
      },
      unsupported: { type: 'array', items: { type: 'object', required: ['capability', 'reason'], properties: { capability: str, reason: str } } },
      note: str,
    },
  },

  skills: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `${BASE}/skills.json`,
    type: 'object',
    required: ['contractVersion', 'catalogVersion', 'scope', 'totalCount', 'items', 'ambiguousAliases', 'nextCursor'],
    properties: {
      ...envelope, ...versionDoc, scope, totalCount: int,
      items: {
        type: 'array',
        items: {
          type: 'object',
          required: ['skillId', 'skillKey', 'label', 'curationState', 'evidenceStatus', 'recordVersion', 'aliases'],
          properties: {
            skillId: uuid,
            skillKey: { ...str, description: 'Stable Academy skill identifier. Never reused.' },
            label: str,
            description: nstr,
            domain: nstr,
            classification: { type: ['string', 'null'], description: 'Open list; see /vocabulary.', 'x-enum-closed': false },
            curationState: { ...str, description: 'Open list; current values in /vocabulary curationStates.', 'x-enum-closed': false },
            evidenceStatus: closed(EVIDENCE_STATUSES),
            level3WorkOrderCount: int,
            mappedWorkOrderCount: int,
            skillVersion: { type: ['integer', 'null'], description: 'Editorial version of the skill definition. Increases when meaning changes.' },
            recordVersion: { ...int, description: 'Row change counter. Increases on any edit. Use for change detection.' },
            updatedAt: nts,
            aliases: {
              type: 'array',
              items: { type: 'object', required: ['aliasKey', 'ambiguous'], properties: { aliasKey: str, gameScope: nstr, source: nstr, ambiguous: { type: 'boolean' } } },
            },
          },
        },
      },
      ambiguousAliases: { type: 'array', items: { type: 'object', required: ['aliasKey', 'resolvesTo', 'resolvable'], properties: { aliasKey: str, resolvesTo: { type: 'array', items: uuid }, resolvable: { const: false } } } },
      evidenceCoverage: { type: 'object' },
      nextCursor: nstr,
    },
  },

  'work-orders': {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `${BASE}/work-orders.json`,
    type: 'object',
    required: ['contractVersion', 'catalogVersion', 'scope', 'totalCount', 'items', 'nextCursor'],
    properties: {
      ...envelope, ...versionDoc, scope, totalCount: int,
      filtersApplied: { type: 'object' },
      note: str,
      items: {
        type: 'array',
        items: {
          type: 'object',
          required: ['workOrderId', 'title', 'gameTitle', 'activityId', 'academyNative', 'maturityState', 'scopeReason', 'visibility', 'recordVersion'],
          properties: {
            workOrderId: uuid,
            title: { type: ['string', 'null'], description: 'Author title. Null means untitled; Academy never publishes an untitled Work Order, and displays "Untitled work order" only in admin previews. Studio should apply its own placeholder.' },
            description: nstr,
            gameTitle: { ...str, description: 'Open list (game_title enum); new games may appear.', 'x-enum-closed': false },
            activityId: { type: ['string', 'null'], description: 'Canonical FGN.GG simulation activity. Null = Academy-native.' },
            academyNative: { type: 'boolean' },
            sourceChallengeId: nstr,
            originChallengeId: nstr,
            maturity: { type: ['integer', 'null'], enum: [1, 2, 3, null] },
            maturityState: closed(MATURITY_STATES),
            maturityApprovedAt: nts,
            maturityReviewNote: nstr,
            scopeReason: { ...closed(SCOPE_REASONS), description: 'owned = owner tenant is in scope; curated_in = owned elsewhere, included === true for a tenant in scope.' },
            visibility: {
              type: 'object',
              required: ['ownerTenantId', 'visibilityMode', 'isActive', 'curationSupported', 'curatedForTenants'],
              properties: {
                ownerTenantId: nuuid,
                ownerTenantLabel: nstr,
                visibilityMode: { ...closed(VISIBILITY_MODES, true), description: 'public = any organization may see it, subject to its own curation. tenant_private = owner organization and its child organizations only; curation does not apply. null = hidden from learners everywhere (fail-closed).' },
                isActive: { type: 'boolean', description: 'false = inactive draft, never shown to learners.' },
                curationSupported: { type: 'boolean', description: 'true when visibilityMode is public (curation rows take effect). false otherwise (curation rows are ignored).' },
                curationScopeNote: str,
                curatedForTenants: { type: 'array', items: { type: 'object', required: ['tenantId', 'included'], properties: { tenantId: uuid, tenantLabel: nstr, included: { type: 'boolean' } } } },
              },
            },
            recordVersion: { ...int, description: 'Row change counter. Increases on any edit.' },
            createdAt: ts,
          },
        },
      },
      nextCursor: nstr,
    },
  },

  vocabulary: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `${BASE}/vocabulary.json`,
    type: 'object',
    required: ['contractVersion', 'vocabularyVersion', 'partial', 'unsupported'],
    properties: {
      ...envelope,
      vocabularyVersion: { ...str, description: 'Content hash (md5) of all groups. Opaque; compare for equality only.' },
      derivedFrom: str,
      partial: { type: 'boolean' },
      unsupported: { type: 'array', items: { type: 'object', required: ['group', 'reason'], properties: { group: str, reason: str } } },
      ...Object.fromEntries(VOCABULARY_GROUPS.map((g) => [g, { type: 'array', items: { $ref: `${BASE}/vocabulary-term.json` }, description: 'Values are live from the database (open list). A group may be absent only when it is listed in unsupported[].' }])),
    },
    'x-group-names-closed': true,
  },

  sources: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `${BASE}/sources.json`,
    type: 'object',
    required: ['contractVersion', 'items', 'nextCursor'],
    properties: {
      ...envelope,
      items: {
        type: 'array',
        items: {
          type: 'object',
          required: ['sourceId', 'label', 'sourceVersion', 'owner'],
          properties: {
            sourceId: { ...str, enum: ['canonical-skills', 'work-order-catalog', 'evidence-vocabulary', 'gg-activity-cache'], 'x-enum-closed': false },
            label: str,
            sourceVersion: { ...int, description: 'Same counter as catalogVersion for that catalog.' },
            lastChangedAt: nts,
            lastSyncedAt: nts,
            owner: str,
            recordCount: int,
          },
        },
      },
      nextCursor: { type: 'null' },
    },
  },
};

export const VERSIONING_POLICY = {
  rule: 'Additive changes keep the contract version; breaking changes mint a new one.',
  additive: ['new optional field', 'new endpoint', 'new value in a list marked x-enum-closed: false', 'label text changes'],
  breaking: ['removing or renaming a field', 'changing a type or nullability', 'adding or removing a value in a list marked x-enum-closed: true', 'changing the meaning of a field or value', 'making an optional field required'],
  readerObligations: ['ignore unknown fields', 'accept unknown values in open lists', 'flag unknown values in closed lists as contract drift'],
  overlap: 'After a breaking change the previous version stays in supportedContractVersions for at least 90 days.',
};
