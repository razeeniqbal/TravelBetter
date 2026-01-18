import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useSavedTrips } from '@/hooks/useSavedTrips';
import { useUserTrips } from '@/hooks/useUserTrips';
import { BottomNav } from '@/components/navigation/BottomNav';
import { ProfileStats } from '@/components/profile/ProfileStats';
import { TripGallery } from '@/components/profile/TripGallery';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Settings, LogOut, Edit2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sampleTrips } from '@/data/sampleTrips';
import { Trip } from '@/types/trip';
import { useMemo } from 'react';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const { data: savedTripIds = [] } = useSavedTrips();
  const { data: userTrips = [], isLoading: isTripsLoading } = useUserTrips();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: 'Signed out',
      description: 'You have been signed out successfully.',
    });
    navigate('/');
  };

  // Map user trips to Trip format
  const createdTrips: Trip[] = useMemo(() => {
    return userTrips
      .filter(t => !t.remixed_from_id)
      .map(t => ({
        id: t.id,
        title: t.title,
        destination: t.destination,
        country: t.country,
        duration: t.duration,
        coverImage: t.cover_image || 'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800',
        author: {
          id: user?.id || '',
          name: profile?.full_name || profile?.username || 'You',
          username: profile?.username || 'you',
          avatar: profile?.avatar_url || undefined,
        },
        itinerary: [],
        tags: [],
        remixCount: 0,
        viewCount: 0,
        createdAt: t.created_at,
      }));
  }, [userTrips, user, profile]);

  const remixedTrips: Trip[] = useMemo(() => {
    return userTrips
      .filter(t => t.remixed_from_id)
      .map(t => ({
        id: t.id,
        title: t.title,
        destination: t.destination,
        country: t.country,
        duration: t.duration,
        coverImage: t.cover_image || 'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800',
        author: {
          id: user?.id || '',
          name: profile?.full_name || profile?.username || 'You',
          username: profile?.username || 'you',
          avatar: profile?.avatar_url || undefined,
        },
        itinerary: [],
        tags: [],
        remixCount: 0,
        viewCount: 0,
        createdAt: t.created_at,
        remixedFrom: { tripId: t.remixed_from_id!, authorName: 'Unknown' },
      }));
  }, [userTrips, user, profile]);

  const savedTrips: Trip[] = useMemo(() => {
    return sampleTrips.filter(t => savedTripIds.includes(t.id));
  }, [savedTripIds]);

  const isLoading = isProfileLoading || isTripsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-4">
        <h1 className="text-xl font-bold">Profile</h1>
        <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
          <Settings className="h-5 w-5" />
        </Button>
      </header>

      <div className="p-4 space-y-6">
        {/* Profile Header */}
        <div className="flex items-start gap-4">
          <Avatar className="h-20 w-20 border-2 border-primary/10">
            <AvatarImage src={profile?.avatar_url || ''} />
            <AvatarFallback className="text-2xl bg-primary/5">
              {profile?.full_name?.[0] || profile?.username?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{profile?.full_name || profile?.username}</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-muted-foreground">@{profile?.username}</p>
            <p className="mt-2 text-sm">{profile?.bio || 'No bio yet. Tell us about your travels!'}</p>
          </div>
        </div>

        {/* Stats */}
        <ProfileStats
          countriesVisited={profile?.countries_visited || 0}
          tripsCreated={profile?.trips_created || createdTrips.length}
          tripsRemixed={profile?.trips_remixed || remixedTrips.length}
        />

        {/* Trip Gallery */}
        <div>
          <h3 className="mb-4 text-lg font-semibold">Your Trips</h3>
          <TripGallery
            createdTrips={createdTrips}
            remixedTrips={remixedTrips}
            savedTrips={savedTrips}
            isLoading={isTripsLoading}
          />
        </div>

        {/* Sign Out */}
        <Button 
          variant="outline" 
          className="w-full gap-2 text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}
