import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { AUTH_DISABLED } from '@/lib/flags';
import { geocodePlaceCoordinates } from '@/lib/geocode';
import {
  GUEST_AUTHOR,
  addGuestDay,
  addGuestPlaceToDay,
  createGuestPlaceId,
  createGuestTripId,
  getGuestTripById,
  getGuestTrips,
  makeGuestDayId,
  parseGuestDayId,
  saveGuestTrip,
} from '@/lib/guestTrips';
import type { DayItinerary as TripDay, Place, Trip } from '@/types/trip';

async function resolvePlaceInputs(
  places: PlaceInput[],
  destination?: string
): Promise<PlaceInput[]> {
  const resolvedPlaces: PlaceInput[] = [];
  for (const place of places) {
    if (place.coordinates) {
      resolvedPlaces.push(place);
      continue;
    }

    const coordinates = await geocodePlaceCoordinates(place.name, destination);
    resolvedPlaces.push(coordinates ? { ...place, coordinates } : place);
  }
  return resolvedPlaces;
}

function bucketPlaceIndices(places: PlaceInput[], dayCount: number) {
  const buckets: number[][] = Array.from({ length: dayCount }, () => []);
  const overflow: number[] = [];

  places.forEach((place, index) => {
    if (place.dayIndex && place.dayIndex >= 1 && place.dayIndex <= dayCount) {
      buckets[place.dayIndex - 1].push(index);
      return;
    }
    overflow.push(index);
  });

  if (overflow.length > 0) {
    const perDay = Math.ceil(overflow.length / dayCount);
    overflow.forEach((placeIndex, index) => {
      const dayIndex = Math.min(Math.floor(index / perDay), dayCount - 1);
      buckets[dayIndex].push(placeIndex);
    });
  }

  return buckets;
}

export interface UserTrip {
  id: string;
  title: string;
  destination: string;
  country: string;
  duration: number;
  cover_image: string | null;
  created_at: string;
  remixed_from_id: string | null;
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
    queryKey: ['user-trips', AUTH_DISABLED ? 'guest' : user?.id],
    queryFn: async () => {
      if (AUTH_DISABLED) {
        return getGuestTrips().map(trip => ({
          id: trip.id,
          title: trip.title,
          destination: trip.destination,
          country: trip.country,
          duration: trip.duration,
          cover_image: trip.coverImage,
          created_at: trip.createdAt,
          remixed_from_id: trip.remixedFrom?.tripId || null,
        })) as UserTrip[];
      }
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('trips')
        .select('id, title, destination, country, duration, cover_image, created_at, remixed_from_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as UserTrip[];
    },
    enabled: AUTH_DISABLED || !!user?.id,
  });
}

