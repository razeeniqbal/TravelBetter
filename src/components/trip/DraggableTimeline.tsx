import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { DraggableTimelinePlace } from './DraggableTimelinePlace';
import { Place } from '@/types/trip';
import { useNavigate } from 'react-router-dom';

interface DraggableTimelineProps {
  places: Place[];
  dayIndex: number;
  isEditMode: boolean;
  anchorPlaceId: string | null;
  onReorder: (dayIndex: number, sourceIdx: number, destIdx: number) => void;
  onRemove: (dayIndex: number, placeIndex: number) => void;
  onSetAnchor: (placeId: string) => void;
}

export function DraggableTimeline({
  places,
  dayIndex,
  isEditMode,
  anchorPlaceId,
  onReorder,
  onRemove,
  onSetAnchor,
}: DraggableTimelineProps) {
  const navigate = useNavigate();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = places.findIndex(p => p.id === active.id);
      const newIndex = places.findIndex(p => p.id === over.id);
      onReorder(dayIndex, oldIndex, newIndex);
    }
  };

  const getTimeForIndex = (idx: number) => {
    const startHour = 9 + Math.floor(idx * 1.5);
    return `${startHour}:00 ${startHour < 12 ? 'AM' : 'PM'}`;
  };

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext 
        items={places.map(p => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="relative">
          {places.map((place, idx) => (
            <DraggableTimelinePlace
              key={place.id}
              place={place}
              index={idx + 1}
              time={getTimeForIndex(idx)}
              isLast={idx === places.length - 1}
              isEditMode={isEditMode}
              isAnchor={place.id === anchorPlaceId}
              onClick={() => navigate(`/place/${place.id}`)}
              onRemove={() => onRemove(dayIndex, idx)}
              onSetAnchor={() => onSetAnchor(place.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
