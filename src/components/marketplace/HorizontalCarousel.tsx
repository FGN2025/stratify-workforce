import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HorizontalCarouselProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  viewAllLink?: string;
  icon?: React.ReactNode;
}

export function HorizontalCarousel({ 
  children, 
  title, 
  subtitle,
  viewAllLink,
  icon
}: HorizontalCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      return () => el.removeEventListener('scroll', checkScroll);
    }
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {icon && <div className="text-primary">{icon}</div>}
          <div>
            <h2 className="text-lg font-bold uppercase tracking-wide">{title}</h2>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {viewAllLink && (
            <Button variant="outline" size="sm" asChild className="text-xs">
              <a href={viewAllLink}>VIEW ALL</a>
            </Button>
          )}
          
          <div className="hidden sm:flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-full",
                !canScrollLeft && "opacity-30 cursor-not-allowed"
              )}
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-full",
                !canScrollRight && "opacity-30 cursor-not-allowed"
              )}
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Carousel */}
      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 snap-x snap-mandatory"
      >
        {children}
      </div>
      
      {/* Gradient Edges */}
      {canScrollLeft && (
        <div className="absolute left-0 top-12 bottom-0 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      )}
      {canScrollRight && (
        <div className="absolute right-0 top-12 bottom-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      )}
    </section>
  );
}
