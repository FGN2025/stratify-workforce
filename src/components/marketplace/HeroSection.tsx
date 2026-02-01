import { Button } from '@/components/ui/button';
import { useTenant } from '@/contexts/TenantContext';
import { ArrowRight, Play } from 'lucide-react';

export function HeroSection() {
  const { tenant } = useTenant();

  return (
    <section className="relative overflow-hidden rounded-2xl mb-8">
      {/* Background with overlay */}
      <div className="absolute inset-0">
        <img 
          src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&h=600&fit=crop"
          alt="Industrial training"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 px-8 py-16 md:py-24 max-w-2xl">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
          <span className="block text-foreground">WELCOME TO THE</span>
          <span className="block text-primary mt-1">WORLD OF</span>
          <span className="block text-foreground">INDUSTRIAL TRAINING</span>
        </h1>
        
        <p className="text-muted-foreground text-lg mt-6 max-w-lg">
          Community. Skill Verification. Telemetry. {tenant?.name || 'FGN Academy'}.
        </p>
        
        <div className="flex flex-wrap items-center gap-4 mt-8">
          <Button size="lg" className="gap-2 h-12 px-6">
            Join {tenant?.name || 'FGN Academy'}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg" className="gap-2 h-12 px-6">
            <Play className="h-4 w-4" />
            Watch Demo
          </Button>
        </div>
        
        {/* Stats ticker */}
        <div className="flex items-center gap-8 mt-12 pt-6 border-t border-border/50">
          <div>
            <p className="font-data text-2xl text-primary">2,500+</p>
            <p className="text-xs text-muted-foreground">Active Operators</p>
          </div>
          <div>
            <p className="font-data text-2xl text-foreground">180+</p>
            <p className="text-xs text-muted-foreground">Work Orders</p>
          </div>
          <div>
            <p className="font-data text-2xl text-foreground">45</p>
            <p className="text-xs text-muted-foreground">Communities</p>
          </div>
        </div>
      </div>
    </section>
  );
}