export function useTripDays(tripId: string | null) {
  return useQuery({
    queryKey: ['trip-days', AUTH_DISABLED ? `guest-${tripId}` : tripId],
    queryFn: async () => {
      if (!tripId) return [];
      if (AUTH_DISABLED) {
        const trip = getGuestTripById(tripId);
        if (!trip) return [];
        return trip.itinerary.map(day => ({
          id: makeGuestDayId(tripId, day.day),
          trip_id: tripId,
          day_number: day.day,
          title: day.title || null,
          notes: day.notes || null,
        })) as DayItinerary[];
      }
      
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
      placeName,
      destination,
      coordinates,
    }: { 
      dayItineraryId: string; 
      placeId: string;
      placeName: string;
      destination?: string;
      coordinates?: { lat: number; lng: number };
    }) => {
      const resolvedCoordinates = coordinates
        ?? await geocodePlaceCoordinates(placeName, destination);

      if (AUTH_DISABLED) {
        const parsed = parseGuestDayId(dayItineraryId);
        if (!parsed) {
          throw new Error('Invalid day');
        }

        const place: Place = {
          id: placeId,
          name: placeName,
          category: 'culture',
          source: 'user',
          coordinates: resolvedCoordinates || undefined,
        };

        const updated = addGuestPlaceToDay(parsed.tripId, parsed.dayNumber, place);
        if (!updated) throw new Error('Trip not found');
        return { dayItineraryId, placeId };
      }

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
        .select('id, latitude, longitude')
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
            latitude: resolvedCoordinates?.lat ?? null,
            longitude: resolvedCoordinates?.lng ?? null,
          })
          .select('id')
          .single();
        
        if (createError) throw createError;
        actualPlaceId = newPlace.id;
      } else if (
        resolvedCoordinates
        && (existingPlace.latitude == null || existingPlace.longitude == null)
      ) {
        const { error: updateError } = await supabase
          .from('places')
          .update({
            latitude: resolvedCoordinates.lat,
            longitude: resolvedCoordinates.lng,
          })
          .eq('id', existingPlace.id);
        if (updateError) {
          console.error('Failed to update place coordinates:', updateError);
        }
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
      queryClient.invalidateQueries({ queryKey: ['trip-detail'] });
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
      if (AUTH_DISABLED) {
        const result = addGuestDay(tripId);
        if (!result) throw new Error('Trip not found');
        return {
          id: makeGuestDayId(tripId, result.day.day),
          trip_id: tripId,
          day_number: result.day.day,
          title: result.day.title || null,
          notes: result.day.notes || null,
        };
      }
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
      queryClient.invalidateQueries({ queryKey: ['trip-detail'] });
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

export interface CreateTripInput {
  title: string;
  destination: string;
  country: string;
  duration: number;
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateTripInput) => {
      if (AUTH_DISABLED) {
        const tripId = createGuestTripId();
        const createdAt = new Date().toISOString();
        const itinerary: TripDay[] = Array.from({ length: input.duration }, (_, index) => ({
          day: index + 1,
          title: `Day ${index + 1}`,
          places: [],
        }));
        const trip: Trip = {
          id: tripId,
          title: input.title,
          destination: input.destination,
          country: input.country,
          duration: input.duration,
          coverImage: 'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800',
          itinerary,
          author: GUEST_AUTHOR,
          tags: [],
          remixCount: 0,
          viewCount: 0,
          createdAt,
        };
        saveGuestTrip(trip);
        return {
          trip,
          firstDay: {
            id: makeGuestDayId(tripId, 1),
            trip_id: tripId,
            day_number: 1,
            title: 'Day 1',
            notes: null,
          },
        };
      }
      if (!user?.id) throw new Error('Not authenticated');
      
      // Create the trip
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          user_id: user.id,
          title: input.title,
          destination: input.destination,
          country: input.country,
          duration: input.duration,
        })
        .select()
        .single();
      
      if (tripError) throw tripError;
      
      // Create Day 1 automatically
      const { data: day, error: dayError } = await supabase
        .from('day_itineraries')
        .insert({
          trip_id: trip.id,
          day_number: 1,
          title: 'Day 1',
        })
        .select()
        .single();
      
      if (dayError) throw dayError;
      
      return { trip, firstDay: day };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip-days'] });
      queryClient.invalidateQueries({ queryKey: ['trip-detail'] });
      toast({
        title: 'Trip created!',
        description: 'Your new trip is ready.',
      });
    },
    onError: (error) => {
      console.error('Error creating trip:', error);
      toast({
        title: 'Error',
        description: 'Failed to create trip. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

// Input for creating a trip with places
export interface PlaceInput {
  name: string;
  displayName?: string;
  placeId?: string;
  nameLocal?: string;
  category: string;
  description?: string;
  duration?: number;
  cost?: string;
  tips?: string[];
  confidence?: number;
  source: 'user' | 'ai';
  dayIndex?: number;
  dayLabel?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface CreateTripWithPlacesInput {
  title: string;
  destination: string;
  country: string;
  duration: number;
  places: PlaceInput[];
}

export function useCreateTripWithPlaces() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateTripWithPlacesInput) => {
      const placesWithCoords = input.places.some(place => !place.coordinates)
        ? await resolvePlaceInputs(input.places, input.destination)
        : input.places;

      if (AUTH_DISABLED) {
        const tripId = createGuestTripId();
        const createdAt = new Date().toISOString();
        const dayCount = Math.max(1, input.duration);
        const itinerary: TripDay[] = Array.from({ length: dayCount }, (_, index) => ({
          day: index + 1,
          title: `Day ${index + 1}`,
          places: [],
        }));

        const buckets = bucketPlaceIndices(placesWithCoords, dayCount);
        buckets.forEach((bucket, dayIndex) => {
          bucket.forEach((placeIndex, index) => {
            const place = placesWithCoords[placeIndex];
            if (!place) return;
            itinerary[dayIndex].places.push({
              id: createGuestPlaceId(tripId, index + dayIndex * 1000),
              name: place.displayName ?? place.name,
              displayName: place.displayName,
              placeId: place.placeId,
              nameLocal: place.nameLocal,
              category: (place.category || 'culture') as Place['category'],
              description: place.description,
              duration: place.duration,
              cost: place.cost,
              tips: place.tips,
              confidence: place.confidence,
              source: place.source,
              coordinates: place.coordinates,
            });
          });
        });

        const trip: Trip = {
          id: tripId,
          title: input.title,
          destination: input.destination,
          country: input.country,
          duration: dayCount,
          coverImage: 'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800',
          itinerary,
          author: GUEST_AUTHOR,
          tags: [],
          remixCount: 0,
          viewCount: 0,
          createdAt,
        };

        saveGuestTrip(trip);
        return {
          trip,
          days: itinerary.map(day => ({
            id: makeGuestDayId(tripId, day.day),
            trip_id: tripId,
            day_number: day.day,
            title: day.title || null,
            notes: day.notes || null,
          })),
        };
      }
      if (!user?.id) throw new Error('Not authenticated');
      
      // 1. Create the trip
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          user_id: user.id,
          title: input.title,
          destination: input.destination,
          country: input.country,
          duration: input.duration,
        })
        .select()
        .single();
      
      if (tripError) throw tripError;
      
      // 2. Create day itineraries for all days
      const dayInserts = Array.from({ length: input.duration }, (_, i) => ({
        trip_id: trip.id,
        day_number: i + 1,
        title: `Day ${i + 1}`,
      }));
      
      const { data: days, error: daysError } = await supabase
        .from('day_itineraries')
        .insert(dayInserts)
        .select()
        .order('day_number', { ascending: true });
      
      if (daysError) throw daysError;
      
      // 3. Insert all places into places table
      if (placesWithCoords.length > 0) {
        const placeInserts = placesWithCoords.map(p => ({
          name: p.displayName ?? p.name,
          name_local: p.nameLocal || null,
          category: p.category || 'attraction',
          description: p.description || null,
          duration: p.duration || 60,
          cost: p.cost || null,
          tips: p.tips || [],
          latitude: p.coordinates?.lat ?? null,
          longitude: p.coordinates?.lng ?? null,
        }));
        
        const { data: places, error: placesError } = await supabase
          .from('places')
          .insert(placeInserts)
          .select();
        
        if (placesError) throw placesError;
        
        // 4. Distribute places across days evenly
        const buckets = bucketPlaceIndices(placesWithCoords, input.duration);
        const itineraryPlaceInserts: {
          day_itinerary_id: string;
          place_id: string;
          position: number;
          source: string;
          confidence: number | null;
        }[] = [];

        buckets.forEach((bucket, dayIndex) => {
          const dayId = days[Math.min(dayIndex, days.length - 1)].id;
          bucket.forEach((placeIndex, positionInDay) => {
            const originalPlace = placesWithCoords[placeIndex];
            const place = places[placeIndex];
            if (!place) return;
            itineraryPlaceInserts.push({
              day_itinerary_id: dayId,
              place_id: place.id,
              position: positionInDay,
              source: originalPlace.source || 'user',
              confidence: originalPlace.confidence || null,
            });
          });
        });
        
        const { error: itineraryError } = await supabase
          .from('itinerary_places')
          .insert(itineraryPlaceInserts);
        
        if (itineraryError) throw itineraryError;
      }
      
      return { trip, days };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip-days'] });
      queryClient.invalidateQueries({ queryKey: ['trip-detail'] });
      toast({
        title: 'Trip created!',
        description: 'Your itinerary is ready.',
      });
    },
    onError: (error) => {
      console.error('Error creating trip with places:', error);
      toast({
        title: 'Error',
        description: 'Failed to create trip. Please try again.',
        variant: 'destructive',
      });
    },
  });
}
