import { ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ExternalResourceCardProps {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
  ctaLabel: string;
  accentColor?: string;
  variant?: 'default' | 'compact';
}

export function ExternalResourceCard({
  title,
  description,
  href,
  icon,
  ctaLabel,
  accentColor,
  variant = 'default',
}: ExternalResourceCardProps) {
  const isCompact = variant === 'compact';

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group glass-card flex flex-col overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg",
        isCompact ? "p-4" : "p-6"
      )}
      style={{ 
        borderColor: accentColor ? `${accentColor}40` : undefined,
        boxShadow: accentColor ? `0 0 20px ${accentColor}15` : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div 
          className={cn(
            "flex items-center justify-center rounded-lg",
            isCompact ? "h-10 w-10" : "h-12 w-12"
          )}
          style={{ backgroundColor: accentColor ? `${accentColor}20` : 'hsl(var(--primary) / 0.1)' }}
        >
          <div 
            className={cn(isCompact ? "h-5 w-5" : "h-6 w-6")}
            style={{ color: accentColor || 'hsl(var(--primary))' }}
          >
            {icon}
          </div>
        </div>
        <ExternalLink 
          className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" 
        />
      </div>

      {/* Content */}
      <div className="flex-1">
        <h3 className={cn(
          "font-semibold text-foreground mb-1",
          isCompact ? "text-base" : "text-lg"
        )}>
          {title}
        </h3>
        <p className={cn(
          "text-muted-foreground line-clamp-2",
          isCompact ? "text-xs" : "text-sm"
        )}>
          {description}
        </p>
      </div>

      {/* CTA */}
      <div className={cn(isCompact ? "mt-3" : "mt-4")}>
        <Button 
          variant="outline" 
          size={isCompact ? "sm" : "default"}
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
          style={{
            borderColor: accentColor || undefined,
          }}
          asChild
        >
          <span className="flex items-center justify-center gap-2">
            {ctaLabel}
            <ExternalLink className="h-3 w-3" />
          </span>
        </Button>
      </div>
    </a>
  );
}
