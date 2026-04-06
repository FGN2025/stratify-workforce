import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Globe, Upload, Zap, Award, Gamepad2, Users, Radio, FileCheck,
  Code, GraduationCap, AlertTriangle, ArrowRight, Shield, Database
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
          It connects four platforms to deliver a unified workforce-readiness experience:
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { name: 'FGN Academy', desc: 'Core training platform — work orders, credentials, Skill Passport, leaderboards, and LMS courses', url: 'fgn.academy' },
            { name: 'FGN Play', desc: 'Competitive simulation challenges — scores and completions sync back to Academy automatically', url: 'play.fgn.gg' },
            { name: 'Broadband Workforce', desc: 'Industry job board and training tracker — receives quiz results, enrollments, and achievement data', url: 'broadbandworkforce.com' },
            { name: 'Breakroom', desc: 'Virtual world training environment — quiz completions are polled and synced to Academy every 15 minutes', url: 'curator.sine.space' },
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
┌──────────────┐   15-min poll  │   (SSOT)     │   quiz + stats   │        .com          │
│  Breakroom   │ ─────────────▶│              │                   └─────────────────────┘
└──────────────┘  quiz results  └──────────────┘`}
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
        <p>Admins can import simulation challenges from FGN Play directly into the Academy as Work Orders.</p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Navigate to <strong className="text-foreground">Admin Dashboard → Work Orders</strong></li>
          <li>Click <strong className="text-foreground">"New Work Order"</strong></li>
          <li>Select <strong className="text-foreground">"Import from FGN Play"</strong> in the dialog</li>
          <li>Browse available challenges — each shows title, game, difficulty, and XP reward</li>
          <li>Click <strong className="text-foreground">"Import"</strong> to create the Work Order</li>
        </ol>
        <p>
          The import stores the original challenge UUID as <code className="bg-muted px-1.5 py-0.5 rounded text-xs">source_challenge_id</code> on the Work Order.
          This ID is the permanent cross-platform link used by the completion webhook.
        </p>
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-xs"><strong className="text-foreground">💡 Tip:</strong> Use the <strong className="text-foreground">Challenge Registry</strong> at <code className="bg-muted px-1.5 py-0.5 rounded text-xs">/admin/challenge-registry</code> to view and manage all cross-platform ID mappings, export challenge IDs for game scripts, and configure Breakroom course name links.</p>
        </div>
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
  "challenge_id": "uuid",        // matches source_challenge_id
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
    id: 'breakroom',
    icon: Gamepad2,
    title: 'Breakroom Integration',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">Breakroom</strong> is a virtual world training environment hosted on <code className="bg-muted px-1.5 py-0.5 rounded text-xs">curator.sine.space</code>.
          Quiz completions in Breakroom are automatically synced to Academy.
        </p>
        <pre className="bg-muted/50 p-4 rounded-lg text-xs overflow-x-auto font-mono leading-relaxed">
{`┌─────────────┐  pg_cron (every 15 min)  ┌─────────────────────┐
│  PostgreSQL  │ ───────────────────────▶ │ breakroom-lms-poll  │
│  (pg_net)    │                          │  (Edge Function)    │
└─────────────┘                          └────────┬────────────┘
                                                  │ For each new quiz
                                                  ▼
                                         ┌─────────────────────┐
                                         │ breakroom-lms-sync  │
                                         │  (Edge Function)    │
                                         └────────┬────────────┘
                                                  │
                                   ┌──────────────┼──────────────┐
                                   ▼              ▼              ▼
                              fgn.academy    bbw.com       Audit Logs`}
        </pre>
        <p><strong className="text-foreground">How it works:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>A <strong className="text-foreground">pg_cron</strong> job fires every 15 minutes, calling the <code className="bg-muted px-1.5 py-0.5 rounded text-xs">breakroom-lms-poll</code> edge function</li>
          <li>The poll function queries the Breakroom API for all students and their completed quizzes</li>
          <li>New quiz completions are deduplicated against existing records (via <code className="bg-muted px-1.5 py-0.5 rounded text-xs">breakroom_quiz_id</code> in metadata)</li>
          <li>Each new completion is forwarded to <code className="bg-muted px-1.5 py-0.5 rounded text-xs">breakroom-lms-sync</code> for processing</li>
          <li>The sync function resolves identities, writes work order completions, and cross-posts to broadbandworkforce.com</li>
        </ul>
        <div className="p-3 rounded-lg bg-muted/30">
          <p className="text-xs"><strong className="text-foreground">Course Mapping:</strong> Breakroom quizzes are matched to Academy Work Orders via the <code className="bg-muted px-1 rounded">metadata-&gt;&gt;'breakroom_course_name'</code> field on the Work Order. Set this in the <strong className="text-foreground">Challenge Registry</strong>.</p>
        </div>
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
            { from: 'Breakroom', to: 'FGN Academy', method: 'breakroom_identity table — maps breakroom_username and breakroom_user_id to FGN user_id', icon: '🎮' },
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
        <p className="text-xs">
          <strong className="text-foreground">Breakroom identity management:</strong> Use the <strong className="text-foreground">Breakroom Users</strong> tab in the Challenge Registry to add, edit, or remove identity mappings.
        </p>
      </div>
    ),
  },
  {
    id: 'bbw-sync',
    icon: Radio,
    title: 'Broadband Workforce Sync',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>
          When a completion is processed (from either FGN Play or Breakroom), the <code className="bg-muted px-1.5 py-0.5 rounded text-xs">breakroom-lms-sync</code> function cross-posts data to
          <strong className="text-foreground"> broadbandworkforce.com</strong> using the user's email address for identity matching.
        </p>
        <p><strong className="text-foreground">Data sent to BBW:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Quiz attempt records (title, score, pass/fail, timestamp)</li>
          <li>Lesson progress updates</li>
          <li>Course enrollment status</li>
          <li>User statistics (total XP, completions count)</li>
          <li>Achievement and badge awards</li>
        </ul>
        <p className="text-xs text-muted-foreground/70">
          BBW sync requires the <code className="bg-muted px-1 rounded">BBW_SUPABASE_URL</code> and <code className="bg-muted px-1 rounded">BBW_SUPABASE_SERVICE_ROLE_KEY</code> secrets to be configured.
        </p>
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
          <li>Edit the <strong className="text-foreground">Breakroom Course Name</strong> inline to link Breakroom quizzes to Work Orders</li>
          <li><strong className="text-foreground">Export tools:</strong> Generate Lua tables or PowerShell/CSV exports of challenge IDs for use in game server scripts</li>
        </ul>
        <p><strong className="text-foreground">Breakroom Users Tab:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>View all Breakroom identity mappings with linked FGN user info</li>
          <li>Add new mappings by searching for users by email</li>
          <li>Edit Breakroom username and numeric user ID</li>
          <li>Delete orphaned or incorrect mappings</li>
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
  {
    id: 'monitoring',
    icon: AlertTriangle,
    title: 'Monitoring & Troubleshooting',
    adminOnly: true,
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p><strong className="text-foreground">Checking Breakroom sync health:</strong></p>
        <p className="text-xs">
          View <strong className="text-foreground">Audit Logs</strong> in the Super Admin panel filtered by action <code className="bg-muted px-1 rounded">breakroom_lms_poll</code>.
          A healthy poll shows <code className="bg-muted px-1 rounded">students_found &gt; 0</code> with no errors.
        </p>

        <Separator />

        <p><strong className="text-foreground">Common issues:</strong></p>
        <div className="space-y-2">
          {[
            { symptom: 'students_found: 0 with 401/403 errors', cause: 'Breakroom session tokens expired', fix: 'Refresh all 3 session secrets (token, cookies, JWT) from browser DevTools' },
            { symptom: 'Students found but quizzes_found: 0', cause: 'No completed quizzes or missing breakroom_user_id', fix: 'Verify identity mapping in Challenge Registry → Breakroom Users' },
            { symptom: 'sync_errors > 0', cause: 'breakroom-lms-sync function failures', fix: 'Check edge function logs for detailed error messages' },
            { symptom: 'No audit log entries for polls', cause: 'Cron job not running or function not deployed', fix: 'Verify pg_cron job exists and function is deployed' },
          ].map(issue => (
            <div key={issue.symptom} className="p-3 rounded-lg bg-muted/30 text-xs space-y-1">
              <div><strong className="text-foreground">Symptom:</strong> {issue.symptom}</div>
              <div><strong className="text-foreground">Cause:</strong> {issue.cause}</div>
              <div><strong className="text-foreground">Fix:</strong> {issue.fix}</div>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-xs"><strong className="text-destructive">⚠️ Breakroom tokens expire approximately weekly.</strong> When tokens expire, no new quiz completions will sync. Refresh tokens by logging into curator.sine.space and extracting cookies from browser DevTools.</p>
        </div>
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
            Comprehensive reference for the FGN ecosystem — how challenges, credentials, and user data flow between fgn.academy, play.fgn.gg, broadbandworkforce.com, and Breakroom.
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
