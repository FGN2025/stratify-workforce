import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTenant } from '@/contexts/TenantContext';
import { useSiteMediaUrl } from '@/hooks/useSiteMedia';
import { JoinFGNAcademyDialog } from './JoinFGNAcademyDialog';
import { ArrowRight, Play } from 'lucide-react';

export function HeroSection() {
  const { tenant, appName } = useTenant();
  const heroImageUrl = useSiteMediaUrl('home_hero_image');
  const [showSkillsDialog, setShowSkillsDialog] = useState(false);

  return (
    <>
      <section className="relative overflow-hidden rounded-2xl mb-8">
        {/* Background with overlay */}
        <div className="absolute inset-0">
          <img 
            src={heroImageUrl}
            alt="Industrial training"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-24 max-w-2xl xl:max-w-3xl 2xl:max-w-4xl">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight text-balance">
            <span className="block text-foreground">WELCOME TO THE</span>
            <span className="block text-primary mt-1">WORLD OF</span>
            <span className="block text-foreground">SIMULATION GAMES</span>
            <span className="block text-primary mt-1">FOR SKILLS DISCOVERY</span>
          </h1>
          
          <p className="text-muted-foreground text-base sm:text-lg mt-4 sm:mt-6 max-w-lg">
            Compete. Community. Careers.
          </p>
          
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4 mt-6 sm:mt-8">
            <Button 
              size="lg" 
              className="gap-2 h-12 px-6 w-full sm:w-auto"
              onClick={() => setShowSkillsDialog(true)}
            >
              Join {appName}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <a href="https://youtu.be/CaahdKITpEs" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="gap-2 h-12 px-6 w-full sm:w-auto">
                <Play className="h-4 w-4" />
                Watch Demo
              </Button>
            </a>
          </div>
          
        </div>
      </section>

      <JoinFGNAcademyDialog 
        open={showSkillsDialog} 
        onOpenChange={setShowSkillsDialog} 
      />
    </>
  );
}
