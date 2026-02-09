import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildDisplayTimes } from '@/lib/placeTiming';
import { DayItinerary, Place } from '@/types/trip';
import { DraggableTimelinePlace } from './DraggableTimelinePlace';
import { Button } from '@/components/ui/button';

interface DraggableTimelineProps {
  days: DayItinerary[];
  activeDay: number;
  isEditMode: boolean;
  anchorPlaceId: string | null;
  onReorder: (dayIndex: number, sourceIdx: number, destIdx: number) => void;
  onMoveBetweenDays: (
    sourceDayIndex: number,
    destDayIndex: number,
    sourceIdx: number,
    destIdx: number
  ) => void;
  onRemove: (dayIndex: number, placeIndex: number) => void;
  onSetAnchor: (placeId: string) => void;
  highlightedPlaceId?: string | null;
  onPlaceClick?: (place: Place) => void;
  onPlaceInfoClick?: (place: Place) => void;
  onRemoveDay?: (dayNumber: number) => void;
  onDragStateChange?: (isDragging: boolean) => void;
}

type DraggableItemMeta = {
  id: string;
  dayIndex: number;
  placeIndex: number;
  dayNumber: number;
  place: Place;
};

type DaySectionProps = {
  day: DayItinerary;
  dayIndex: number;
  displayTimes: string[];
  itemIds: string[];
  isEditMode: boolean;
  anchorPlaceId: string | null;
  highlightedPlaceId?: string | null;
  draggableItemId: (dayNumber: number, placeId: string, placeIndex: number) => string;
  onRemove: (dayIndex: number, placeIndex: number) => void;
  onSetAnchor: (placeId: string) => void;
  onPlaceClick?: (place: Place) => void;
  onPlaceInfoClick?: (place: Place) => void;
  canRemoveDay: boolean;
  onRemoveDay?: (dayNumber: number) => void;
};

const getDropZoneId = (dayNumber: number) => `day-drop-${dayNumber}`;

function DaySection({
  day,
  dayIndex,
  displayTimes,
  itemIds,
  isEditMode,
  anchorPlaceId,
  highlightedPlaceId,
  draggableItemId,
  onRemove,
  onSetAnchor,
  onPlaceClick,
  onPlaceInfoClick,
  canRemoveDay,
  onRemoveDay,
}: DaySectionProps) {
  const { setNodeRef, isOver } = useDroppable({ id: getDropZoneId(day.day) });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Day {day.day}
        </div>
        {isEditMode && canRemoveDay && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation();
              onRemoveDay?.(day.day);
            }}
            aria-label={`Delete day ${day.day}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <div
        ref={setNodeRef}
        data-vaul-no-drag
        className={cn(
          'rounded-xl border border-border/60 bg-background/70 p-2',
          isEditMode && isOver && 'border-primary bg-primary/5'
        )}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {day.places.length > 0 ? (
            day.places.map((place, index) => (
              <DraggableTimelinePlace
                key={draggableItemId(day.day, place.id, index)}
                sortableId={draggableItemId(day.day, place.id, index)}
                place={place}
                index={index + 1}
                time={displayTimes[index]}
                isLast={index === day.places.length - 1}
                isEditMode={isEditMode}
                isAnchor={place.id === anchorPlaceId}
                isHighlighted={place.id === highlightedPlaceId}
                onClick={() => onPlaceClick?.(place)}
                onInfoClick={() => onPlaceInfoClick?.(place)}
                onRemove={() => onRemove(dayIndex, index)}
                onSetAnchor={() => onSetAnchor(place.id)}
              />
            ))
          ) : (
            <div
              className={cn(
                'rounded-lg border border-dashed border-muted-foreground/30 px-4 py-8 text-center text-sm text-muted-foreground',
                isEditMode && 'min-h-24'
              )}
            >
              {isEditMode ? 'Drop places here' : 'No places for this day'}
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

export function DraggableTimeline({
  days,
  activeDay,
  isEditMode,
  anchorPlaceId,
  onReorder,
  onMoveBetweenDays,
  onRemove,
  onSetAnchor,
  onPlaceClick,
  onPlaceInfoClick,
  onRemoveDay,
  onDragStateChange,
}: DraggableTimelineProps) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const draggableItemId = (dayNumber: number, placeId: string, placeIndex: number) =>
    `${dayNumber}:${placeId}:${placeIndex}`;

  const itemMetaById = useMemo(() => {
    const map = new Map<string, DraggableItemMeta>();

    days.forEach((day, dayIndex) => {
      day.places.forEach((place, placeIndex) => {
        const id = draggableItemId(day.day, place.id, placeIndex);
        map.set(id, {
          id,
          dayIndex,
          placeIndex,
          dayNumber: day.day,
          place,
        });
      });
    });

    return map;
  }, [days]);

  const dayDropZoneIndexById = useMemo(() => {
    const map = new Map<string, number>();
    days.forEach((day, index) => {
      map.set(getDropZoneId(day.day), index);
    });
    return map;
  }, [days]);

  const visibleDays = useMemo(() => {
    if (isEditMode) return days;
    return days.filter(day => day.day === activeDay);
  }, [activeDay, days, isEditMode]);

  const dayDisplayTimes = useMemo(() => {
    const timesByDay = new Map<number, string[]>();
    days.forEach((day) => {
      timesByDay.set(day.day, buildDisplayTimes(day.places));
    });
    return timesByDay;
  }, [days]);

  const activeDragMeta = activeDragId ? itemMetaById.get(activeDragId) : undefined;

  const endDrag = () => {
    setActiveDragId(null);
    onDragStateChange?.(false);
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (!isEditMode) return;
    setActiveDragId(String(event.active.id));
    onDragStateChange?.(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!isEditMode) {
      endDrag();
      return;
    }

    const source = itemMetaById.get(String(event.active.id));
    const overId = event.over ? String(event.over.id) : null;
    if (!source || !overId) {
      endDrag();
      return;
    }

    const overItem = itemMetaById.get(overId);
    const destinationDayIndex = overItem?.dayIndex ?? dayDropZoneIndexById.get(overId);

    if (destinationDayIndex === undefined) {
      endDrag();
      return;
    }

    const destinationPlaceIndex = overItem
      ? overItem.placeIndex
      : days[destinationDayIndex]?.places.length ?? 0;

    if (source.dayIndex === destinationDayIndex) {
      if (source.placeIndex !== destinationPlaceIndex) {
        onReorder(source.dayIndex, source.placeIndex, destinationPlaceIndex);
      }
      endDrag();
      return;
    }

    onMoveBetweenDays(
      source.dayIndex,
      destinationDayIndex,
      source.placeIndex,
      destinationPlaceIndex
    );

    endDrag();
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragCancel={endDrag}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4" data-vaul-no-drag>
        {visibleDays.map(day => {
          const dayIndex = days.findIndex(item => item.day === day.day);
          const itemIds = day.places.map((place, placeIndex) =>
            draggableItemId(day.day, place.id, placeIndex)
          );

          return (
            <DaySection
              key={day.day}
              day={day}
              dayIndex={dayIndex}
              displayTimes={dayDisplayTimes.get(day.day) || []}
              itemIds={itemIds}
              isEditMode={isEditMode}
              anchorPlaceId={anchorPlaceId}
              draggableItemId={draggableItemId}
              onRemove={onRemove}
              onSetAnchor={onSetAnchor}
              onPlaceClick={onPlaceClick}
              onPlaceInfoClick={onPlaceInfoClick}
              canRemoveDay={days.length > 1}
              onRemoveDay={onRemoveDay}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeDragMeta ? (
          <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium shadow-lg">
            {activeDragMeta.place.name}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
