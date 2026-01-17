import { BottomNav } from '@/components/navigation/BottomNav';
import { currentUser } from '@/data/sampleTrips';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Settings, MapPin, Calendar, Copy } from 'lucide-react';

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="flex items-center justify-between border-b px-4 py-4">
        <h1 className="text-xl font-bold">Profile</h1>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </header>

      <div className="p-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={currentUser.avatar} />
            <AvatarFallback className="text-2xl">{currentUser.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-bold">{currentUser.name}</h2>
            <p className="text-muted-foreground">@{currentUser.username}</p>
            <p className="mt-1 text-sm">{currentUser.bio}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <MapPin className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-2 text-2xl font-bold">{currentUser.countriesVisited}</p>
            <p className="text-xs text-muted-foreground">Countries</p>
          </Card>
          <Card className="p-4 text-center">
            <Calendar className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-2 text-2xl font-bold">{currentUser.tripsCreated}</p>
            <p className="text-xs text-muted-foreground">Trips</p>
          </Card>
          <Card className="p-4 text-center">
            <Copy className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-2 text-2xl font-bold">{currentUser.tripsRemixed}</p>
            <p className="text-xs text-muted-foreground">Remixed</p>
          </Card>
        </div>

        <div className="mt-6">
          <h3 className="mb-3 font-semibold">Your Trips</h3>
          <Card className="flex items-center justify-center p-8 text-center text-muted-foreground">
            <div>
              <p>No trips yet!</p>
              <p className="text-sm">Start by importing your first travel content</p>
            </div>
          </Card>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
