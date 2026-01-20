import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AUTH_DISABLED } from '@/lib/flags';
import { GUEST_USER_ID } from '@/lib/guestTrips';

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  countries_visited: number;
  trips_created: number;
  trips_remixed: number;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', AUTH_DISABLED ? 'guest' : user?.id],
    queryFn: async () => {
      if (AUTH_DISABLED) {
        return {
          id: GUEST_USER_ID,
          username: 'guest',
          full_name: 'Guest',
          avatar_url: null,
          bio: null,
          countries_visited: 0,
          trips_created: 0,
          trips_remixed: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Profile;
      }
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: AUTH_DISABLED || !!user?.id,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (AUTH_DISABLED) {
        return {
          id: GUEST_USER_ID,
          username: 'guest',
          full_name: updates.full_name || 'Guest',
          avatar_url: updates.avatar_url || null,
          bio: updates.bio || null,
          countries_visited: updates.countries_visited || 0,
          trips_created: updates.trips_created || 0,
          trips_remixed: updates.trips_remixed || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Profile;
      }
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', AUTH_DISABLED ? 'guest' : user?.id] });
    },
  });
}
