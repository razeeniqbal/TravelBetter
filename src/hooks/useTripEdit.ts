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

function normalizeDayItinerary(days: DayItinerary[]): DayItinerary[] {
  return days.map((day, index) => {
    const nextDayNumber = index + 1;
    const hasDefaultTitle = typeof day.title === 'string' && /^Day\s+\d+$/i.test(day.title.trim());

    return {
      ...day,
      day: nextDayNumber,
      title: hasDefaultTitle || !day.title ? `Day ${nextDayNumber}` : day.title,
    };
  });
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

  const removeDay = useCallback((dayNumber: number) => {
    setItinerary(prev => {
      if (prev.length <= 1) return prev;

      const removedDay = prev.find(day => day.day === dayNumber);
      const nextDays = normalizeDayItinerary(prev.filter(day => day.day !== dayNumber));

      if (removedDay && anchorPlaceId && removedDay.places.some(place => place.id === anchorPlaceId)) {
        setAnchorPlaceId(null);
      }

      return nextDays;
    });
  }, [anchorPlaceId]);

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
      const normalizedItinerary = normalizeDayItinerary(itinerary);

      if (AUTH_DISABLED) {
        const trip = getGuestTripById(tripId);
        if (!trip) throw new Error('Trip not found');
        updateGuestTrip({ ...trip, itinerary: normalizedItinerary, duration: normalizedItinerary.length });
        queryClient.invalidateQueries({ queryKey: getTripDetailQueryKey(tripId) });
        toast.success('Changes saved successfully!');
        setItinerary(normalizedItinerary);
        setBaselineSnapshot(toSnapshot(normalizedItinerary, anchorPlaceId));
        setIsEditMode(false);
        return;
      }

      const { data: existingDaysData, error: existingDaysError } = await supabase
        .from('day_itineraries')
        .select('id')
        .eq('trip_id', tripId)
        .order('id', { ascending: true });

      if (existingDaysError) throw existingDaysError;

      const existingDayIds = (existingDaysData || []).map(day => day.id);
      if (existingDayIds.length > 0) {
        const { error: deletePlacesError } = await supabase
          .from('itinerary_places')
          .delete()
          .in('day_itinerary_id', existingDayIds);

        if (deletePlacesError) throw deletePlacesError;

        const { error: deleteDaysError } = await supabase
          .from('day_itineraries')
          .delete()
          .eq('trip_id', tripId);

        if (deleteDaysError) throw deleteDaysError;
      }

      const dayInserts = normalizedItinerary.map((day, index) => ({
        trip_id: tripId,
        day_number: index + 1,
        title: day.title || `Day ${index + 1}`,
        notes: day.notes || null,
      }));

      const { data: createdDays, error: createDaysError } = await supabase
        .from('day_itineraries')
        .insert(dayInserts)
        .select('id, day_number')
        .order('day_number', { ascending: true });

      if (createDaysError) throw createDaysError;

      const dayIdByNumber = new Map((createdDays || []).map(day => [day.day_number, day.id]));
      const itineraryPlaceInserts = normalizedItinerary.flatMap((day) => {
        const dayItineraryId = dayIdByNumber.get(day.day);
        if (!dayItineraryId) return [];

        return day.places.map((place, index) => ({
          day_itinerary_id: dayItineraryId,
          place_id: place.id,
          position: index,
          source: place.source,
          source_note: place.sourceNote,
          walking_time_from_previous: place.walkingTimeFromPrevious,
          confidence: place.confidence,
        }));
      });

      if (itineraryPlaceInserts.length > 0) {
        const { error: insertPlacesError } = await supabase
          .from('itinerary_places')
          .insert(itineraryPlaceInserts);

        if (insertPlacesError) throw insertPlacesError;
      }

      const { error: updateTripError } = await supabase
        .from('trips')
        .update({ duration: normalizedItinerary.length })
        .eq('id', tripId);

      if (updateTripError) throw updateTripError;

      // Invalidate query to refresh data
      queryClient.invalidateQueries({ queryKey: getTripDetailQueryKey(tripId) });

      toast.success('Changes saved successfully!');
      setItinerary(normalizedItinerary);
      setBaselineSnapshot(toSnapshot(normalizedItinerary, anchorPlaceId));
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
    removeDay,
    anchorPlaceId,
    setAsAnchor,
    detectAnchor,
    saveChanges,
    discardChanges,
    isSaving,
  };
}
