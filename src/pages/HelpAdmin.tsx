import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ShieldCheck, Users, CalendarDays, ClipboardList, FileCheck, Gamepad2, Image,
  KeyRound, Building2, AlertTriangle, Layers, Wand2, Network,
} from 'lucide-react';

const sections = [
  {
    id: 'roles',
    icon: ShieldCheck,
    title: 'Role Hierarchy & Admin Tiers',
    content: (
      <div className="space-y-3">
        <p className="text-muted-foreground">FGN Academy uses a two-tier admin model on top of the global RBAC roles:</p>
        <div className="grid gap-2">
          {[
            { role: 'Super Admin', desc: 'Platform-wide control: tenant CRUD, community review, authorized apps, audit logs, danger zone', color: 'bg-amber-500/20 text-amber-400' },
            { role: 'Platform Admin', desc: 'All admin sections across every community: users, work orders, courses, events, media, webhooks, SIM games, challenge registry', color: 'bg-primary/20 text-primary' },
            { role: 'Community Admin / Owner', desc: 'Scoped to a single tenant. Manages that community via /admin/community-setup — curation, work orders, events, evidence, reg codes, skills paths', color: 'bg-emerald-500/20 text-emerald-400' },
            { role: 'Moderator', desc: 'Content moderation capabilities', color: 'bg-blue-500/20 text-blue-400' },
            { role: 'Developer', desc: 'API credential management and developer portal access', color: 'bg-purple-500/20 text-purple-400' },
            { role: 'User (Student)', desc: 'Standard access: work orders, events, leaderboard, profile', color: 'bg-muted text-muted-foreground' },
          ].map(r => (
            <div key={r.role} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Badge className={r.color}>{r.role}</Badge>
              <span className="text-sm text-muted-foreground">{r.desc}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Route guard <code className="bg-muted px-1 rounded">CommunityAdminRoute</code> allows access if the user is a platform admin <em>or</em> a community admin/owner of the currently active tenant.
          Platform-only sections (users, SIM games, webhooks, course builder, challenge registry) are hidden for community admins.
        </p>
      </div>
    ),
  },
  {
    id: 'community-hub',
    icon: Building2,
    title: 'Community Admin Hub',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Community admins land on <code className="bg-muted px-1.5 py-0.5 rounded text-xs">/admin/community-setup</code> — a dashboard scoped to the active tenant. Each card jumps into a focused tool:</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {[
            ['Curation', 'Feature courses, work orders, and events on the community Discover page'],
            ['Work Orders', 'Tenant-scoped work orders and assessments'],
            ['Events', 'Quests and head-to-head competitions for community members'],
            ['Evidence Review', 'Approve / reject / request-revision on submitted evidence'],
            ['Registration Codes', 'Issue codes that auto-join the community and optionally grant roles'],
            ['Skills Paths', 'Curated learning pathways for the community'],
          ].map(([t, d]) => (
            <div key={t} className="p-3 rounded-lg bg-muted/30">
              <div className="text-xs font-medium text-foreground">{t}</div>
              <div className="text-xs mt-0.5">{d}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'communities-table',
    icon: Network,
    title: 'Communities (Platform Admin)',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>The <strong className="text-foreground">Communities</strong> section of the Admin Dashboard (platform admins only) lists every tenant via <code className="bg-muted px-1 rounded">CommunitiesAdminTable</code>.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Browse all tenants in the hierarchy with brand info and category</li>
          <li>Click <strong className="text-foreground">Open as admin</strong> to switch your active tenant (via <code className="bg-muted px-1 rounded">setTenantBySlug</code>) — the Community Admin Hub then operates on that tenant</li>
          <li>From there, every community-scoped tool reflects the selected tenant's data</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'users',
    icon: Users,
    title: 'User Management (Platform)',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Lists all registered users with avatar, username, role badge, employability score, and last-active date.</p>
        <p><strong className="text-foreground">Change roles:</strong> "Manage Role" → select new role → Save. Roles live in <code className="bg-muted px-1 rounded">user_roles</code> and are checked by the <code className="bg-muted px-1 rounded">has_role</code> security-definer RPC.</p>
        <p><strong className="text-foreground">Invite users:</strong> "Invite User" → email, optional username, role, and community. The invitee gets a registration link with the role pre-assigned.</p>
        <p><strong className="text-foreground">Pending invitations:</strong> view and revoke in the collapsible section below the table.</p>
      </div>
    ),
  },
  {
    id: 'work-orders',
    icon: ClipboardList,
    title: 'Work Orders & SIM Categorization',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Work Orders are repeatable scenarios tied to a SIM. Each carries a game title, difficulty, XP reward, optional evidence requirements, and (optionally) an attached assessment simulation.</p>
        <p><strong className="text-foreground">Default SIM Games & Categories:</strong> Configure which SIMs appear in the sidebar's Default SIM Games section under <strong className="text-foreground">Admin → SIM Games</strong>. SIM Categories group games for browsing.</p>
        <p>Toggle active/inactive with the switch. Edit with the pencil icon, delete with the trash icon. Filter by SIM or difficulty.</p>
      </div>
    ),
  },
  {
    id: 'configurator',
    icon: Wand2,
    title: 'Challenge Configurator & Assessments',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Assessments author and attach interactive simulation challenges to work orders. The data model lives in <code className="bg-muted px-1 rounded">simulations</code>, <code className="bg-muted px-1 rounded">simulation_items</code>, and <code className="bg-muted px-1 rounded">simulation_runs</code>.</p>
        <p><strong className="text-foreground">Four archetypes are supported:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><code className="bg-muted px-1 rounded">sequence</code> — order steps correctly</li>
          <li><code className="bg-muted px-1 rounded">loadout</code> — pick the right kit for the job</li>
          <li><code className="bg-muted px-1 rounded">resource_selection</code> — choose appropriate resources from a set</li>
          <li><code className="bg-muted px-1 rounded">method_selection</code> — select the correct method/procedure</li>
        </ul>
        <p>The Configurator publishes via <code className="bg-muted px-1 rounded">attach-assessment-to-workorder</code> (admin-gated). Runs are graded by <code className="bg-muted px-1 rounded">score-simulation</code>, which feeds <code className="bg-muted px-1 rounded">sync-challenge-completion</code> and <code className="bg-muted px-1 rounded">ensure_skill_passport</code> — so passing an assessment writes to the Skill Passport end-to-end.</p>
      </div>
    ),
  },
  {
    id: 'challenge-registry',
    icon: Layers,
    title: 'Challenge Registry (Platform)',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs">/admin/challenge-registry</code> manages cross-platform ID mappings for work orders.</p>
        <p><strong className="text-foreground">Challenges tab:</strong> view all work orders with <code className="bg-muted px-1 rounded">fgn_origin_challenge_id</code> (primary) and legacy <code className="bg-muted px-1 rounded">source_challenge_id</code>; copy UUIDs; edit Breakroom course-name links inline; export Lua/CSV for game scripts.</p>
        <p><strong className="text-foreground">Breakroom Users tab:</strong> add, edit, or delete identity mappings between Breakroom usernames/IDs and FGN user IDs.</p>
        <p>Use this hub together with the <code className="bg-muted px-1 rounded">import-challenge-as-workorder</code> edge function (see the Platform Guide) to bring play.fgn.gg challenges into Academy as work orders.</p>
      </div>
    ),
  },
  {
    id: 'events',
    icon: CalendarDays,
    title: 'Events Management',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Create and manage scheduled competitions. "Create Event" → title, type (Quest or Head-to-Head), schedule, participant limits, optional Work Order linkage.</p>
        <p><strong className="text-foreground">Statuses:</strong> Draft → Published → Registration Open → In Progress → Completed (or Cancelled). Switch status from the table dropdown. Cancelled registrations re-activate on re-register rather than duplicating.</p>
      </div>
    ),
  },
  {
    id: 'evidence',
    icon: FileCheck,
    title: 'Evidence Review',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Review evidence submitted for work-order completions. The queue shows user, work order, file, and status.</p>
        <p><strong className="text-foreground">Actions:</strong> Approve, Reject (with reason), or Request Revision (with feedback). The tab badge shows pending count. Both platform admins and the relevant community admin can review.</p>
      </div>
    ),
  },
  {
    id: 'sim-games',
    icon: Gamepad2,
    title: 'SIM Games & Resources (Platform)',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Configure SIM game channels (name, description, accent color, cover image) and the Default SIM Games shown in the sidebar. Accent colors are the single source of truth for SIM icons across the app.</p>
        <p><strong className="text-foreground">SIM Resources:</strong> external learning resources linked to each SIM (title, description, URL, icon, accent).</p>
        <p><strong className="text-foreground">SIM Categories:</strong> group SIMs for browsing on the public SIM Industry Hub at <code className="bg-muted px-1 rounded">/sim/&lt;game-title&gt;</code>.</p>
      </div>
    ),
  },
  {
    id: 'media',
    icon: Image,
    title: 'Media Library',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Centralized images, YouTube embeds, video files, and audio. Each item has a title, location key, URL, and alt text.</p>
        <p>Filter by type, search by title, toggle active/inactive.</p>
      </div>
    ),
  },
  {
    id: 'reg-codes',
    icon: KeyRound,
    title: 'Registration Codes',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Promotional / invitation codes with optional max uses, expiration, and community assignment. Codes that target a community auto-join the user on use.</p>
        <p><strong className="text-foreground">Bulk operations:</strong> select multiple codes to activate, deactivate, or delete. Export to CSV for reporting.</p>
      </div>
    ),
  },
  {
    id: 'super-admin',
    icon: Building2,
    title: 'Super Admin Features',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p><strong className="text-foreground">Community Review:</strong> approve, reject, or request revision on community submissions (platform only).</p>
        <p><strong className="text-foreground">Authorized Apps:</strong> manage external apps using the Credential API — CORS origins, permissions, encrypted app keys.</p>
        <p><strong className="text-foreground">Tenant Management:</strong> full CRUD with list and tree views. Parent-child hierarchy, categories, brand colors (community-level branding via <code className="bg-muted px-1 rounded">--tenant-primary</code>; FGN pillar colors stay locked).</p>
        <p><strong className="text-foreground">Audit Logs:</strong> system-wide log filtered by action, resource type, and date range — including <code className="bg-muted px-1 rounded">breakroom_lms_poll</code> sync health.</p>
      </div>
    ),
  },
  {
    id: 'danger',
    icon: AlertTriangle,
    title: 'Danger Zone (Super Admin)',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Irreversible operations requiring typed confirmation:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">Purge Inactive User Data</strong> — removes data for users inactive 1+ year</li>
          <li><strong className="text-foreground">Reset All User Progress</strong> — clears all progress data</li>
          <li><strong className="text-foreground">Clear Audit Logs</strong> — deletes logs older than 90 days</li>
        </ul>
      </div>
    ),
  },
];

const HelpAdmin = () => {
  return (
    <AppLayout>
      <div className="space-y-8 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold">Admin User Guide</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive guide for managing the FGN Academy platform. Platform admins land at <code className="bg-muted px-1.5 py-0.5 rounded text-sm">/admin</code>; community admins land at <code className="bg-muted px-1.5 py-0.5 rounded text-sm">/admin/community-setup</code>.
          </p>
        </div>

        <div className="space-y-4">
          {sections.map((section) => (
            <Card key={section.id} id={section.id} className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <section.icon className="h-5 w-5 text-primary" />
                  {section.title}
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

export default HelpAdmin;
