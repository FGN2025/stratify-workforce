import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface PageHeroProps {
  title: string;
  subtitle: string;
  backgroundImage: string;
  primaryAction?: {
    label: string;
    icon?: ReactNode;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    icon?: ReactNode;
    onClick?: () => void;
  };
  stats?: Array<{
    value: string;
    label: string;
    highlight?: boolean;
  }>;
  children?: ReactNode;
}

export function PageHero({
  title,
  subtitle,
  backgroundImage,
  primaryAction,
  secondaryAction,
  stats,
  children,
}: PageHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl mb-8">
      {/* Background with overlay */}
      <div className="absolute inset-0">
        <img 
          src={backgroundImage}
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 px-8 py-12 md:py-16 max-w-2xl">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
          {title}
        </h1>
        
        <p className="text-muted-foreground text-base md:text-lg mt-4 max-w-lg">
          {subtitle}
        </p>
        
        {(primaryAction || secondaryAction) && (
          <div className="flex flex-wrap items-center gap-4 mt-6">
            {primaryAction && (
              <Button size="lg" className="gap-2 h-11 px-6" onClick={primaryAction.onClick}>
                {primaryAction.icon}
                {primaryAction.label}
              </Button>
            )}
            {secondaryAction && (
              <Button variant="outline" size="lg" className="gap-2 h-11 px-6" onClick={secondaryAction.onClick}>
                {secondaryAction.icon}
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
        
        {/* Stats ticker */}
        {stats && stats.length > 0 && (
          <div className="flex items-center gap-8 mt-8 pt-6 border-t border-border/50">
            {stats.map((stat, idx) => (
              <div key={idx}>
                <p className={cn(
                  "font-data text-2xl",
                  stat.highlight ? "text-primary" : "text-foreground"
                )}>
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
        
        {children}
      </div>
    </section>
  );
}
