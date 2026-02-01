import { useState, useMemo } from 'react';
import { format, isSameDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import type { EventWithDetails } from '@/types/events';

interface EventCalendarProps {
  events: EventWithDetails[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onMonthChange?: (month: Date) => void;
  className?: string;
}

// Color mapping for game titles
const gameColors: Record<string, string> = {
  ATS: 'bg-blue-500',
  Farming_Sim: 'bg-green-500',
  Construction_Sim: 'bg-amber-500',
  Mechanic_Sim: 'bg-red-500',
};

export function EventCalendar({
  events,
  selectedDate,
  onSelectDate,
  onMonthChange,
  className,
}: EventCalendarProps) {
  const [month, setMonth] = useState<Date>(startOfMonth(selectedDate));

  // Group events by date for indicators
  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventWithDetails[]>();
    events.forEach((event) => {
      const dateKey = format(new Date(event.scheduled_start), 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(event);
    });
    return map;
  }, [events]);

  const handleMonthChange = (newMonth: Date) => {
    setMonth(newMonth);
    onMonthChange?.(newMonth);
  };

  // Custom day content with event indicators
  const renderDay = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const dayEvents = eventsByDate.get(dateKey) || [];
    const isSelected = isSameDay(day, selectedDate);

    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        <span>{format(day, 'd')}</span>
        {dayEvents.length > 0 && (
          <div className="absolute bottom-0.5 flex gap-0.5">
            {dayEvents.slice(0, 3).map((event, idx) => (
              <div
                key={idx}
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  event.work_order
                    ? gameColors[event.work_order.game_title] || 'bg-primary'
                    : 'bg-primary'
                )}
              />
            ))}
            {dayEvents.length > 3 && (
              <span className="text-[8px] text-muted-foreground">+{dayEvents.length - 3}</span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('rounded-lg border border-border bg-card p-4', className)}>
      {/* Custom header with navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => handleMonthChange(subMonths(month, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold text-foreground">
          {format(month, 'MMMM yyyy')}
        </h2>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => handleMonthChange(addMonths(month, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <DayPicker
        mode="single"
        selected={selectedDate}
        onSelect={(date) => date && onSelectDate(date)}
        month={month}
        onMonthChange={handleMonthChange}
        showOutsideDays
        className="p-0 pointer-events-auto"
        classNames={{
          months: 'flex flex-col',
          month: 'space-y-2',
          caption: 'hidden', // Using custom header
          nav: 'hidden', // Using custom navigation
          table: 'w-full border-collapse',
          head_row: 'flex',
          head_cell: 'text-muted-foreground rounded-md w-10 font-normal text-xs flex-1 text-center',
          row: 'flex w-full mt-1',
          cell: cn(
            'relative h-10 flex-1 text-center text-sm p-0',
            'focus-within:relative focus-within:z-20',
            '[&:has([aria-selected])]:bg-accent/50 [&:has([aria-selected])]:rounded-md'
          ),
          day: cn(
            buttonVariants({ variant: 'ghost' }),
            'h-10 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-accent/50'
          ),
          day_selected:
            'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
          day_today: 'bg-accent text-accent-foreground font-semibold',
          day_outside: 'text-muted-foreground opacity-50',
          day_disabled: 'text-muted-foreground opacity-50',
          day_hidden: 'invisible',
        }}
        components={{
          DayContent: ({ date }) => renderDay(date),
        }}
      />

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground mb-2">Event Types</p>
        <div className="flex flex-wrap gap-3">
          {Object.entries(gameColors).map(([game, color]) => (
            <div key={game} className="flex items-center gap-1.5">
              <div className={cn('w-2 h-2 rounded-full', color)} />
              <span className="text-xs text-muted-foreground">
                {game.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
