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

interface PlaceData {
  name: string;
  category: string;
  description?: string;
  imageUrl?: string;
}

export function useToggleSavePlace() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      placeId, 
      isSaved, 
      placeData 
    }: { 
      placeId: string; 
      isSaved: boolean;
      placeData?: PlaceData;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      let actualPlaceId = placeId;
      
      // If not a valid UUID, insert the place first
      if (!isValidUUID(placeId)) {
        if (!placeData) {
          throw new Error('SAMPLE_PLACE_NO_DATA');
        }
        
        // Insert the sample place into the database
        const { data: newPlace, error: insertError } = await supabase
          .from('places')
          .insert({
            name: placeData.name,
            category: placeData.category,
            description: placeData.description || null,
            image_url: placeData.imageUrl || null,
          })
          .select()
          .single();
        
        if (insertError) throw insertError;
        actualPlaceId = newPlace.id;
      }
      
      if (isSaved) {
        const { error } = await supabase
          .from('saved_places')
          .delete()
          .eq('user_id', user.id)
          .eq('place_id', actualPlaceId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('saved_places')
          .insert({ user_id: user.id, place_id: actualPlaceId });
        
        if (error) throw error;
      }
      
      return { placeId: actualPlaceId, isSaved: !isSaved };
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
      if (error.message === 'SAMPLE_PLACE_NO_DATA') {
        toast({
          title: 'Cannot save this place',
          description: 'Place data is missing. Please try again.',
          variant: 'destructive',
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
