import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { useSiteMediaUrl } from '@/hooks/useSiteMedia';

interface PageHeroProps {
  title: string;
  subtitle: string;
  backgroundImage?: string;
  locationKey?: string;
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
  locationKey,
  primaryAction,
  secondaryAction,
  stats,
  children,
}: PageHeroProps) {
  // Fetch dynamic image if locationKey provided
  const dynamicImageUrl = useSiteMediaUrl(locationKey || '');
  const imageUrl = locationKey ? dynamicImageUrl : backgroundImage;
  const fallbackImage = 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1920&q=80';

  return (
    <section className="relative overflow-hidden rounded-2xl mb-8">
      {/* Background with overlay */}
      <div className="absolute inset-0">
        <img 
          src={imageUrl || fallbackImage}
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-10 sm:py-12 md:py-16 max-w-2xl xl:max-w-3xl 2xl:max-w-4xl">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold tracking-tight text-balance">
          {title}
        </h1>
        
        <p className="text-muted-foreground text-sm sm:text-base md:text-lg mt-3 sm:mt-4 max-w-lg">
          {subtitle}
        </p>
        
        {(primaryAction || secondaryAction) && (
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4 mt-6">
            {primaryAction && (
              <Button size="lg" className="gap-2 h-11 px-6 w-full sm:w-auto" onClick={primaryAction.onClick}>
                {primaryAction.icon}
                {primaryAction.label}
              </Button>
            )}
            {secondaryAction && (
              <Button variant="outline" size="lg" className="gap-2 h-11 px-6 w-full sm:w-auto" onClick={secondaryAction.onClick}>
                {secondaryAction.icon}
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
        
        {/* Stats ticker */}
        {stats && stats.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4 sm:gap-8 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-border/50">
            {stats.map((stat, idx) => (
              <div key={idx}>
                <p className={cn(
                  "font-data text-xl sm:text-2xl",
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
