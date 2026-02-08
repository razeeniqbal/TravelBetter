import { useState, useCallback, useEffect } from 'react';
import { DayItinerary } from '@/types/trip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { AUTH_DISABLED } from '@/lib/flags';
import { getGuestTripById, updateGuestTrip } from '@/lib/guestTrips';
import { getTripDetailQueryKey } from '@/hooks/useTripDetail';

interface UseTripEditProps {
  tripId: string;
  initialItinerary: DayItinerary[];
  isOwner: boolean;
}

function toSnapshot(itinerary: DayItinerary[], anchorPlaceId: string | null): string {
  return JSON.stringify({ itinerary, anchorPlaceId });
}

export function useTripEdit({ tripId, initialItinerary, isOwner }: UseTripEditProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [itinerary, setItinerary] = useState<DayItinerary[]>(initialItinerary);
  const [anchorPlaceId, setAnchorPlaceId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [baselineSnapshot, setBaselineSnapshot] = useState(() => toSnapshot(initialItinerary, null));
  const queryClient = useQueryClient();

  const hasUnsavedChanges = toSnapshot(itinerary, anchorPlaceId) !== baselineSnapshot;

  useEffect(() => {
    if (isEditMode) return;

    setItinerary(initialItinerary);
    setAnchorPlaceId(null);
    setBaselineSnapshot(toSnapshot(initialItinerary, null));
  }, [initialItinerary, isEditMode]);

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

    if (isEditMode && hasUnsavedChanges) {
      toast.info('Save or discard your edits before leaving edit mode');
      return;
    }

    if (!isEditMode) {
      setBaselineSnapshot(toSnapshot(itinerary, anchorPlaceId));
    }

    setIsEditMode(prev => !prev);
  }, [anchorPlaceId, hasUnsavedChanges, isEditMode, isOwner, itinerary]);

  const reorderPlaces = useCallback((dayIndex: number, sourceIdx: number, destinationIdx: number) => {
    if (sourceIdx === destinationIdx) return;

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
    if (sourceDayIndex === destDayIndex && sourceIdx === destIdx) return;

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

    // Auto-reorder: move anchor place to top of its day
    setItinerary(prev => {
      // Find the day and position of the anchor place
      let anchorDayIndex = -1;
      let anchorPlaceIndex = -1;

      for (let dayIdx = 0; dayIdx < prev.length; dayIdx++) {
        const placeIdx = prev[dayIdx].places.findIndex(p => p.id === placeId);
        if (placeIdx !== -1) {
          anchorDayIndex = dayIdx;
          anchorPlaceIndex = placeIdx;
          break;
        }
      }

      // If found and not already at the top, move it
      if (anchorDayIndex !== -1 && anchorPlaceIndex > 0) {
        const newItinerary = [...prev];
        const dayItinerary = { ...newItinerary[anchorDayIndex] };
        const places = [...dayItinerary.places];

        // Move anchor place to position 0
        const [anchorPlace] = places.splice(anchorPlaceIndex, 1);
        places.unshift(anchorPlace);

        dayItinerary.places = places;
        newItinerary[anchorDayIndex] = dayItinerary;

        return newItinerary;
      }

      return prev;
    });

    toast.success('Anchor point set! Routes will start and end here.');
  }, []);

  const saveChanges = useCallback(async () => {
    setIsSaving(true);
    try {
      if (AUTH_DISABLED) {
        const trip = getGuestTripById(tripId);
        if (!trip) throw new Error('Trip not found');
        updateGuestTrip({ ...trip, itinerary });
        queryClient.invalidateQueries({ queryKey: getTripDetailQueryKey(tripId) });
        toast.success('Changes saved successfully!');
        setBaselineSnapshot(toSnapshot(itinerary, anchorPlaceId));
        setIsEditMode(false);
        return;
      }

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
      queryClient.invalidateQueries({ queryKey: getTripDetailQueryKey(tripId) });

      toast.success('Changes saved successfully!');
      setBaselineSnapshot(toSnapshot(itinerary, anchorPlaceId));
      setIsEditMode(false);
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [anchorPlaceId, itinerary, queryClient, tripId]);

  const discardChanges = useCallback(() => {
    setItinerary(initialItinerary);
    setAnchorPlaceId(null);
    setBaselineSnapshot(toSnapshot(initialItinerary, null));
    setIsEditMode(false);
  }, [initialItinerary]);

  return {
    isEditMode,
    hasUnsavedChanges,
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
