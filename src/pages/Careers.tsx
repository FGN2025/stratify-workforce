import { AppLayout } from '@/components/layout/AppLayout';
import { PageHero } from '@/components/marketplace/PageHero';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ExternalLink, Truck, Tractor, HardHat, Wrench, Cable, GraduationCap, Award, ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { SIM_RESOURCES } from '@/config/simResources';
import { useAuth } from '@/contexts/AuthContext';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';

const CAREER_PATHS = [
  {
    id: 'cdl-class-a',
    title: 'CDL Class A Driver',
    industry: 'Trucking & Logistics',
    icon: Truck,
    accentColor: 'hsl(var(--primary))',
    gameTrack: 'ATS' as const,
    description: 'Operate commercial motor vehicles over 26,001 lbs. The trucking industry is the backbone of American commerce.',
    avgSalary: '$55,000 – $80,000',
    demandLevel: 'Very High',
    apprenticeshipLink: 'https://www.apprenticeship.gov/apprenticeship-occupations/tractor-trailer-truck-drivers',
    partnerLinks: [
      { label: 'CDL Quest Training', href: 'https://simu-cdl-path.lovable.app' },
      { label: 'CDL Exchange', href: 'https://skill-truck-path.lovable.app' },
    ],
  },
  {
    id: 'fiber-technician',
    title: 'Fiber Optic Technician',
    industry: 'Broadband & Telecommunications',
    icon: Cable,
    accentColor: '#3B82F6',
    gameTrack: 'Fiber_Tech' as const,
    description: 'Install, maintain, and repair fiber optic communication systems. Critical for bridging the digital divide in rural America.',
    avgSalary: '$45,000 – $75,000',
    demandLevel: 'Very High',
    apprenticeshipLink: 'https://www.apprenticeship.gov/apprenticeship-occupations/telecommunications-technicians',
    partnerLinks: [
      { label: 'Broadband Workforce', href: 'https://broadbandworkforce.com' },
    ],
  },
  {
    id: 'heavy-equipment-operator',
    title: 'Heavy Equipment Operator',
    industry: 'Construction & Infrastructure',
    icon: HardHat,
    accentColor: '#F59E0B',
    gameTrack: 'Construction_Sim' as const,
    description: 'Operate bulldozers, cranes, excavators, and other heavy machinery for infrastructure and building projects.',
    avgSalary: '$50,000 – $85,000',
    demandLevel: 'High',
    apprenticeshipLink: 'https://www.apprenticeship.gov/apprenticeship-occupations/operating-engineers',
    partnerLinks: [],
  },
  {
    id: 'ag-equipment-tech',
    title: 'Agricultural Equipment Technician',
    industry: 'Agriculture & Food Systems',
    icon: Tractor,
    accentColor: '#22C55E',
    gameTrack: 'Farming_Sim' as const,
    description: 'Maintain and operate precision agricultural equipment. Modern agriculture is increasingly technology-driven.',
    avgSalary: '$40,000 – $65,000',
    demandLevel: 'High',
    apprenticeshipLink: 'https://www.apprenticeship.gov/apprenticeship-occupations/farm-equipment-mechanics',
    partnerLinks: [],
  },
  {
    id: 'diesel-mechanic',
    title: 'Diesel Mechanic',
    industry: 'Automotive & Fleet Services',
    icon: Wrench,
    accentColor: '#EF4444',
    gameTrack: 'Mechanic_Sim' as const,
    description: 'Diagnose, repair, and maintain diesel engines and heavy-duty vehicles critical to transportation and agriculture.',
    avgSalary: '$48,000 – $72,000',
    demandLevel: 'High',
    apprenticeshipLink: 'https://www.apprenticeship.gov/apprenticeship-occupations/bus-truck-mechanics-diesel-engine-specialists',
    partnerLinks: [],
  },
];

function readinessColor(pct: number) {
  if (pct >= 75) return 'text-green-500';
  if (pct >= 50) return 'text-yellow-500';
  if (pct >= 25) return 'text-orange-500';
  return 'text-muted-foreground';
}

