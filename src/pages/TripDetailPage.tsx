import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sampleTrips } from '@/data/sampleTrips';
import { PlaceCard } from '@/components/trip/PlaceCard';
import { BottomNav } from '@/components/navigation/BottomNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Share2, Copy, MapPin, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function TripDetailPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [activeDay, setActiveDay] = useState(1);
  
  const trip = sampleTrips.find(t => t.id === tripId);
  
  if (!trip) {
    return <div className="flex min-h-screen items-center justify-center">Trip not found</div>;
  }

  const currentDayItinerary = trip.itinerary.find(d => d.day === activeDay);
  const totalPlaces = trip.itinerary.reduce((acc, day) => acc + day.places.length, 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Image */}
      <div className="relative h-64">
        <img src={trip.coverImage} alt={trip.title} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 top-2 rounded-full bg-black/30 text-white hover:bg-black/50"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 rounded-full bg-black/30 text-white hover:bg-black/50"
        >
          <Share2 className="h-5 w-5" />
        </Button>
        
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <div className="flex items-center gap-1 text-sm opacity-90">
            <MapPin className="h-4 w-4" />
            {trip.destination}, {trip.country}
          </div>
          <h1 className="mt-1 text-2xl font-bold">{trip.title}</h1>
        </div>
      </div>
      
      {/* Trip Info */}
      <div className="border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={trip.author.avatar} />
              <AvatarFallback>{trip.author.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{trip.author.name}</p>
              <p className="text-sm text-muted-foreground">@{trip.author.username}</p>
            </div>
          </div>
          <Button 
            onClick={() => toast.success('Trip copied to your drafts!')}
            className="gap-2"
          >
            <Copy className="h-4 w-4" />
            Copy Trip
          </Button>
        </div>
        
        <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {trip.duration} days
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {totalPlaces} places
          </span>
          <span className="flex items-center gap-1">
            <Copy className="h-4 w-4" />
            {trip.remixCount} remixes
          </span>
        </div>
        
        <div className="mt-3 flex flex-wrap gap-1">
          {trip.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="capitalize">{tag}</Badge>
          ))}
        </div>
      </div>
      
      {/* Day Tabs */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto border-b px-4 py-3">
        {trip.itinerary.map((day) => (
          <button
            key={day.day}
            onClick={() => setActiveDay(day.day)}
            className={cn(
              'flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
              activeDay === day.day
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            Day {day.day}
          </button>
        ))}
      </div>
      
      {/* Places List */}
      <div className="px-4 py-4">
        {currentDayItinerary && (
          <>
            <h2 className="mb-4 text-lg font-semibold">{currentDayItinerary.title}</h2>
            <div className="space-y-2">
              {currentDayItinerary.places.map((place, idx) => (
                <PlaceCard 
                  key={place.id} 
                  place={place} 
                  index={idx + 1}
                  showWalkingTime={idx > 0}
                />
              ))}
            </div>
          </>
        )}
      </div>
      
      <BottomNav />
    </div>
  );
}
