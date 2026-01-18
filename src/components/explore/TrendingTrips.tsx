import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TripCard } from '@/components/trip/TripCard';
import { Trip } from '@/types/trip';
import { Skeleton } from '@/components/ui/skeleton';
import { TripFilters, TripFiltersState } from './TripFilters';
import { useState, useMemo } from 'react';
import { sampleTrips } from '@/data/sampleTrips';

interface TrendingTripsProps {
  limit?: number;
  showFilters?: boolean;
}

export function TrendingTrips({ limit, showFilters = true }: TrendingTripsProps) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<TripFiltersState>({
    sortBy: 'trending',
  });

  const { data: dbTrips = [], isLoading } = useQuery({
    queryKey: ['trending-trips', filters],
    queryFn: async () => {
      let query = supabase
        .from('trips')
        .select(`
          id,
          title,
          destination,
          country,
          duration,
          cover_image,
          remix_count,
          view_count,
          created_at,
          tags,
          travel_style,
          is_public,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('is_public', true);

      // Apply filters
      if (filters.destination) {
        query = query.eq('destination', filters.destination);
      }

      if (filters.duration) {
        if (filters.duration === 'short') {
          query = query.lte('duration', 3);
        } else if (filters.duration === 'medium') {
          query = query.gte('duration', 4).lte('duration', 7);
        } else if (filters.duration === 'long') {
          query = query.gte('duration', 8);
        }
      }

      if (filters.style) {
        query = query.contains('travel_style', [filters.style]);
      }

      // Apply sorting
      if (filters.sortBy === 'trending') {
        query = query.order('view_count', { ascending: false });
      } else if (filters.sortBy === 'recent') {
        query = query.order('created_at', { ascending: false });
      } else if (filters.sortBy === 'remixes') {
        query = query.order('remix_count', { ascending: false });
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Map DB trips to Trip type
  const trips: Trip[] = useMemo(() => {
    if (dbTrips.length === 0) {
      // Use sample trips as fallback
      let filtered = [...sampleTrips];
      
      if (filters.sortBy === 'trending') {
        filtered.sort((a, b) => b.viewCount - a.viewCount);
      } else if (filters.sortBy === 'recent') {
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else if (filters.sortBy === 'remixes') {
        filtered.sort((a, b) => b.remixCount - a.remixCount);
      }
      
      return limit ? filtered.slice(0, limit) : filtered;
    }

    return dbTrips.map((trip: any) => ({
      id: trip.id,
      title: trip.title,
      destination: trip.destination,
      country: trip.country,
      coverImage: trip.cover_image || 'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800',
      duration: trip.duration,
      itinerary: [],
      author: {
        id: trip.profiles?.id || '',
        name: trip.profiles?.full_name || trip.profiles?.username || 'Unknown',
        username: trip.profiles?.username || 'unknown',
        avatar: trip.profiles?.avatar_url,
      },
      tags: trip.tags || [],
      remixCount: trip.remix_count || 0,
      viewCount: trip.view_count || 0,
      createdAt: trip.created_at,
      travelStyle: trip.travel_style,
    }));
  }, [dbTrips, filters, limit]);

  // Get unique destinations for filter
  const destinations = useMemo(() => {
    const dests = new Set(sampleTrips.map(t => t.destination));
    return Array.from(dests);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {showFilters && <Skeleton className="h-10 w-full" />}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showFilters && (
        <TripFilters
          filters={filters}
          onFiltersChange={setFilters}
          destinations={destinations}
        />
      )}

      {trips.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No trips found matching your filters
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onClick={() => navigate(`/trip/${trip.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
