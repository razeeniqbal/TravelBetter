import { useState, useCallback } from 'react';
import { Place, DayItinerary } from '@/types/trip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface UseTripEditProps {
  tripId: string;
  initialItinerary: DayItinerary[];
  isOwner: boolean;
}

export function useTripEdit({ tripId, initialItinerary, isOwner }: UseTripEditProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [itinerary, setItinerary] = useState<DayItinerary[]>(initialItinerary);
  const [anchorPlaceId, setAnchorPlaceId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  // Detect potential anchor from accommodations
  const detectAnchor = useCallback(() => {
    const accommodationKeywords = ['hotel', 'hostel', 'airbnb', 'apartment', 'guesthouse', 'resort', 'lodge', 'inn', 'staying'];
    
    for (const day of itinerary) {
      for (const place of day.places) {
        const nameLower = place.name.toLowerCase();
        if (accommodationKeywords.some(k => nameLower.includes(k)) || place.category === 'accommodation') {
          return place.id;
        }
      }
    }
    return null;
  }, [itinerary]);

  const toggleEditMode = useCallback(() => {
    if (!isOwner) {
      toast.info('You can only edit your own trips');
      return;
    }
    setIsEditMode(prev => !prev);
  }, [isOwner]);

  const reorderPlaces = useCallback((dayIndex: number, sourceIdx: number, destinationIdx: number) => {
    setItinerary(prev => {
      const newItinerary = [...prev];
      const dayItinerary = { ...newItinerary[dayIndex] };
      const places = [...dayItinerary.places];
      
      const [removed] = places.splice(sourceIdx, 1);
      places.splice(destinationIdx, 0, removed);
      
      dayItinerary.places = places;
      newItinerary[dayIndex] = dayItinerary;
      
      return newItinerary;
    });
  }, []);

  const movePlaceBetweenDays = useCallback((
    sourceDayIndex: number, 
    destDayIndex: number, 
    sourceIdx: number, 
    destIdx: number
  ) => {
    setItinerary(prev => {
      const newItinerary = [...prev];
      const sourceDay = { ...newItinerary[sourceDayIndex] };
      const destDay = { ...newItinerary[destDayIndex] };
      
      const sourcePlaces = [...sourceDay.places];
      const destPlaces = [...destDay.places];
      
      const [removed] = sourcePlaces.splice(sourceIdx, 1);
      destPlaces.splice(destIdx, 0, removed);
      
      sourceDay.places = sourcePlaces;
      destDay.places = destPlaces;
      
      newItinerary[sourceDayIndex] = sourceDay;
      newItinerary[destDayIndex] = destDay;
      
      return newItinerary;
    });
  }, []);

  const removePlace = useCallback((dayIndex: number, placeIndex: number) => {
    setItinerary(prev => {
      const newItinerary = [...prev];
      const dayItinerary = { ...newItinerary[dayIndex] };
      const places = [...dayItinerary.places];
      
      places.splice(placeIndex, 1);
      dayItinerary.places = places;
      newItinerary[dayIndex] = dayItinerary;
      
      return newItinerary;
    });
  }, []);

  const setAsAnchor = useCallback((placeId: string) => {
    setAnchorPlaceId(placeId);
    toast.success('Anchor point set! Routes will start and end here.');
  }, []);

  const saveChanges = useCallback(async () => {
    setIsSaving(true);
    try {
      // Fetch day itinerary IDs
      const { data: daysData, error: daysError } = await supabase
        .from('day_itineraries')
        .select('id, day_number')
        .eq('trip_id', tripId)
        .order('day_number', { ascending: true });

      if (daysError) throw daysError;

      // Update positions for each day
      for (const dayData of daysData) {
        const dayItinerary = itinerary.find(d => d.day === dayData.day_number);
        if (!dayItinerary) continue;

        // Delete existing places for this day
        await supabase
          .from('itinerary_places')
          .delete()
          .eq('day_itinerary_id', dayData.id);

        // Re-insert with new positions
        for (let i = 0; i < dayItinerary.places.length; i++) {
          const place = dayItinerary.places[i];
          await supabase
            .from('itinerary_places')
            .insert({
              day_itinerary_id: dayData.id,
              place_id: place.id,
              position: i,
              source: place.source,
              source_note: place.sourceNote,
              walking_time_from_previous: place.walkingTimeFromPrevious,
              confidence: place.confidence,
            });
        }
      }

      // Invalidate query to refresh data
      queryClient.invalidateQueries({ queryKey: ['trip-detail', tripId] });
      
      toast.success('Changes saved successfully!');
      setIsEditMode(false);
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [tripId, itinerary, queryClient]);

  const discardChanges = useCallback(() => {
    setItinerary(initialItinerary);
    setIsEditMode(false);
  }, [initialItinerary]);

  return {
    isEditMode,
    toggleEditMode,
    itinerary,
    reorderPlaces,
    movePlaceBetweenDays,
    removePlace,
    anchorPlaceId,
    setAsAnchor,
    detectAnchor,
    saveChanges,
    discardChanges,
    isSaving,
  };
}
