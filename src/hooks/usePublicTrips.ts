import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AUTH_DISABLED } from '@/lib/flags';
import { getGuestTrips } from '@/lib/guestTrips';
import type { Trip, Place } from '@/types/trip';

interface DbTrip {
  id: string;
  title: string;
  destination: string;
  country: string;
  duration: number;
  cover_image: string | null;
  created_at: string;
  remixed_from_id: string | null;
  is_public: boolean;
  user_id: string;
  profiles: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  day_itineraries: {
    id: string;
    day_number: number;
    title: string | null;
    itinerary_places: {
      position: number;
      source: string;
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
        tips: string[] | null;
      };
    }[];
  }[];
}

function mapDbTripToTrip(dbTrip: DbTrip): Trip {
  const author = dbTrip.profiles ? {
    id: dbTrip.profiles.id,
    name: dbTrip.profiles.display_name || 'Traveler',
    username: dbTrip.profiles.username || 'traveler',
    avatar: dbTrip.profiles.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
    bio: '',
    tripsCreated: 0,
    tripsRemixed: 0,
    countriesVisited: 0,
    joinedAt: '',
  } : {
    id: dbTrip.user_id,
    name: 'Traveler',
    username: 'traveler',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
    bio: '',
    tripsCreated: 0,
    tripsRemixed: 0,
    countriesVisited: 0,
    joinedAt: '',
  };

  const itinerary = dbTrip.day_itineraries
    .sort((a, b) => a.day_number - b.day_number)
    .map(day => ({
      day: day.day_number,
      title: day.title || `Day ${day.day_number}`,
      places: day.itinerary_places
        .sort((a, b) => a.position - b.position)
        .map(ip => ({
          id: ip.places.id,
          name: ip.places.name,
          nameLocal: ip.places.name_local || undefined,
          category: ip.places.category,
          description: ip.places.description || undefined,
          imageUrl: ip.places.image_url || undefined,
          duration: ip.places.duration || undefined,
          cost: ip.places.cost || undefined,
          tips: ip.places.tips || undefined,
          source: ip.source as 'user' | 'ai',
          confidence: ip.confidence || undefined,
        } as Place)),
    }));

  return {
    id: dbTrip.id,
    title: dbTrip.title,
    destination: dbTrip.destination,
    country: dbTrip.country,
    duration: dbTrip.duration,
    coverImage: dbTrip.cover_image || 'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800',
    createdAt: dbTrip.created_at,
    author,
    tags: [],
    remixCount: 0,
    viewCount: 0,
    itinerary,
    remixedFrom: dbTrip.remixed_from_id ? { tripId: dbTrip.remixed_from_id, authorName: '' } : undefined,
  };
}

export function usePublicTrips(limit = 10) {
  return useQuery({
    queryKey: ['public-trips', limit],
    queryFn: async (): Promise<Trip[]> => {
      // In guest mode, return guest trips as "public"
      if (AUTH_DISABLED) {
        return getGuestTrips().slice(0, limit);
      }

      const { data, error } = await supabase
        .from('trips')
        .select(`
          id,
          title,
          destination,
          country,
          duration,
          cover_image,
          created_at,
          remixed_from_id,
          is_public,
          user_id,
          profiles (
            id,
            display_name,
            username,
            avatar_url
          ),
          day_itineraries (
            id,
            day_number,
            title,
            itinerary_places (
              position,
              source,
              confidence,
              places (
                id,
                name,
                name_local,
                category,
                description,
                image_url,
                duration,
                cost,
                tips
              )
            )
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching public trips:', error);
        return [];
      }

      return (data as unknown as DbTrip[]).map(mapDbTripToTrip);
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useFeaturedTrips() {
  return usePublicTrips(4);
}
