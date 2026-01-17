import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sampleTrips } from '@/data/sampleTrips';
import { TimelinePlace } from '@/components/trip/TimelinePlace';
import { MapPlaceholder } from '@/components/trip/MapPlaceholder';
import { BottomNav } from '@/components/navigation/BottomNav';
import { ShareModal } from '@/components/shared/ShareModal';
import { AddToItineraryDialog } from '@/components/trip/AddToItineraryDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MoreHorizontal, Plus, Share2, ListPlus, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function TripDetailPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeDay, setActiveDay] = useState(1);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [addToItineraryOpen, setAddToItineraryOpen] = useState(false);
  
  const trip = sampleTrips.find(t => t.id === tripId);
  
  if (!trip) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium">Trip not found</p>
          <Button variant="link" onClick={() => navigate('/')}>Go back home</Button>
        </div>
      </div>
    );
  }

  const currentDayItinerary = trip.itinerary.find(d => d.day === activeDay);
  const totalPlaces = trip.itinerary.reduce((acc, day) => acc + day.places.length, 0);
  const totalWalking = currentDayItinerary?.places.reduce((acc, p) => acc + (p.walkingTimeFromPrevious || 0), 0) || 0;

  const handleShare = () => {
    setShareModalOpen(true);
  };

  const handleAddToItinerary = () => {
    if (!user) {
      toast.info('Please sign in to add to your itinerary');
      navigate('/auth');
      return;
    }
    setAddToItineraryOpen(true);
  };

  // Get all places from current day for the dialog
  const allPlacesFromTrip = trip.itinerary.flatMap(day => day.places);

  const handleCopyTrip = () => {
    if (!user) {
      toast.info('Please sign in to copy trips');
      navigate('/auth');
      return;
    }
    toast.success('Trip copied! You can now edit it.');
    navigate('/create');
  };

  const handleReview = () => {
    if (!user) {
      toast.info('Please sign in to review trips');
      navigate('/auth');
      return;
    }
    navigate(`/trip/${tripId}/review`);
  };

  const shareUrl = `${window.location.origin}/trip/${tripId}`;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold">Trip to {trip.destination}</h1>
            <p className="text-xs text-muted-foreground">{trip.duration} days • {totalPlaces} stops</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full"
            onClick={handleCopyTrip}
          >
            <Copy className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full"
            onClick={handleReview}
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Day Selector Tabs */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto border-b px-4 py-3">
        {trip.itinerary.map((day) => (
          <button
            key={day.day}
            onClick={() => setActiveDay(day.day)}
            className={cn(
              'flex-shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-all',
              activeDay === day.day
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'border border-border bg-card text-muted-foreground hover:bg-muted'
            )}
          >
            Day {day.day}
          </button>
        ))}
        <button 
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground hover:text-foreground"
          onClick={() => {
            if (!user) {
              toast.info('Please sign in to add days');
              navigate('/auth');
              return;
            }
            toast.info('Add day feature coming soon!');
          }}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Map Section */}
      <div className="px-4 pt-4">
        <MapPlaceholder 
          destination={trip.destination} 
          placesCount={currentDayItinerary?.places.length || 0} 
        />
      </div>

      {/* Itinerary Section */}
      <div className="px-4 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-foreground">Itinerary</h2>
            <p className="text-xs text-muted-foreground">
              {currentDayItinerary?.places.length || 0} stops • {(totalWalking * 0.08).toFixed(1)} km total walking
            </p>
          </div>
          {currentDayItinerary?.title && (
            <Badge variant="secondary" className="text-xs">
              {currentDayItinerary.title}
            </Badge>
          )}
        </div>

        {/* Timeline */}
        {currentDayItinerary && (
          <div className="relative">
            {currentDayItinerary.places.map((place, idx) => {
              const startHour = 9 + Math.floor(idx * 1.5);
              const time = `${startHour}:00 ${startHour < 12 ? 'AM' : 'PM'}`;
              
              return (
                <TimelinePlace
                  key={place.id}
                  place={place}
                  index={idx + 1}
                  time={time}
                  isLast={idx === currentDayItinerary.places.length - 1}
                  onClick={() => navigate(`/place/${place.id}`)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-20 left-0 right-0 z-40 border-t bg-background/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg gap-3">
          <Button 
            variant="outline" 
            className="flex-1 gap-2 rounded-xl bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button 
            className="flex-1 gap-2 rounded-xl bg-violet-600 hover:bg-violet-700"
            onClick={handleAddToItinerary}
          >
            <ListPlus className="h-4 w-4" />
            Add to Itinerary
          </Button>
        </div>
      </div>

      <ShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        title={trip.title}
        url={shareUrl}
      />
      
      <AddToItineraryDialog
        open={addToItineraryOpen}
        onOpenChange={setAddToItineraryOpen}
        places={allPlacesFromTrip}
        destination={trip.destination}
      />
      
      <BottomNav />
    </div>
  );
}
