import { Place } from '@/types/trip';
import { Star, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelinePlaceProps {
  place: Place;
  index: number;
  time?: string;
  isLast?: boolean;
  onClick?: () => void;
}

export function TimelinePlace({ place, index, time, isLast, onClick }: TimelinePlaceProps) {
  return (
    <div className="relative flex gap-4" onClick={onClick}>
      {/* Timeline Line & Number */}
      <div className="relative flex flex-col items-center">
        <div className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
          place.source === 'ai' 
            ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' 
            : 'bg-primary text-primary-foreground'
        )}>
          {index}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-border" />
        )}
      </div>

      {/* Content Card */}
      <div className={cn(
        'mb-4 flex flex-1 gap-3 rounded-xl border bg-card p-3 transition-all',
        'hover:shadow-travel cursor-pointer',
        place.source === 'ai' && 'border-violet-200 dark:border-violet-800'
      )}>
        {/* Thumbnail */}
        {place.imageUrl && (
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg">
            <img 
              src={place.imageUrl} 
              alt={place.name}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-foreground line-clamp-1">{place.name}</h4>
              <p className="text-xs text-muted-foreground">
                {place.category.charAt(0).toUpperCase() + place.category.slice(1)}
                {time && <span className="ml-2">• {time}</span>}
              </p>
            </div>
            <button className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted">
              <Info className="h-4 w-4" />
            </button>
          </div>
          
          {place.rating && (
            <div className="mt-1 flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-medium">{place.rating}</span>
              <span className="text-xs text-muted-foreground">(128)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
