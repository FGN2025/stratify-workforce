import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Rocket, User, BookOpen, ClipboardList, CalendarDays, Trophy, Users, Gamepad2, Bot, Lightbulb } from 'lucide-react';

const sections = [
  {
    id: 'getting-started',
    icon: Rocket,
    title: 'Welcome & Getting Started',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>FGN Academy is a simulation-based learning platform where you earn real workforce credentials by completing challenges in games like American Truck Simulator, Farming Simulator, Construction Simulator, Mechanic Simulator, and Fiber-Tech Simulator.</p>
        <p><strong className="text-foreground">Creating your account:</strong></p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Click "Join FGN Academy" and enter your email, password, and username.</li>
          <li>Verify your email via the link sent to your inbox.</li>
          <li>Complete the onboarding form (name, address, optional Discord ID).</li>
          <li>Enter a registration code if you have one for community access.</li>
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
        <p>Your Skill Passport is your digital credential portfolio showing:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">Employability Score</strong> — your overall rating</li>
          <li><strong className="text-foreground">XP & Level</strong> — experience from completing challenges</li>
          <li><strong className="text-foreground">Credentials</strong> — verified achievements and certifications</li>
          <li><strong className="text-foreground">Badges</strong> — visual milestone achievements</li>
          <li><strong className="text-foreground">Skill Radar</strong> — chart showing skill distribution</li>
          <li><strong className="text-foreground">Game Stats</strong> — hours, sessions, and scores per game</li>
        </ul>
        <p>Make your Skill Passport public so employers can verify your credentials.</p>
      </div>
    ),
  },
  {
    id: 'learn',
    icon: BookOpen,
    title: 'Discover & Learn',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>The <strong className="text-foreground">Discover</strong> page features community highlights, featured work orders, and upcoming events.</p>
        <p>The <strong className="text-foreground">Learn</strong> section contains structured courses organized into modules and lessons. Completing lessons earns XP.</p>
      </div>
    ),
  },
  {
    id: 'work-orders',
    icon: ClipboardList,
    title: 'Work Orders',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Work Orders are the core challenges on the platform. Each is tied to a simulation game with a difficulty level, XP reward, estimated time, and specific tasks.</p>
        <p><strong className="text-foreground">Completing a Work Order:</strong></p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Browse and filter by game or difficulty.</li>
          <li>Click a Work Order to see its tasks.</li>
          <li>Launch the simulation game and complete the tasks.</li>
          <li>Upload evidence if required (screenshots, videos).</li>
          <li>Your progress is tracked via play.fgn.gg telemetry.</li>
          <li>Earn XP and boost your Employability Score!</li>
        </ol>
      </div>
    ),
  },
  {
    id: 'events',
    icon: CalendarDays,
    title: 'Events & Competitions',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Events are scheduled competitions. Types include <strong className="text-foreground">Quests</strong> (complete objectives in a time window) and <strong className="text-foreground">Head-to-Head</strong> (bracket tournaments).</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Check the Events calendar for upcoming competitions.</li>
          <li>Register before the deadline.</li>
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
        <p>The Leaderboard ranks all operators by Employability Score. Features:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">All Games</strong> — global rankings across all simulators</li>
          <li><strong className="text-foreground">Per-Game tabs</strong> — rankings within Trucking, Farming, Construction, Mechanic, or Fiber-Tech</li>
          <li><strong className="text-foreground">Top 3 Podium</strong> — highlights current champions</li>
          <li>Your rank is highlighted with a "You" label</li>
        </ul>
        <p>Climb the leaderboard by completing Work Orders and accumulating play time.</p>
      </div>
    ),
  },
  {
    id: 'communities',
    icon: Users,
    title: 'Communities',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Communities are organizations (schools, companies, training programs) on the platform. You can:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Browse and join communities from the marketplace</li>
          <li>Request membership (some require approval)</li>
          <li>View community-specific Work Orders and events</li>
          <li>Connect with other operators in your community</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'resources',
    icon: Gamepad2,
    title: 'Simulation Resources',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>The sidebar links to external resources for each simulator:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">Trucking Simulator</strong> — CDL Quest (learning), CDL Exchange (credentials)</li>
          <li><strong className="text-foreground">Farming, Construction, Mechanic Sims</strong> — Coming Soon</li>
          <li><strong className="text-foreground">Fiber-Tech Simulator</strong> — Admin-managed resources</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'tutor',
    icon: Bot,
    title: 'AI Tutor',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>The AI Tutor is available via the chat button in the bottom corner. It helps with:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Understanding Work Order requirements</li>
          <li>Learning simulation game mechanics</li>
          <li>Improving your scores</li>
          <li>General platform questions</li>
        </ul>
        <p>Conversations are saved so you can continue where you left off.</p>
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
          <li>Complete Work Orders regularly to build your Employability Score</li>
          <li>Join a community for exclusive events and challenges</li>
          <li>Use the AI Tutor when you're stuck</li>
          <li>Upload quality evidence for faster approval</li>
        </ul>
        <Separator className="my-3" />
        <p><strong className="text-foreground">Common issues:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">Can't log in</strong> — check email verification, reset password</li>
          <li><strong className="text-foreground">Progress not updating</strong> — ensure play.fgn.gg telemetry is active</li>
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
