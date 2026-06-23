import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HorizontalCarouselProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  viewAllLink?: string;
  icon?: React.ReactNode;
  /** Tailwind width classes applied to each direct child card via a wrapper. */
  cardWidthClass?: string;
  /** When true, mobile = horizontal snap rail; md+ = responsive grid (no horizontal overflow). */
  gridOnDesktop?: boolean;
}

/** Default responsive card width — full-bleed on phones, fixed on tablet+. */
export const DEFAULT_CARD_WIDTH = 'w-[85vw] sm:w-72 lg:w-80';
/** Width when used inside a grid on md+ (auto-sized by grid cell). */
export const GRID_CARD_WIDTH = 'w-[85vw] sm:w-72 md:w-auto';

export function HorizontalCarousel({ 
  children, 
  title, 
  subtitle,
  viewAllLink,
  icon,
  cardWidthClass,
  gridOnDesktop = false,
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
          
          <div className="hidden md:flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-9 w-9 rounded-full",
                !canScrollLeft && "opacity-30 cursor-not-allowed"
              )}
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-9 w-9 rounded-full",
                !canScrollRight && "opacity-30 cursor-not-allowed"
              )}
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Carousel */}
      <div 
        ref={scrollRef}
        className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 snap-x snap-mandatory scroll-px-4 sm:scroll-px-6 lg:scroll-px-8"
      >
        {cardWidthClass !== undefined
          ? React.Children.map(children, (child, i) => (
              <div key={i} className={cn('shrink-0 snap-start', cardWidthClass || DEFAULT_CARD_WIDTH)}>
                {child}
              </div>
            ))
          : children}
      </div>
      
      {/* Gradient Edges - desktop only; mobile uses native snap as affordance */}
      {canScrollLeft && (
        <div className="hidden md:block absolute left-0 top-12 bottom-0 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      )}
      {canScrollRight && (
        <div className="hidden md:block absolute right-0 top-12 bottom-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      )}
    </section>
  );
}
