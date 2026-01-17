import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface UserTrip {
  id: string;
  title: string;
  destination: string;
  country: string;
  duration: number;
  cover_image: string | null;
  created_at: string;
}

export interface DayItinerary {
  id: string;
  trip_id: string;
  day_number: number;
  title: string | null;
  notes: string | null;
}

export function useUserTrips() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-trips', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('trips')
        .select('id, title, destination, country, duration, cover_image, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as UserTrip[];
    },
    enabled: !!user?.id,
  });
}

export function useTripDays(tripId: string | null) {
  return useQuery({
    queryKey: ['trip-days', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      
      const { data, error } = await supabase
        .from('day_itineraries')
        .select('id, trip_id, day_number, title, notes')
        .eq('trip_id', tripId)
        .order('day_number', { ascending: true });
      
      if (error) throw error;
      return data as DayItinerary[];
    },
    enabled: !!tripId,
  });
}

export function useAddPlaceToItinerary() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      dayItineraryId, 
      placeId,
      placeName 
    }: { 
      dayItineraryId: string; 
      placeId: string;
      placeName: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Get current max position in this day
      const { data: existingPlaces, error: fetchError } = await supabase
        .from('itinerary_places')
        .select('position')
        .eq('day_itinerary_id', dayItineraryId)
        .order('position', { ascending: false })
        .limit(1);
      
      if (fetchError) throw fetchError;
      
      const nextPosition = existingPlaces && existingPlaces.length > 0 
        ? existingPlaces[0].position + 1 
        : 0;
      
      // Check if place exists in places table, if not create it
      const { data: existingPlace } = await supabase
        .from('places')
        .select('id')
        .eq('id', placeId)
        .maybeSingle();
      
      let actualPlaceId = placeId;
      
      // If place doesn't exist (it's from sample data), we need to create it
      if (!existingPlace) {
        // For now, create a simple place entry
        const { data: newPlace, error: createError } = await supabase
          .from('places')
          .insert({
            name: placeName,
            category: 'culture', // Default category
          })
          .select('id')
          .single();
        
        if (createError) throw createError;
        actualPlaceId = newPlace.id;
      }
      
      // Insert the place into the itinerary
      const { error: insertError } = await supabase
        .from('itinerary_places')
        .insert({
          day_itinerary_id: dayItineraryId,
          place_id: actualPlaceId,
          position: nextPosition,
          source: 'user',
        });
      
      if (insertError) throw insertError;
      
      return { dayItineraryId, placeId: actualPlaceId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trip-days'] });
      queryClient.invalidateQueries({ queryKey: ['itinerary-places'] });
      toast({
        title: 'Place added!',
        description: `${variables.placeName} has been added to your itinerary`,
      });
    },
    onError: (error) => {
      console.error('Error adding place:', error);
      toast({
        title: 'Error',
        description: 'Failed to add place. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useCreateDayItinerary() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ tripId, dayNumber }: { tripId: string; dayNumber: number }) => {
      const { data, error } = await supabase
        .from('day_itineraries')
        .insert({
          trip_id: tripId,
          day_number: dayNumber,
          title: `Day ${dayNumber}`,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-days'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create day. Please try again.',
        variant: 'destructive',
      });
    },
  });
}
