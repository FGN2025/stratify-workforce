import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Globe, Upload, Zap, Award, Gamepad2, Users, Radio, FileCheck,
  Code, GraduationCap, AlertTriangle, ArrowRight, Wand2,
} from 'lucide-react';

const AdminBadge = () => (
  <Badge variant="outline" className="ml-2 text-[10px] border-primary/30 text-primary">Admin</Badge>
);

const sections = [
  {
    id: 'overview',
    icon: Globe,
    title: 'Platform Overview',
    content: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">FGN Academy</strong> is the central training and credentialing hub for the Fiber Gaming Network ecosystem.
          It connects these platforms to deliver a unified workforce-readiness experience:
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { name: 'FGN Academy', desc: 'Core training platform — work orders, credentials, Skill Passport, leaderboards, and LMS courses', url: 'fgn.academy' },
            { name: 'FGN Play', desc: 'Competitive simulation challenges — scores and completions sync back to Academy automatically', url: 'play.fgn.gg' },
            { name: 'Broadband Workforce', desc: 'Industry job board and training tracker — receives quiz results, enrollments, and achievement data', url: 'broadbandworkforce.com' },
          ].map(p => (
            <div key={p.name} className="p-3 rounded-lg bg-muted/30 space-y-1">
              <div className="font-medium text-foreground">{p.name}</div>
              <div className="text-xs">{p.desc}</div>
              <div className="text-xs text-primary">{p.url}</div>
            </div>
          ))}
        </div>
        <pre className="bg-muted/50 p-4 rounded-lg text-xs overflow-x-auto font-mono leading-relaxed">
{`┌──────────────┐    webhook     ┌──────────────┐
│  play.fgn.gg │ ─────────────▶│              │
└──────────────┘  completions   │              │    email match    ┌─────────────────────┐
                                │  FGN Academy │ ────────────────▶ │ broadbandworkforce   │
└──────────────┘                └──────────────┘`}
        </pre>
        <p>FGN Academy is the <strong className="text-foreground">Single Source of Truth (SSOT)</strong> for all training content, user credentials, and career readiness scores.</p>
      </div>
    ),
  },
  {
    id: 'importing',
    icon: Upload,
    title: 'Importing Challenges from play.fgn.gg',
    adminOnly: true,
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Imports are handled by a dedicated, admin-gated edge function. Both the Work Order dialog's "Import from FGN Play" branch and the Configurator call the same endpoint:</p>
        <pre className="bg-muted/50 p-4 rounded-lg text-xs overflow-x-auto font-mono leading-relaxed">
{`POST /functions/v1/import-challenge-as-workorder
Headers: Authorization: Bearer <admin user JWT>
Body:    { "challenge_ids": ["uuid", ...] }   // 1–50 ids

Response:
{ "results": [
  { "challenge_id", "work_order_id",
    "status": "created" | "existing",
    "tasks_imported", "play_source_present" }
] }`}
        </pre>
        <p><strong className="text-foreground">Guarantees:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Admin role enforced server-side via <code className="bg-muted px-1 rounded">has_role(user, 'admin')</code> before the service-role client runs</li>
          <li>Idempotent on <code className="bg-muted px-1 rounded">fgn_origin_challenge_id</code> — re-imports return <code className="bg-muted px-1 rounded">status: 'existing'</code></li>
          <li><code className="bg-muted px-1 rounded">metadata.play_source</code> is set on the single INSERT (no post-insert UPDATE)</li>
          <li>Side effects: upsert <code className="bg-muted px-1 rounded">game_channels</code> keyed on <code className="bg-muted px-1 rounded">game_title</code>; insert <code className="bg-muted px-1 rounded">work_order_tasks</code> with <code className="bg-muted px-1 rounded">order_index</code> and <code className="bg-muted px-1 rounded">source_task_id</code></li>
          <li>Work orders are created with <code className="bg-muted px-1 rounded">is_active = false</code> and a null title (resolver-driven)</li>
        </ul>
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-xs"><strong className="text-foreground">Tip:</strong> Use the <strong className="text-foreground">Challenge Registry</strong> at <code className="bg-muted px-1.5 py-0.5 rounded text-xs">/admin/challenge-registry</code> to view cross-platform ID mappings, export challenge IDs for game scripts, and configure Breakroom course-name links.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'assessments',
    icon: Wand2,
    title: 'Assessments & Skill Passport Recording',
    adminOnly: true,
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Interactive challenges authored by the Configurator are stored as <strong className="text-foreground">simulations</strong> and attached to work orders. Three tables back the feature:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><code className="bg-muted px-1 rounded">simulations</code> — root record (sim_type, briefing, facts, cats, config, track_key, status, tenant)</li>
          <li><code className="bg-muted px-1 rounded">simulation_items</code> — selectable items (item_key, cat_key, correct, critical, seq, why)</li>
          <li><code className="bg-muted px-1 rounded">simulation_runs</code> — graded attempts (archetype, raw, max, percent, grade, stand_down, item_selections, debrief)</li>
        </ul>
        <p><strong className="text-foreground">Four archetypes:</strong> <code className="bg-muted px-1 rounded">sequence</code>, <code className="bg-muted px-1 rounded">loadout</code>, <code className="bg-muted px-1 rounded">resource_selection</code>, <code className="bg-muted px-1 rounded">method_selection</code>. All four are accepted by the CHECK constraints on both tables.</p>
        <p><strong className="text-foreground">Write path:</strong></p>
        <pre className="bg-muted/50 p-4 rounded-lg text-xs overflow-x-auto font-mono leading-relaxed">
{`Author → POST /functions/v1/attach-assessment-to-workorder
Attempt → POST /functions/v1/score-simulation
                 │
                 ▼
        sync-challenge-completion
                 │
                 ▼
           ensure_skill_passport  →  Skill Credential + XP`}
        </pre>
        <p className="text-xs">The score → sync → passport chain is live end-to-end. A passing run writes a credential, awards XP, and triggers <code className="bg-muted px-1 rounded">recalculate_user_skills</code> + <code className="bg-muted px-1 rounded">evaluate_achievements</code>.</p>
      </div>
    ),
  },
  {
    id: 'completion-pipeline',
    icon: Zap,
    title: 'Challenge Completion Pipeline',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>When a student completes a challenge on <strong className="text-foreground">play.fgn.gg</strong>, the platform sends a webhook to Academy:</p>
        <pre className="bg-muted/50 p-4 rounded-lg text-xs overflow-x-auto font-mono leading-relaxed">
{`POST /functions/v1/sync-challenge-completion
Headers:
  X-App-Key: <authorized app key>
  Content-Type: application/json

Body:
{
  "user_id": "uuid",
  "challenge_id": "uuid",        // matches fgn_origin_challenge_id (legacy: source_challenge_id)
  "score": 85,                    // percentage (0-100)
  "completed_at": "ISO-8601",
  "metadata": {
    "tasks": [...],               // granular task-level progress
    "time_taken_seconds": 320
  }
}`}
        </pre>
        <p><strong className="text-foreground">Processing rules:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">Score ≥ 70%</strong> — marked as passed; XP awarded; Skill Credential issued</li>
          <li><strong className="text-foreground">Score &lt; 70%</strong> — recorded but not marked as a pass; no XP or credential</li>
          <li>If the user has <strong className="text-foreground">task-level data</strong>, individual task progress is stored in <code className="bg-muted px-1.5 py-0.5 rounded text-xs">user_task_progress</code></li>
          <li>After processing, the system runs <strong className="text-foreground">recalculate_user_skills</strong> and <strong className="text-foreground">evaluate_achievements</strong> RPCs to update the Skill Passport in real time</li>
        </ul>
        <p className="text-xs text-muted-foreground/70">If the user is not registered on Academy, the webhook returns a structured 404 with details to prompt registration on the game side.</p>
      </div>
    ),
  },
  {
    id: 'passport',
    icon: Award,
    title: 'Skill Passport & Credentials',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Every successful challenge completion generates a <strong className="text-foreground">Skill Credential</strong> stored on the user's <strong className="text-foreground">Skill Passport</strong>.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/30 space-y-1">
            <div className="font-medium text-foreground text-xs">Credential Contents</div>
            <ul className="list-disc pl-4 text-xs space-y-0.5">
              <li>Title and credential type</li>
              <li>Game title and skills verified</li>
              <li>Score achieved</li>
              <li>Issue date and optional expiry</li>
              <li>Cryptographic verification hash</li>
            </ul>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 space-y-1">
            <div className="font-medium text-foreground text-xs">Passport Features</div>
            <ul className="list-disc pl-4 text-xs space-y-0.5">
              <li>Public URL: <code className="bg-muted px-1 rounded">/passport/&lt;slug&gt;</code></li>
              <li>Embeddable widget for partner sites</li>
              <li>QR code for credential verification</li>
              <li>Employer verification at <code className="bg-muted px-1 rounded">/verify</code></li>
              <li>PDF export capability</li>
            </ul>
          </div>
        </div>
        <p>
          <strong className="text-foreground">Employability Score:</strong> A composite metric (0–100) calculated from total credentials, skill diversity, and completion rates.
          Updated in real time after each completion via server-side RPCs.
        </p>
      </div>
    ),
  },
  {
    id: 'identity',
    icon: Users,
    title: 'Cross-Platform Identity',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Users are linked across platforms using different identity anchors:</p>
        <div className="space-y-2">
          {[
            { from: 'play.fgn.gg', to: 'FGN Academy', method: 'Shared user UUID — the same user_id exists on both Supabase projects', icon: '🔗' },
            { from: 'FGN Academy', to: 'broadbandworkforce.com', method: 'Email address match — the user\'s auth email is used to find the corresponding BBW account', icon: '📧' },
          ].map(link => (
            <div key={link.from + link.to} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <span className="text-lg">{link.icon}</span>
              <div>
                <div className="text-xs font-medium text-foreground">{link.from} <ArrowRight className="inline h-3 w-3 mx-1" /> {link.to}</div>
                <div className="text-xs mt-0.5">{link.method}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'challenge-registry',
    icon: FileCheck,
    title: 'Challenge Registry',
    adminOnly: true,
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>
          The <strong className="text-foreground">Challenge Registry</strong> at <code className="bg-muted px-1.5 py-0.5 rounded text-xs">/admin/challenge-registry</code> is the admin tool for managing cross-platform challenge mappings.
        </p>
        <p><strong className="text-foreground">Challenges Tab:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>View all Work Orders with their <code className="bg-muted px-1 rounded">source_challenge_id</code> mappings</li>
          <li>Copy UUIDs to clipboard for use in game integration scripts</li>
          <li><strong className="text-foreground">Export tools:</strong> CSV export of challenge IDs</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'api',
    icon: Code,
    title: 'Credential API & Public Catalog',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>FGN Academy exposes two REST APIs for external integrations:</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/30 space-y-2">
            <div className="font-medium text-foreground text-xs">Credential API</div>
            <div className="text-xs space-y-1">
              <p><strong className="text-foreground">Auth:</strong> JWT (user) or API Key (app)</p>
              <p>Issue, read, and verify credentials programmatically. Used by FGN Play and authorized partner apps.</p>
              <p><strong className="text-foreground">Endpoints:</strong> <code className="bg-muted px-1 rounded">/credential-api</code></p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 space-y-2">
            <div className="font-medium text-foreground text-xs">Public Catalog</div>
            <div className="text-xs space-y-1">
              <p><strong className="text-foreground">Auth:</strong> None (public)</p>
              <p>Read-only access to courses, games, skills taxonomy, and work orders. Used by partner websites and widgets.</p>
              <p><strong className="text-foreground">Endpoints:</strong> <code className="bg-muted px-1 rounded">/public-catalog</code></p>
            </div>
          </div>
        </div>
        <p className="text-xs">
          Developers can access the full API reference and manage app credentials at <code className="bg-muted px-1.5 py-0.5 rounded text-xs">/developers</code>.
        </p>
      </div>
    ),
  },
  {
    id: 'tracks',
    icon: GraduationCap,
    title: 'Track Completion & Knowledge Checks',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>
          Challenges are organized into <strong className="text-foreground">training tracks</strong> (e.g., OSHA Safety, Fiber Optics).
          When a student completes all challenges in a track, the system automatically:
        </p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Detects track completion during the <code className="bg-muted px-1.5 py-0.5 rounded text-xs">sync-challenge-completion</code> processing</li>
          <li>Sends a <strong className="text-foreground">knowledge_check_available</strong> notification to the user</li>
          <li>Links to the corresponding LMS quiz (stored as <code className="bg-muted px-1.5 py-0.5 rounded text-xs">lesson_type = 'quiz'</code>)</li>
        </ol>
        <p>
          Knowledge check quizzes require an <strong className="text-foreground">80% passing score</strong>.
          Passing awards additional credentials and contributes to career readiness scores.
        </p>
      </div>
    ),
  },
];

const HelpGuide = () => {
  return (
    <AppLayout>
      <div className="space-y-8 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold">FGN Academy Platform Guide</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive reference for the FGN ecosystem — how challenges, credentials, and user data flow between fgn.academy, play.fgn.gg and broadbandworkforce.com.
          </p>
        </div>

        <div className="space-y-4">
          {sections.map((section) => (
            <Card key={section.id} id={section.id} className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <section.icon className="h-5 w-5 text-primary" />
                  {section.title}
                  {'adminOnly' in section && section.adminOnly && <AdminBadge />}
                </CardTitle>
              </CardHeader>
              <CardContent>{section.content}</CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default HelpGuide;
