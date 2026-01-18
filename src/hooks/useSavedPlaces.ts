import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { isValidUUID } from '@/lib/utils';

export function useSavedPlaces() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['saved-places', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('saved_places')
        .select('place_id')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data.map(item => item.place_id);
    },
    enabled: !!user?.id,
  });
}

export function useToggleSavePlace() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ placeId, isSaved }: { placeId: string; isSaved: boolean }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Check if placeId is a valid UUID - sample data uses non-UUID IDs
      if (!isValidUUID(placeId)) {
        throw new Error('SAMPLE_PLACE');
      }
      
      if (isSaved) {
        const { error } = await supabase
          .from('saved_places')
          .delete()
          .eq('user_id', user.id)
          .eq('place_id', placeId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('saved_places')
          .insert({ user_id: user.id, place_id: placeId });
        
        if (error) throw error;
      }
      
      return { placeId, isSaved: !isSaved };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['saved-places', user?.id] });
      toast({
        title: result.isSaved ? 'Place saved!' : 'Place removed',
        description: result.isSaved 
          ? 'Added to your saved places' 
          : 'Removed from your saved places',
      });
    },
    onError: (error: Error) => {
      if (error.message === 'SAMPLE_PLACE') {
        toast({
          title: 'Cannot save this place',
          description: 'Add this place to a trip first to save it to your collection.',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to save place. Please try again.',
          variant: 'destructive',
        });
      }
    },
  });
}
