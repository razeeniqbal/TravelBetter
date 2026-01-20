import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Trip, DayItinerary, Place, PlaceCategory, PlaceSource } from '@/types/trip';
import { AUTH_DISABLED } from '@/lib/flags';
import { getGuestTripById } from '@/lib/guestTrips';

interface DbTrip {
  id: string;
  title: string;
  destination: string;
  country: string;
  duration: number;
  cover_image: string | null;
  tags: string[] | null;
  travel_style: string[] | null;
  budget: string | null;
  pace: string | null;
  remix_count: number | null;
  view_count: number | null;
  created_at: string | null;
  remixed_from_id: string | null;
  user_id: string;
  profiles: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface DbDayItinerary {
  id: string;
  trip_id: string;
  day_number: number;
  title: string | null;
  notes: string | null;
}

interface DbItineraryPlace {
  id: string;
  day_itinerary_id: string;
  place_id: string;
  position: number;
  scheduled_time: string | null;
  walking_time_from_previous: number | null;
  source: string | null;
  source_note: string | null;
  confidence: number | null;
  places: {
    id: string;
    name: string;
    name_local: string | null;
    category: string;
    description: string | null;
    image_url: string | null;
    duration: number | null;
    cost: string | null;
    rating: number | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    tips: string[] | null;
    opening_hours: string | null;
  } | null;
}

function mapDbPlaceToPlace(dbPlace: DbItineraryPlace): Place {
  const place = dbPlace.places;
  return {
    id: dbPlace.place_id,
    name: place?.name || 'Unknown Place',
    nameLocal: place?.name_local || undefined,
    category: (place?.category as PlaceCategory) || 'culture',
    source: (dbPlace.source as PlaceSource) || 'user',
    sourceNote: dbPlace.source_note || undefined,
    description: place?.description || undefined,
    imageUrl: place?.image_url || undefined,
    duration: place?.duration || undefined,
    cost: place?.cost || undefined,
    rating: place?.rating ? Number(place.rating) : undefined,
    address: place?.address || undefined,
    coordinates: place?.latitude && place?.longitude 
      ? { lat: Number(place.latitude), lng: Number(place.longitude) }
      : undefined,
    walkingTimeFromPrevious: dbPlace.walking_time_from_previous || undefined,
    tips: place?.tips || undefined,
    openingHours: place?.opening_hours || undefined,
    confidence: dbPlace.confidence || undefined,
  };
}

export function useTripDetail(tripId: string | undefined) {
  return useQuery({
    queryKey: ['trip-detail', tripId],
    queryFn: async (): Promise<Trip | null> => {
      if (!tripId) return null;
      if (AUTH_DISABLED) {
        return getGuestTripById(tripId) || null;
      }

      // Fetch trip with author profile
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('id', tripId)
        .single();

      if (tripError) {
        console.error('Error fetching trip:', tripError);
        return null;
      }

      const dbTrip = tripData as DbTrip;

      // Fetch day itineraries
      const { data: daysData, error: daysError } = await supabase
        .from('day_itineraries')
        .select('*')
        .eq('trip_id', tripId)
        .order('day_number', { ascending: true });

      if (daysError) {
        console.error('Error fetching day itineraries:', daysError);
        return null;
      }

      const dbDays = daysData as DbDayItinerary[];

      // Fetch all itinerary places with place details
      const dayIds = dbDays.map(d => d.id);
      let itineraryPlaces: DbItineraryPlace[] = [];
      
      if (dayIds.length > 0) {
        const { data: placesData, error: placesError } = await supabase
          .from('itinerary_places')
          .select(`
            *,
            places:place_id (
              id,
              name,
              name_local,
              category,
              description,
              image_url,
              duration,
              cost,
              rating,
              address,
              latitude,
              longitude,
              tips,
              opening_hours
            )
          `)
          .in('day_itinerary_id', dayIds)
          .order('position', { ascending: true });

        if (placesError) {
          console.error('Error fetching itinerary places:', placesError);
        } else {
          itineraryPlaces = placesData as DbItineraryPlace[];
        }
      }

      // Build itinerary structure
      const itinerary: DayItinerary[] = dbDays.map(day => {
        const dayPlaces = itineraryPlaces
          .filter(ip => ip.day_itinerary_id === day.id)
          .map(mapDbPlaceToPlace);

        return {
          day: day.day_number,
          title: day.title || undefined,
          places: dayPlaces,
          notes: day.notes || undefined,
        };
      });

      // Build trip object
      const trip: Trip = {
        id: dbTrip.id,
        title: dbTrip.title,
        destination: dbTrip.destination,
        country: dbTrip.country,
        coverImage: dbTrip.cover_image || 'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800',
        duration: dbTrip.duration,
        itinerary,
        author: {
          id: dbTrip.profiles?.id || dbTrip.user_id,
          name: dbTrip.profiles?.full_name || dbTrip.profiles?.username || 'Unknown',
          username: dbTrip.profiles?.username || 'unknown',
          avatar: dbTrip.profiles?.avatar_url || undefined,
        },
        tags: dbTrip.tags || [],
        remixCount: dbTrip.remix_count || 0,
        viewCount: dbTrip.view_count || 0,
        createdAt: dbTrip.created_at || new Date().toISOString(),
        remixedFrom: dbTrip.remixed_from_id 
          ? { tripId: dbTrip.remixed_from_id, authorName: 'Unknown' }
          : undefined,
        travelStyle: dbTrip.travel_style || undefined,
        budget: dbTrip.budget as Trip['budget'] || undefined,
        pace: dbTrip.pace as Trip['pace'] || undefined,
      };

      return trip;
    },
    enabled: !!tripId,
  });
}

export function useItineraryPlaces(dayItineraryId: string | null) {
  return useQuery({
    queryKey: ['itinerary-places', dayItineraryId],
    queryFn: async (): Promise<Place[]> => {
      if (!dayItineraryId) return [];

      const { data, error } = await supabase
        .from('itinerary_places')
        .select(`
          *,
          places:place_id (
            id,
            name,
            name_local,
            category,
            description,
            image_url,
            duration,
            cost,
            rating,
            address,
            latitude,
            longitude,
            tips,
            opening_hours
          )
        `)
        .eq('day_itinerary_id', dayItineraryId)
        .order('position', { ascending: true });

      if (error) {
        console.error('Error fetching itinerary places:', error);
        return [];
      }

      return (data as DbItineraryPlace[]).map(mapDbPlaceToPlace);
    },
    enabled: !!dayItineraryId,
  });
}
