import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Rocket, User, BookOpen, ClipboardList, CalendarDays, Trophy, Users, Gamepad2, Bot, Lightbulb, KeyRound } from 'lucide-react';

const sections = [
  {
    id: 'getting-started',
    icon: Rocket,
    title: 'Welcome & Getting Started',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>FGN Academy is a simulation-based learning platform where you earn real workforce credentials by completing challenges across our supported SIMs — American Truck Simulator, Farming Simulator, Construction Simulator, Mechanic Simulator, Fiber-Tech Simulator, and more as new industry SIMs come online.</p>
        <p><strong className="text-foreground">Creating your account:</strong></p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Click "Join FGN Academy" and enter your email, password, and username — or sign in with Google or Discord.</li>
          <li>Verify your email via the link sent to your inbox.</li>
          <li>Complete onboarding (name, validated address via Smarty, optional Discord link).</li>
          <li>Enter a registration code if you have one — this auto-joins you to a community.</li>
        </ol>
      </div>
    ),
  },
  {
    id: 'profile',
    icon: User,
    title: 'Your Skill Passport (Profile)',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Your Skill Passport is your digital credential portfolio. Progress on the platform is measured in <strong className="text-foreground">XP only</strong> — never hours played.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">Employability Score</strong> — composite 0–100 from credentials, skill diversity, and pass rate</li>
          <li><strong className="text-foreground">XP & Level</strong> — earned by completing work orders, lessons, and quizzes</li>
          <li><strong className="text-foreground">Credentials</strong> — verifiable certifications with a cryptographic hash</li>
          <li><strong className="text-foreground">Badges</strong> — milestone achievements</li>
          <li><strong className="text-foreground">Skill Radar</strong> — distribution across the skills taxonomy</li>
        </ul>
        <p>Make your passport public to share a verifiable URL at <code className="bg-muted px-1 rounded">/passport/&lt;slug&gt;</code>, embed it on a partner site via <code className="bg-muted px-1 rounded">/passport/embed</code>, or share a QR code so employers can verify individual credentials at <code className="bg-muted px-1 rounded">/verify</code>.</p>
      </div>
    ),
  },
  {
    id: 'learn',
    icon: BookOpen,
    title: 'Discover & Learn',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>The <strong className="text-foreground">Discover</strong> page features community highlights, featured work orders, and upcoming events as horizontal carousels.</p>
        <p>The <strong className="text-foreground">Learn</strong> section contains structured Courses. Each course has a 1:1 module-to-lesson layout, and you earn XP at the lesson level for completed lessons and passed quizzes.</p>
      </div>
    ),
  },
  {
    id: 'work-orders',
    icon: ClipboardList,
    title: 'Work Orders',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Work Orders are the core challenges on the platform — each is tied to a SIM, has a difficulty level, XP reward, and a list of tasks.</p>
        <p><strong className="text-foreground">Completing a Work Order:</strong></p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Browse and filter by SIM or difficulty.</li>
          <li>Open a Work Order to see its tasks and any attached assessment.</li>
          <li>Launch the SIM and complete the tasks. Completions sync automatically from FGN Play (webhook) and Breakroom (15-minute poll).</li>
          <li>Upload evidence if the work order requires it — review states are <em>Pending</em>, <em>Approved</em>, <em>Rejected</em>, or <em>Revision Requested</em>.</li>
          <li>Pass (score ≥ 70%) to earn XP and a Skill Credential on your passport.</li>
        </ol>
      </div>
    ),
  },
  {
    id: 'sim-industry',
    icon: Gamepad2,
    title: 'SIM Industry Hubs',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Each SIM has a dedicated hub at <code className="bg-muted px-1 rounded">/sim/&lt;game-title&gt;</code> that aggregates everything tied to that industry:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Curriculum (courses and lessons specific to the SIM)</li>
          <li>Active work orders</li>
          <li>Career pathways and credentials</li>
          <li>External resources curated by admins</li>
        </ul>
        <p>The sidebar's SIM Games section opens the hub for that industry. Default SIMs and categories are managed by platform admins.</p>
      </div>
    ),
  },
  {
    id: 'events',
    icon: CalendarDays,
    title: 'Events & Competitions',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Events are scheduled competitions — <strong className="text-foreground">Quests</strong> (complete objectives in a time window) or <strong className="text-foreground">Head-to-Head</strong> (bracket tournaments).</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Browse the Events page for upcoming competitions.</li>
          <li>Register before the deadline. If you cancel and re-register, your prior record is re-activated rather than duplicated.</li>
          <li>Join at the scheduled time and compete.</li>
          <li>View brackets and results on the event detail page.</li>
        </ol>
      </div>
    ),
  },
  {
    id: 'leaderboard',
    icon: Trophy,
    title: 'Leaderboard',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>The Leaderboard ranks operators by Employability Score and XP earned. Filters include:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">All SIMs</strong> — global rankings</li>
          <li><strong className="text-foreground">Per-SIM tabs</strong> — rankings within Trucking, Farming, Construction, Mechanic, Fiber-Tech, etc.</li>
          <li><strong className="text-foreground">Top 3 Podium</strong> — current champions</li>
          <li>Your row is highlighted with a "You" label</li>
        </ul>
        <p>Climb by completing work orders, passing assessments, and finishing courses. Time-based stats do not factor in.</p>
      </div>
    ),
  },
  {
    id: 'communities',
    icon: Users,
    title: 'Communities',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Communities are tenants (schools, employers, training programs) that organize work orders, events, and courses for their members. You can:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Browse and join communities from the marketplace</li>
          <li>Request membership (some require approval by the community admin)</li>
          <li>View community-scoped work orders, events, and skills paths</li>
          <li>Switch your active community context from the sidebar selector</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'reg-codes',
    icon: KeyRound,
    title: 'Registration Codes',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Registration codes are issued by community admins or platform admins. When you enter one during onboarding (or later in Settings):</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>You're automatically joined to that community</li>
          <li>Any role grant attached to the code is applied</li>
          <li>The code's use count and expiration are checked server-side</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'atlas',
    icon: Bot,
    title: 'Atlas — AI Tutor',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p><strong className="text-foreground">Atlas</strong> is the AI tutor, available via the chat button in the bottom corner. Atlas is SIM-aware — it adapts its persona based on the SIM you're currently viewing (Trucking, Farming, Construction, Mechanic, Fiber-Tech, etc.).</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Walks through work order requirements and task strategy</li>
          <li>Explains SIM mechanics and scoring</li>
          <li>Helps you prep for knowledge-check quizzes</li>
          <li>Answers general platform questions</li>
        </ul>
        <p>Conversations are saved so you can pick up where you left off.</p>
      </div>
    ),
  },
  {
    id: 'tips',
    icon: Lightbulb,
    title: 'Tips & Troubleshooting',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p><strong className="text-foreground">Tips for success:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Complete work orders regularly — XP and credentials compound</li>
          <li>Join a community for exclusive events and tailored work orders</li>
          <li>Ask Atlas when you're stuck</li>
          <li>Upload clear, well-labelled evidence for faster review</li>
        </ul>
        <Separator className="my-3" />
        <p><strong className="text-foreground">Common issues:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">Can't log in</strong> — check email verification, try the Google or Discord button, or reset your password</li>
          <li><strong className="text-foreground">Completion not showing</strong> — FGN Play webhooks are near-instant; Breakroom polls every 15 minutes</li>
          <li><strong className="text-foreground">Evidence upload failing</strong> — check file size and allowed types</li>
          <li><strong className="text-foreground">Missing from Leaderboard</strong> — complete at least one Work Order</li>
          <li><strong className="text-foreground">Community join pending</strong> — some require admin approval</li>
        </ul>
      </div>
    ),
  },
];

const HelpStudent = () => {
  return (
    <AppLayout>
      <div className="space-y-8 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold">Student User Guide</h1>
          <p className="text-muted-foreground mt-2">
            Everything you need to know about using FGN Academy to earn credentials and climb the leaderboard.
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

export default HelpStudent;
