import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Trip } from '@/types/trip';
import { isValidUUID } from '@/lib/utils';

export function useRemixTrip() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (originalTrip: Trip): Promise<string> => {
      if (!user?.id) throw new Error('Not authenticated');

      // 1. Create the new trip as a remix
      // Only set remixed_from_id if original trip ID is a valid UUID
      const remixedFromId = isValidUUID(originalTrip.id) ? originalTrip.id : null;
      
      const { data: newTrip, error: tripError } = await supabase
        .from('trips')
        .insert({
          user_id: user.id,
          title: `${originalTrip.title} (Remix)`,
          destination: originalTrip.destination,
          country: originalTrip.country,
          duration: originalTrip.duration,
          cover_image: originalTrip.coverImage,
          tags: originalTrip.tags,
          travel_style: originalTrip.travelStyle,
          budget: originalTrip.budget,
          pace: originalTrip.pace,
          remixed_from_id: remixedFromId,
          is_public: false,
        })
        .select()
        .single();

      if (tripError) throw tripError;

      // 2. Increment remix count on original trip (only if valid UUID)
      if (remixedFromId) {
        await supabase
          .from('trips')
          .update({ remix_count: (originalTrip.remixCount || 0) + 1 })
          .eq('id', originalTrip.id);
      }

      // 3. Copy day itineraries
      for (const day of originalTrip.itinerary) {
        const { data: newDay, error: dayError } = await supabase
          .from('day_itineraries')
          .insert({
            trip_id: newTrip.id,
            day_number: day.day,
            title: day.title,
            notes: day.notes,
          })
          .select()
          .single();

        if (dayError) throw dayError;

        // 4. Copy places for each day
        if (day.places.length > 0) {
          const placesToInsert = day.places.map((place, index) => ({
            day_itinerary_id: newDay.id,
            place_id: place.id,
            position: index,
            source: place.source,
            source_note: place.sourceNote,
            confidence: place.confidence,
            walking_time_from_previous: place.walkingTimeFromPrevious,
          }));

          const { error: placesError } = await supabase
            .from('itinerary_places')
            .insert(placesToInsert);

          if (placesError) throw placesError;
        }
      }

      // 5. Update user's trips_remixed count
      const { data: profile } = await supabase
        .from('profiles')
        .select('trips_remixed')
        .eq('id', user.id)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({ trips_remixed: (profile.trips_remixed || 0) + 1 })
          .eq('id', user.id);
      }

      return newTrip.id;
    },
    onSuccess: (newTripId) => {
      queryClient.invalidateQueries({ queryKey: ['user-trips'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({
        title: 'Trip remixed!',
        description: 'The trip has been copied to your collection. You can now edit it.',
      });
    },
    onError: (error) => {
      console.error('Remix error:', error);
      toast({
        title: 'Failed to remix trip',
        description: 'Please try again.',
        variant: 'destructive',
      });
    },
  });
}
