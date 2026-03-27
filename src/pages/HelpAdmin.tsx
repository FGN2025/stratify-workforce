import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck, Users, CalendarDays, ClipboardList, FileCheck, Gamepad2, Image, KeyRound, Building2, ScrollText, AlertTriangle } from 'lucide-react';

const sections = [
  {
    id: 'roles',
    icon: ShieldCheck,
    title: 'Role Hierarchy',
    content: (
      <div className="space-y-3">
        <p className="text-muted-foreground">The platform uses a tiered role system:</p>
        <div className="grid gap-2">
          {[
            { role: 'Super Admin', desc: 'Full platform access including tenant management, community review, and dangerous operations', color: 'bg-amber-500/20 text-amber-400' },
            { role: 'Admin', desc: 'User management, work orders, events, media, and evidence review', color: 'bg-primary/20 text-primary' },
            { role: 'Moderator', desc: 'Content moderation capabilities', color: 'bg-blue-500/20 text-blue-400' },
            { role: 'Developer', desc: 'API credential management & developer portal access', color: 'bg-purple-500/20 text-purple-400' },
            { role: 'User (Student)', desc: 'Standard access: work orders, events, leaderboard, profile', color: 'bg-muted text-muted-foreground' },
          ].map(r => (
            <div key={r.role} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Badge className={r.color}>{r.role}</Badge>
              <span className="text-sm text-muted-foreground">{r.desc}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'users',
    icon: Users,
    title: 'User Management',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>View all registered users with avatar, username, role badge, employability score, and last active date.</p>
        <p><strong className="text-foreground">Change roles:</strong> Click "Manage Role" → select new role → Save.</p>
        <p><strong className="text-foreground">Invite users:</strong> Click "Invite User" → enter email, optional username, role, and community. The user receives a registration link with pre-assigned role.</p>
        <p><strong className="text-foreground">Pending invitations:</strong> View and revoke pending invites in the collapsible section below the user table.</p>
      </div>
    ),
  },
  {
    id: 'events',
    icon: CalendarDays,
    title: 'Events Management',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Create and manage scheduled competitions. Click "Create Event" and fill in title, type (Quest or Head-to-Head), schedule, participant limits, and optional Work Order.</p>
        <p><strong className="text-foreground">Event statuses:</strong> Draft → Published → Registration Open → In Progress → Completed (or Cancelled).</p>
        <p>Change status directly from the table dropdown. Filter by status or type.</p>
      </div>
    ),
  },
  {
    id: 'work-orders',
    icon: ClipboardList,
    title: 'Work Orders',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Work Orders are repeatable training scenarios tied to simulation games. Each includes a game title, difficulty level, XP reward, estimated time, and optional evidence requirements.</p>
        <p>Toggle active/inactive with the switch. Edit with the pencil icon, delete with the trash icon.</p>
        <p>Filter by game title or difficulty level.</p>
      </div>
    ),
  },
  {
    id: 'evidence',
    icon: FileCheck,
    title: 'Evidence Review',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Review evidence submitted by users for work order completions. The queue shows user info, work order, file details, and status.</p>
        <p><strong className="text-foreground">Actions:</strong> Approve, Reject (with reason), or Request Revision (with feedback). The tab badge shows pending count.</p>
      </div>
    ),
  },
  {
    id: 'sim-games',
    icon: Gamepad2,
    title: 'SIM Games & Resources',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Configure simulation game channels with name, description, accent color, and cover image. Each game can have one channel.</p>
        <p><strong className="text-foreground">SIM Resources:</strong> External learning resources linked to each game. Add title, description, URL, icon, and accent color.</p>
      </div>
    ),
  },
  {
    id: 'media',
    icon: Image,
    title: 'Media Library',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Centralized management for images, YouTube embeds, video files, and audio. Each item has a title, location key, URL, and alt text.</p>
        <p>Filter by type, search by title, toggle active/inactive status.</p>
      </div>
    ),
  },
  {
    id: 'reg-codes',
    icon: KeyRound,
    title: 'Registration Codes',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Create promotional/invitation codes with optional max uses, expiration, and community assignment.</p>
        <p><strong className="text-foreground">Bulk operations:</strong> Select multiple codes to activate, deactivate, or delete. Export to CSV for reporting.</p>
      </div>
    ),
  },
  {
    id: 'super-admin',
    icon: Building2,
    title: 'Super Admin Features',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p><strong className="text-foreground">Community Review:</strong> Approve, reject, or request revision on community submissions.</p>
        <p><strong className="text-foreground">Authorized Apps:</strong> Manage external apps accessing the Credential API with CORS origins and permissions.</p>
        <p><strong className="text-foreground">Tenant Management:</strong> Full CRUD with List and Tree views. Create tenants with hierarchy, categories, and brand colors.</p>
        <p><strong className="text-foreground">Audit Logs:</strong> System-wide logs with filters by action, resource type, and date range.</p>
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
            Comprehensive guide for managing the FGN Academy platform. Navigate to <code className="bg-muted px-1.5 py-0.5 rounded text-sm">/admin</code> to access the Admin Dashboard.
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
