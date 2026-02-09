import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Place, PlaceCategory } from '@/types/trip';
import type { PlaceDetailsRequest, PlaceDetailsResponse } from '@/types/itinerary';
import { api } from '@/lib/api';

interface DbPlace {
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
  created_at: string | null;
}

function mapDbPlaceToPlace(dbPlace: DbPlace): Place {
  return {
    id: dbPlace.id,
    name: dbPlace.name,
    nameLocal: dbPlace.name_local || undefined,
    category: dbPlace.category as PlaceCategory,
    source: 'user', // Default, as DB places don't have source
    description: dbPlace.description || undefined,
    imageUrl: dbPlace.image_url || undefined,
    duration: dbPlace.duration || undefined,
    cost: dbPlace.cost || undefined,
    rating: dbPlace.rating ? Number(dbPlace.rating) : undefined,
    address: dbPlace.address || undefined,
    coordinates: dbPlace.latitude != null && dbPlace.longitude != null
      ? { lat: Number(dbPlace.latitude), lng: Number(dbPlace.longitude) }
      : undefined,
    tips: dbPlace.tips || undefined,
    openingHours: dbPlace.opening_hours || undefined,
  };
}

export function usePlaces(category?: string) {
  return useQuery({
    queryKey: ['places', category],
    queryFn: async (): Promise<Place[]> => {
      let query = supabase
        .from('places')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching places:', error);
        return [];
      }

      return (data as DbPlace[]).map(mapDbPlaceToPlace);
    },
  });
}

export function usePlaceDetail(placeId: string | undefined) {
  return useQuery({
    queryKey: ['place-detail', placeId],
    queryFn: async (): Promise<Place | null> => {
      if (!placeId) return null;

      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('id', placeId)
        .single();

      if (error) {
        console.error('Error fetching place:', error);
        return null;
      }

      return mapDbPlaceToPlace(data as DbPlace);
    },
    enabled: !!placeId,
  });
}

export function usePlaceWithTripInfo(placeId: string | undefined) {
  return useQuery({
    queryKey: ['place-with-trip', placeId],
    queryFn: async () => {
      if (!placeId) return null;

      // First get the place
      const { data: placeData, error: placeError } = await supabase
        .from('places')
        .select('*')
        .eq('id', placeId)
        .single();

      if (placeError) {
        console.error('Error fetching place:', placeError);
        return null;
      }

      const place = mapDbPlaceToPlace(placeData as DbPlace);

      // Try to find which trip this place belongs to
      const { data: itineraryData } = await supabase
        .from('itinerary_places')
        .select(`
          day_itinerary_id,
          day_itineraries:day_itinerary_id (
            trip_id,
            trips:trip_id (
              id,
              title,
              user_id,
              profiles:user_id (
                id,
                username,
                full_name,
                avatar_url
              )
            )
          )
        `)
        .eq('place_id', placeId)
        .limit(1)
        .single();

      let tripInfo = null;
      if (itineraryData?.day_itineraries) {
        const dayItinerary = itineraryData.day_itineraries as unknown as {
          trip_id: string;
          trips: {
            id: string;
            title: string;
            user_id: string;
            profiles: {
              id: string;
              username: string;
              full_name: string | null;
              avatar_url: string | null;
            } | null;
          } | null;
        };
        
        if (dayItinerary.trips) {
          tripInfo = {
            id: dayItinerary.trips.id,
            title: dayItinerary.trips.title,
            author: {
              id: dayItinerary.trips.profiles?.id || dayItinerary.trips.user_id,
              name: dayItinerary.trips.profiles?.full_name || dayItinerary.trips.profiles?.username || 'Unknown',
              username: dayItinerary.trips.profiles?.username || 'unknown',
              avatar: dayItinerary.trips.profiles?.avatar_url || undefined,
            },
          };
        }
      }

      return { place, tripInfo };
    },
    enabled: !!placeId,
  });
}

export function usePlaceReviews(placeId: string | undefined) {
  return useQuery({
    queryKey: ['place-reviews', placeId],
    queryFn: async () => {
      if (!placeId) return [];

      const { data, error } = await api.getPlaceReviews(placeId, 5);
      if (error || !data) {
        if (error) {
          console.error('Error fetching place reviews:', error);
        }
        return [];
      }

      return data.reviews.slice(0, 5).map(review => ({
        id: review.reviewId,
        name: review.authorName || 'Anonymous',
        avatar: review.authorAvatarUrl || '',
        rating: review.rating || 0,
        text: review.text || '',
        time: review.relativeTimeText || formatTimeAgo(new Date(review.createdAt)),
        sourceUrl: review.sourceUrl || '',
      }));
    },
    enabled: !!placeId,
  });
}

export function usePlaceDetails(request: PlaceDetailsRequest | null) {
  const providerPlaceId = request?.providerPlaceId?.trim() || null;
  const queryText = request?.queryText?.trim() || null;
  const destinationContext = request?.destinationContext?.trim() || null;
  const hasLookupInput = Boolean(providerPlaceId || queryText);

  return useQuery<PlaceDetailsResponse>({
    queryKey: [
      'place-details',
      providerPlaceId,
      queryText,
      destinationContext,
      request?.lat ?? null,
      request?.lng ?? null,
      request?.reviewLimit ?? 5,
    ],
    queryFn: async () => {
      if (!request) {
        throw new Error('Place details request is required');
      }

      const { data, error } = await api.getPlaceDetails(request);
      if (error || !data) {
        throw error || new Error('Unable to load place details');
      }

      return data;
    },
    enabled: hasLookupInput,
  });
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}
