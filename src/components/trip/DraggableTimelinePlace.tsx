import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Place } from '@/types/trip';
import { Star, Info, GripVertical, Home, Trash2, User, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DraggableTimelinePlaceProps {
  place: Place;
  index: number;
  time?: string;
  isLast?: boolean;
  isEditMode?: boolean;
  isAnchor?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  onSetAnchor?: () => void;
}

export function DraggableTimelinePlace({ 
  place, 
  index, 
  time, 
  isLast, 
  isEditMode = false,
  isAnchor = false,
  onClick,
  onRemove,
  onSetAnchor,
}: DraggableTimelinePlaceProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: place.id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const SourceBadge = () => {
    if (place.source === 'ai') {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                <Sparkles className="h-3 w-3" />
                AI
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                {place.sourceNote || 'Suggested based on your preferences'}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              <User className="h-3 w-3" />
              You
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              {place.sourceNote || 'You imported this place'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn(
        'relative flex gap-4',
        isDragging && 'z-50 opacity-80'
      )}
    >
      {/* Timeline Line & Number */}
      <div className="relative flex flex-col items-center">
        <div className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all',
          isAnchor
            ? 'bg-amber-500 text-white ring-2 ring-amber-300'
            : place.source === 'ai' 
              ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' 
              : 'bg-primary text-primary-foreground'
        )}>
          {isAnchor ? <Home className="h-4 w-4" /> : index}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-border" />
        )}
      </div>

      {/* Content Card */}
      <div 
        className={cn(
          'mb-4 flex flex-1 gap-3 rounded-xl border bg-card p-3 transition-all',
          !isEditMode && 'hover:shadow-travel cursor-pointer',
          isEditMode && 'cursor-default',
          place.source === 'ai' && 'border-violet-200 dark:border-violet-800',
          isAnchor && 'border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-900/20',
          isDragging && 'shadow-lg ring-2 ring-primary'
        )}
        onClick={!isEditMode ? onClick : undefined}
      >
        {/* Drag Handle */}
        {isEditMode && (
          <div 
            {...attributes} 
            {...listeners}
            className="flex cursor-grab items-center text-muted-foreground hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="h-5 w-5" />
          </div>
        )}

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
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-foreground line-clamp-1">{place.name}</h4>
                <SourceBadge />
                {isAnchor && (
                  <span className="flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    <Home className="h-3 w-3" />
                    Anchor
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {place.category.charAt(0).toUpperCase() + place.category.slice(1)}
                {time && <span className="ml-2">• {time}</span>}
                {place.duration && <span className="ml-2">• {place.duration} min</span>}
              </p>
            </div>
            
            {isEditMode ? (
              <div className="flex gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-7 w-7 rounded-full",
                          isAnchor && "text-amber-600"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetAnchor?.();
                        }}
                      >
                        <Home className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Set as anchor (home base)</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove?.();
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove from itinerary</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ) : (
              <button className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted">
                <Info className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {place.rating && (
            <div className="mt-1 flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-medium">{place.rating}</span>
            </div>
          )}

          {place.confidence !== undefined && place.source === 'ai' && (
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div 
                  className="h-full bg-violet-500 transition-all"
                  style={{ width: `${place.confidence}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{place.confidence}% match</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