export default function Careers() {
  const { user } = useAuth();
  const { data: readinessMap } = useCareerReadiness();

  // Fetch requirements from DB for display
  const { data: requirements } = useRequirements();

  return (
    <AppLayout>
      <div className="space-y-10">
        <PageHero
          title="Career Pathways"
          subtitle="From simulation training to real-world apprenticeships. Your Skill Passport maps directly to industry career paths recognized by the U.S. Department of Labor."
          backgroundImage="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&h=600&fit=crop"
          stats={[
            { value: `${CAREER_PATHS.length}`, label: 'Career Paths' },
            { value: '5', label: 'Simulation Tracks' },
            { value: 'DOL', label: 'Recognized' },
          ]}
        />

        {/* Partner Organizations */}
        <section>
          <h2 className="text-lg font-bold uppercase tracking-wide mb-4 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Partner Organizations
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <a href="https://www.apprenticeship.gov/" target="_blank" rel="noopener noreferrer"
              className="glass-card p-4 hover:border-primary/40 transition-colors group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">U.S. Department of Labor</p>
                  <p className="text-xs text-muted-foreground">National Apprenticeship System</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </a>
            <a href="https://www.tirap.org/" target="_blank" rel="noopener noreferrer"
              className="glass-card p-4 hover:border-primary/40 transition-colors group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">TIRAP</p>
                  <p className="text-xs text-muted-foreground">Trucking Industry RAP</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </a>
            <a href="https://broadbandworkforce.com/" target="_blank" rel="noopener noreferrer"
              className="glass-card p-4 hover:border-primary/40 transition-colors group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Broadband Workforce</p>
                  <p className="text-xs text-muted-foreground">Fiber Optic Career Hub</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </a>
          </div>
        </section>

        {/* Career Paths */}
        <section className="space-y-6">
          <h2 className="text-lg font-bold uppercase tracking-wide flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Apprenticeship Pathways
          </h2>

          {CAREER_PATHS.map((career) => {
            const Icon = career.icon;
            const gameConfig = SIM_RESOURCES[career.gameTrack];
            const readiness = readinessMap?.[career.id];
            const pct = readiness?.readinessPct ?? 0;
            const matchedLabels = readiness?.matchedLabels ?? [];
            const pathReqs = requirements?.filter(r => r.career_path_id === career.id) ?? [];

            return (
              <Card key={career.id} className="overflow-hidden hover:border-primary/30 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${career.accentColor}20` }}>
                        <Icon className="h-6 w-6" style={{ color: career.accentColor }} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{career.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">{career.industry}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={career.demandLevel === 'Very High' ? 'default' : 'secondary'}>
                        {career.demandLevel} Demand
                      </Badge>
                      <Badge variant="outline">{career.avgSalary}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{career.description}</p>

                  {/* Sim Track */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Simulation Track:</span>
                    <Badge variant="outline" className="gap-1">
                      {gameConfig.shortTitle}
                    </Badge>
                  </div>

                  {/* Readiness */}
                  {user && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Apprenticeship Readiness</span>
                        <span className={`font-semibold ${readinessColor(pct)}`}>{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  )}

                  {/* Required Credentials with match status */}
                  <div>
                    <p className="text-xs font-medium mb-2">Required Credentials:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {pathReqs.length > 0
                        ? pathReqs.map((req) => {
                            const earned = matchedLabels.includes(req.display_label);
                            return (
                              <Badge
                                key={req.id}
                                variant={earned ? 'default' : 'outline'}
                                className="text-[10px] gap-1"
                              >
                                {earned
                                  ? <CheckCircle2 className="h-3 w-3" />
                                  : <Circle className="h-3 w-3 text-muted-foreground" />
                                }
                                {req.display_label}
                              </Badge>
                            );
                          })
                        : /* Fallback if requirements haven't loaded */
                          null
                      }
                    </div>
                  </div>

                  {/* Links */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button asChild size="sm" variant="default">
                      <a href={career.apprenticeshipLink} target="_blank" rel="noopener noreferrer">
                        View on Apprenticeship.gov <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                    {career.partnerLinks.map((link) => (
                      <Button key={link.href} asChild size="sm" variant="outline">
                        <a href={link.href} target="_blank" rel="noopener noreferrer">
                          {link.label} <ArrowRight className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      </div>
    </AppLayout>
  );
}

// Hook to fetch requirements for display labels
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Requirement {
  id: string;
  career_path_id: string;
  display_label: string;
  sort_order: number;
}

function useRequirements() {
  return useQuery({
    queryKey: ['career-path-requirements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('career_path_requirements')
        .select('id, career_path_id, display_label, sort_order')
        .order('sort_order');
      if (error) throw error;
      return data as Requirement[];
    },
  });
}
