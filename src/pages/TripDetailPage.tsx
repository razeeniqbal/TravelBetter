import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sampleTrips } from '@/data/sampleTrips';
import { DraggableTimeline } from '@/components/trip/DraggableTimeline';
import { MapPlaceholder } from '@/components/trip/MapPlaceholder';
import { BottomNav } from '@/components/navigation/BottomNav';
import { ShareModal } from '@/components/shared/ShareModal';
import { AddToItineraryDialog } from '@/components/trip/AddToItineraryDialog';
import { AnchorSelector } from '@/components/trip/AnchorSelector';
import { EditModeBar } from '@/components/trip/EditModeBar';
import { AttributionBadge } from '@/components/trip/AttributionBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MoreHorizontal, Plus, Share2, ListPlus, GitFork, Home, User, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useTripDetail } from '@/hooks/useTripDetail';
import { useTripEdit } from '@/hooks/useTripEdit';
import { useRemixTrip } from '@/hooks/useRemixTrip';

export default function TripDetailPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeDay, setActiveDay] = useState(1);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [addToItineraryOpen, setAddToItineraryOpen] = useState(false);
  const [anchorSelectorOpen, setAnchorSelectorOpen] = useState(false);
  
  // Try to fetch from database first
  const { data: dbTrip, isLoading } = useTripDetail(tripId);
  
  // Must call all hooks before any early returns
  const remixMutation = useRemixTrip();
  
  // Fall back to sample data if not found in DB
  const sampleTrip = sampleTrips.find(t => t.id === tripId);
  const trip = dbTrip || sampleTrip;

  const isOwner = user?.id === trip?.author.id;

  const {
    isEditMode,
    toggleEditMode,
    itinerary,
    reorderPlaces,
    removePlace,
    anchorPlaceId,
    setAsAnchor,
    saveChanges,
    discardChanges,
    isSaving,
  } = useTripEdit({
    tripId: tripId || '',
    initialItinerary: trip?.itinerary || [],
    isOwner,
  });

  // Reset itinerary when trip changes
  useEffect(() => {
    if (trip) {
      discardChanges();
    }
  }, [trip?.id]);
  
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  
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

  const currentDayItinerary = itinerary.find(d => d.day === activeDay);
  const totalPlaces = itinerary.reduce((acc, day) => acc + day.places.length, 0);
  const totalWalking = currentDayItinerary?.places.reduce((acc, p) => acc + (p.walkingTimeFromPrevious || 0), 0) || 0;
  
  // Get all places for anchor selection
  const allPlaces = itinerary.flatMap(day => day.places);

  // Count sources for legend
  const userPlacesCount = allPlaces.filter(p => p.source === 'user').length;
  const aiPlacesCount = allPlaces.filter(p => p.source === 'ai').length;

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


  const handleCopyTrip = async () => {
    if (!user) {
      toast.info('Please sign in to remix trips');
      navigate('/auth');
      return;
    }
    if (trip) {
      const newTripId = await remixMutation.mutateAsync(trip);
      navigate(`/trip/${newTripId}`);
    }
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
        <div className="flex items-center gap-2">
          {isOwner && (
            <EditModeBar
              isEditMode={isEditMode}
              isSaving={isSaving}
              hasAnchor={!!anchorPlaceId}
              onToggleEdit={toggleEditMode}
              onSave={saveChanges}
              onDiscard={discardChanges}
              onSelectAnchor={() => setAnchorSelectorOpen(true)}
            />
          )}
          {!isEditMode && (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full"
                onClick={handleCopyTrip}
                disabled={remixMutation.isPending}
              >
                <GitFork className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full"
                onClick={handleReview}
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Edit Mode Banner */}
      {isEditMode && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2">
          <p className="text-sm text-center text-primary font-medium">
            ✏️ Edit Mode — Drag to reorder, set anchor point, or remove places
          </p>
        </div>
      )}

      {/* Day Selector Tabs */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto border-b px-4 py-3">
        {itinerary.map((day) => (
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

      {/* Source Legend */}
      {(userPlacesCount > 0 || aiPlacesCount > 0) && (
        <div className="flex items-center gap-4 px-4 pt-4">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {userPlacesCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  <User className="h-3 w-3" />
                </span>
                {userPlacesCount} imported
              </span>
            )}
            {aiPlacesCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                  <Sparkles className="h-3 w-3" />
                </span>
                {aiPlacesCount} AI suggested
              </span>
            )}
            {anchorPlaceId && (
              <span className="flex items-center gap-1">
                <span className="flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  <Home className="h-3 w-3" />
                </span>
                Anchor set
              </span>
            )}
          </div>
        </div>
      )}

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

        {/* Draggable Timeline */}
        {currentDayItinerary && (
          <DraggableTimeline
            places={currentDayItinerary.places}
            dayIndex={itinerary.findIndex(d => d.day === activeDay)}
            isEditMode={isEditMode}
            anchorPlaceId={anchorPlaceId}
            onReorder={reorderPlaces}
            onRemove={removePlace}
            onSetAnchor={setAsAnchor}
          />
        )}

        {/* Empty state */}
        {currentDayItinerary && currentDayItinerary.places.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No places for this day</p>
            <Button variant="link" className="mt-2">Add places</Button>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      {!isEditMode && (
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
      )}

      <ShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        title={trip.title}
        url={shareUrl}
      />
      
      <AddToItineraryDialog
        open={addToItineraryOpen}
        onOpenChange={setAddToItineraryOpen}
        places={allPlaces}
        destination={trip.destination}
      />

      <AnchorSelector
        open={anchorSelectorOpen}
        onOpenChange={setAnchorSelectorOpen}
        places={allPlaces}
        currentAnchorId={anchorPlaceId}
        onSelectAnchor={setAsAnchor}
      />
      
      <BottomNav />
    </div>
  );
}
