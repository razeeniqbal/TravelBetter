import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { BottomNav } from '@/components/navigation/BottomNav';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Settings, MapPin, Calendar, Copy, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: 'Signed out',
      description: 'You have been signed out successfully.',
    });
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="flex items-center justify-between border-b px-4 py-4">
        <h1 className="text-xl font-bold">Profile</h1>
        <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
          <Settings className="h-5 w-5" />
        </Button>
      </header>

      <div className="p-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile?.avatar_url || ''} />
            <AvatarFallback className="text-2xl">
              {profile?.full_name?.[0] || profile?.username?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-bold">{profile?.full_name || profile?.username}</h2>
            <p className="text-muted-foreground">@{profile?.username}</p>
            <p className="mt-1 text-sm">{profile?.bio || 'No bio yet'}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <MapPin className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-2 text-2xl font-bold">{profile?.countries_visited || 0}</p>
            <p className="text-xs text-muted-foreground">Countries</p>
          </Card>
          <Card className="p-4 text-center">
            <Calendar className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-2 text-2xl font-bold">{profile?.trips_created || 0}</p>
            <p className="text-xs text-muted-foreground">Trips</p>
          </Card>
          <Card className="p-4 text-center">
            <Copy className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-2 text-2xl font-bold">{profile?.trips_remixed || 0}</p>
            <p className="text-xs text-muted-foreground">Remixed</p>
          </Card>
        </div>

        <div className="mt-6">
          <h3 className="mb-3 font-semibold">Your Trips</h3>
          <Card 
            className="flex items-center justify-center p-8 text-center text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/trips')}
          >
            <div>
              <p>View all your trips</p>
              <p className="text-sm">Tap to see created, remixed, and saved trips</p>
            </div>
          </Card>
        </div>

        <Button 
          variant="outline" 
          className="mt-6 w-full gap-2 text-destructive hover:bg-destructive/10"
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
