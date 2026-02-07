import { Place } from '@/types/trip';
import { Star, Info, Clock, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelinePlaceProps {
  place: Place;
  index: number;
  time?: string;
  isLast?: boolean;
  onClick?: () => void;
  onViewMap?: (place: Place) => void;
  onTimingChange?: (placeId: string, value: { arrivalTime?: string; stayDurationMinutes: number }) => void;
  isTimingEditable?: boolean;
  isHighlighted?: boolean;
}

export function TimelinePlace({
  place,
  index,
  time,
  isLast,
  onClick,
  onViewMap,
  onTimingChange,
  isTimingEditable = false,
  isHighlighted = false,
}: TimelinePlaceProps) {
  const stayDuration = place.stayDurationMinutes || place.duration || 60;
  const arrival = place.arrivalTime || time || 'Anytime';
  const commuteMinutes = place.commuteDurationMinutes || place.walkingTimeFromPrevious;
  const commuteMeters = place.commuteDistanceMeters;
  const tags = (place.tags || []).filter(Boolean);

  return (
    <div
      className="relative flex gap-4"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
    >
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
        isHighlighted && 'ring-2 ring-primary',
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
                <span className="ml-2">• {place.source === 'ai' ? 'AI' : 'You'}</span>
              </p>
              {place.source === 'user' && !place.coordinates && (
                <p className="mt-1 text-[11px] font-medium text-amber-700">
                  No coordinates found
                </p>
              )}
            </div>
            <button className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted">
              <Info className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Arrival: {arrival}
            </span>
            {place.rating ? (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {place.rating}
              </span>
            ) : (
              <span>Rating unavailable</span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
            {tags.length > 0 ? (
              tags.slice(0, 3).map(tag => (
                <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                  #{tag}
                </span>
              ))
            ) : (
              <span className="text-muted-foreground">No tags</span>
            )}
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span>Stay:</span>
            {isTimingEditable ? (
              <input
                type="number"
                min={5}
                max={720}
                value={stayDuration}
                className="h-7 w-20 rounded-md border border-border bg-background px-2 text-foreground"
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => {
                  const value = Number(event.target.value) || stayDuration;
                  onTimingChange?.(place.id, {
                    arrivalTime: place.arrivalTime || undefined,
                    stayDurationMinutes: value,
                  });
                }}
              />
            ) : (
              <span>{stayDuration} min</span>
            )}
          </div>

          {(commuteMinutes || commuteMeters) && (
            <p className="mt-1 text-xs text-muted-foreground">
              Commute from previous: {commuteMeters ? `${(commuteMeters / 1000).toFixed(1)} km` : 'Distance unavailable'}
              {commuteMinutes ? ` • ${commuteMinutes} min` : ''}
            </p>
          )}

          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
              onClick={(event) => {
                event.stopPropagation();
                onViewMap?.(place);
              }}
            >
              <MapPin className="h-3 w-3" />
              View on map
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
