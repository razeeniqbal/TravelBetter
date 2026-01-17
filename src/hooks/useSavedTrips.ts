import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useSavedTrips() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['saved-trips', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('saved_trips')
        .select('trip_id')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data.map(item => item.trip_id);
    },
    enabled: !!user?.id,
  });
}

export function useToggleSaveTrip() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ tripId, isSaved }: { tripId: string; isSaved: boolean }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      if (isSaved) {
        const { error } = await supabase
          .from('saved_trips')
          .delete()
          .eq('user_id', user.id)
          .eq('trip_id', tripId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('saved_trips')
          .insert({ user_id: user.id, trip_id: tripId });
        
        if (error) throw error;
      }
      
      return { tripId, isSaved: !isSaved };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['saved-trips', user?.id] });
      toast({
        title: result.isSaved ? 'Trip saved!' : 'Trip removed',
        description: result.isSaved 
          ? 'Added to your saved trips' 
          : 'Removed from your saved trips',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to save trip. Please try again.',
        variant: 'destructive',
      });
    },
  });
}
