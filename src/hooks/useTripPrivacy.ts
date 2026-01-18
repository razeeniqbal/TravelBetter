import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useTripPrivacy(tripId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (isPublic: boolean) => {
      const { error } = await supabase
        .from('trips')
        .update({ is_public: isPublic })
        .eq('id', tripId);

      if (error) throw error;
      return isPublic;
    },
    onSuccess: (isPublic) => {
      queryClient.invalidateQueries({ queryKey: ['trip-detail', tripId] });
      toast({
        title: isPublic ? 'Trip is now public' : 'Trip is now private',
        description: isPublic 
          ? 'Anyone with the link can view this trip'
          : 'Only you can see this trip',
      });
    },
    onError: () => {
      toast({
        title: 'Failed to update privacy',
        description: 'Please try again.',
        variant: 'destructive',
      });
    },
  });
}
