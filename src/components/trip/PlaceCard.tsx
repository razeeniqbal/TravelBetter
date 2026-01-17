import { Place } from '@/types/trip';
import { Card } from '@/components/ui/card';
import { CategoryBadge, SourceBadge } from '@/components/badges/CategoryBadge';
import { Clock, MapPin, Footprints, Star, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlaceCardProps {
  place: Place;
  index?: number;
  showWalkingTime?: boolean;
  onClick?: () => void;
  isSelected?: boolean;
}

export function PlaceCard({ 
  place, 
  index, 
  showWalkingTime = true, 
  onClick,
  isSelected 
}: PlaceCardProps) {
  return (
    <div className="relative">
      {/* Walking Time Connector */}
      {showWalkingTime && place.walkingTimeFromPrevious && (
        <div className="mb-2 flex items-center gap-2 pl-4 text-xs text-muted-foreground">
          <div className="h-6 w-px bg-border" />
          <Footprints className="h-3 w-3" />
          <span>{place.walkingTimeFromPrevious} min walk</span>
        </div>
      )}
      
      <Card 
        className={cn(
          'overflow-hidden border transition-all duration-200',
          'hover:shadow-travel cursor-pointer',
          isSelected && 'ring-2 ring-primary',
          place.source === 'ai' && 'border-violet-200 dark:border-violet-800'
        )}
        onClick={onClick}
      >
        <div className="flex">
          {/* Index Number */}
          {index !== undefined && (
            <div className={cn(
              'flex w-10 flex-shrink-0 items-center justify-center text-lg font-bold',
              place.source === 'ai' 
                ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' 
                : 'bg-primary/10 text-primary'
            )}>
              {index}
            </div>
          )}
          
          {/* Image */}
          {place.imageUrl && (
            <div className="relative h-24 w-24 flex-shrink-0">
              <img 
                src={place.imageUrl} 
                alt={place.name}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          
          {/* Content */}
          <div className="flex-1 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-semibold text-card-foreground line-clamp-1">
                  {place.name}
                </h4>
                {place.nameLocal && (
                  <p className="text-xs text-muted-foreground">{place.nameLocal}</p>
                )}
              </div>
              <CategoryBadge category={place.category} showLabel={false} />
            </div>
            
            {place.description && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                {place.description}
              </p>
            )}
            
            {/* Meta Info */}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {place.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {place.duration < 60 
                    ? `${place.duration}m` 
                    : `${Math.floor(place.duration / 60)}h${place.duration % 60 ? ` ${place.duration % 60}m` : ''}`
                  }
                </span>
              )}
              {place.cost && (
                <span className="font-medium text-foreground">{place.cost}</span>
              )}
              {place.rating && (
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {place.rating}
                </span>
              )}
            </div>
            
            {/* Source Badge */}
            <div className="mt-2 flex items-center gap-2">
              <SourceBadge source={place.source} confidence={place.confidence} />
              {place.sourceNote && (
                <span className="text-xs text-muted-foreground italic">
                  {place.sourceNote}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Tips */}
        {place.tips && place.tips.length > 0 && (
          <div className="border-t bg-muted/30 px-3 py-2">
            <div className="flex items-start gap-2 text-xs">
              <Lightbulb className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-500" />
              <p className="text-muted-foreground">{place.tips[0]}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
