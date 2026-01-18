import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useDeleteTrip() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (tripId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Delete cascade: itinerary_places -> day_itineraries -> trips
      // Get day_itineraries first
      const { data: days } = await supabase
        .from('day_itineraries')
        .select('id')
        .eq('trip_id', tripId);

      if (days && days.length > 0) {
        const dayIds = days.map(d => d.id);
        
        // Delete itinerary_places
        await supabase
          .from('itinerary_places')
          .delete()
          .in('day_itinerary_id', dayIds);
      }

      // Delete day_itineraries
      await supabase
        .from('day_itineraries')
        .delete()
        .eq('trip_id', tripId);

      // Delete saved_trips references
      await supabase
        .from('saved_trips')
        .delete()
        .eq('trip_id', tripId);

      // Delete the trip
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId)
        .eq('user_id', user.id);

      if (error) throw error;
      return tripId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-trips'] });
      toast({
        title: 'Trip deleted',
        description: 'Your trip has been deleted successfully.',
      });
    },
    onError: (error) => {
      console.error('Delete trip error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete trip. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useRenameTrip() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ tripId, newTitle }: { tripId: string; newTitle: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('trips')
        .update({ title: newTitle })
        .eq('id', tripId)
        .eq('user_id', user.id);

      if (error) throw error;
      return { tripId, newTitle };
    },
    onSuccess: ({ newTitle }) => {
      queryClient.invalidateQueries({ queryKey: ['user-trips'] });
      toast({
        title: 'Trip renamed',
        description: `Trip renamed to "${newTitle}"`,
      });
    },
    onError: (error) => {
      console.error('Rename trip error:', error);
      toast({
        title: 'Error',
        description: 'Failed to rename trip. Please try again.',
        variant: 'destructive',
      });
    },
  });
}
