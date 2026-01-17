import { Trip } from '@/types/trip';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Copy, Eye, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TripCardProps {
  trip: Trip;
  onClick?: () => void;
  variant?: 'default' | 'compact';
}

export function TripCard({ trip, onClick, variant = 'default' }: TripCardProps) {
  const isCompact = variant === 'compact';
  
  return (
    <Card 
      className={cn(
        'group cursor-pointer overflow-hidden border-0 transition-all duration-300',
        'shadow-travel hover:shadow-travel-hover hover:-translate-y-1',
        'bg-card'
      )}
      onClick={onClick}
    >
      {/* Cover Image */}
      <div className={cn(
        'relative overflow-hidden',
        isCompact ? 'h-32' : 'h-48'
      )}>
        <img 
          src={trip.coverImage} 
          alt={trip.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Duration Badge */}
        <Badge 
          variant="secondary" 
          className="absolute right-2 top-2 bg-white/90 text-foreground backdrop-blur-sm"
        >
          {trip.duration} {trip.duration === 1 ? 'day' : 'days'}
        </Badge>
        
        {/* Destination */}
        <div className="absolute bottom-2 left-3 right-3">
          <div className="flex items-center gap-1 text-white">
            <MapPin className="h-3.5 w-3.5" />
            <span className="text-sm font-medium">
              {trip.destination}, {trip.country}
            </span>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className={cn('p-3', isCompact && 'p-2')}>
        <h3 className={cn(
          'font-semibold text-card-foreground line-clamp-1',
          isCompact ? 'text-sm' : 'text-base'
        )}>
          {trip.title}
        </h3>
        
        {/* Tags */}
        {!isCompact && (
          <div className="mt-2 flex flex-wrap gap-1">
            {trip.tags.slice(0, 3).map((tag) => (
              <Badge 
                key={tag} 
                variant="outline" 
                className="text-xs font-normal capitalize"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
        
        {/* Footer */}
        <div className="mt-3 flex items-center justify-between">
          {/* Author */}
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={trip.author.avatar} alt={trip.author.name} />
              <AvatarFallback className="text-xs">
                {trip.author.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              @{trip.author.username}
            </span>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Copy className="h-3 w-3" />
              {trip.remixCount}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {trip.viewCount > 1000 ? `${(trip.viewCount / 1000).toFixed(1)}k` : trip.viewCount}
            </span>
          </div>
        </div>
        
        {/* Remixed From */}
        {trip.remixedFrom && (
          <p className="mt-2 text-xs text-muted-foreground">
            Remixed from @{trip.remixedFrom.authorName}
          </p>
        )}
      </div>
    </Card>
  );
}
