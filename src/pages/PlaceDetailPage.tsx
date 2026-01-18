import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShareModal } from '@/components/shared/ShareModal';
import { AddToItineraryDialog } from '@/components/trip/AddToItineraryDialog';
import { ArrowLeft, Heart, Share2, Star, Eye, MapPin, MessageCircle, Diamond } from 'lucide-react';
import { sampleTrips } from '@/data/sampleTrips';
import { useAuth } from '@/contexts/AuthContext';
import { useSavedPlaces, useToggleSavePlace } from '@/hooks/useSavedPlaces';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { usePlaceWithTripInfo, usePlaceReviews } from '@/hooks/usePlaces';
import { Place } from '@/types/trip';

export default function PlaceDetailPage() {
  const { placeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: savedPlaceIds = [] } = useSavedPlaces();
  const toggleSavePlace = useToggleSavePlace();
  const { toast } = useToast();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [addToItineraryOpen, setAddToItineraryOpen] = useState(false);

  // Try to fetch from database first
  const { data: dbData, isLoading } = usePlaceWithTripInfo(placeId);
  const { data: dbReviews = [] } = usePlaceReviews(placeId);

  // Fall back to sample data if not found in DB
  let samplePlace = null;
  let sampleTripInfo = null;
  
  for (const trip of sampleTrips) {
    for (const day of trip.itinerary) {
      const found = day.places.find(p => p.id === placeId);
      if (found) {
        samplePlace = found;
        sampleTripInfo = { title: trip.title, author: trip.author, id: trip.id };
        break;
      }
    }
    if (samplePlace) break;
  }

  const place = dbData?.place || samplePlace;
  const tripInfo = dbData?.tripInfo || sampleTripInfo;
  
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!place) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium">Place not found</p>
          <Button variant="link" onClick={() => navigate(-1)}>Go back</Button>
        </div>
      </div>
    );
  }

  const isSaved = savedPlaceIds.includes(placeId || '');

  const placeDataForSave = {
    name: place?.name || '',
    category: place?.category || 'attraction',
    description: place?.description,
    imageUrl: place?.imageUrl,
  };

  const handleHeartClick = () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to save places.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }
    toggleSavePlace.mutate({ placeId: placeId!, isSaved, placeData: placeDataForSave });
  };

  const handleSaveClick = () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to save places.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }
    if (!isSaved) {
      toggleSavePlace.mutate({ placeId: placeId!, isSaved: false, placeData: placeDataForSave });
    } else {
      toast({
        title: 'Already saved',
        description: 'This place is in your saved places.',
      });
    }
  };

  const handleAddToItinerary = () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to add places to your itinerary.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }
    setAddToItineraryOpen(true);
  };

  // Convert current place to Place type for the dialog
  const placeForDialog: Place = {
    id: placeId || '',
    name: place?.name || '',
    nameLocal: place?.nameLocal,
    category: place?.category || 'attraction',
    description: place?.description,
    imageUrl: place?.imageUrl,
    duration: place?.duration,
    tips: place?.tips,
    rating: place?.rating,
    source: 'user',
  };

  const handleAskQuestion = () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to ask questions.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }
    toast({
      title: 'Coming soon!',
      description: 'Q&A feature will be available soon.',
    });
  };

  const shareUrl = `${window.location.origin}/place/${placeId}`;

  // Use DB reviews if available, otherwise use sample reviews
  const reviews = dbReviews.length > 0 ? dbReviews : [
    { id: '1', name: 'Alex K.', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop', rating: 5, time: '2 days ago', text: 'Amazing atmosphere! The morning light was perfect.' },
    { id: '2', name: 'Sarah M.', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&h=50&fit=crop', rating: 4, time: '1 week ago', text: 'Beautiful but crowded. Go early!' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Image */}
      <div className="relative h-80">
        <img 
          src={place.imageUrl || 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&h=600&fit=crop'} 
          alt={place.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Top Actions */}
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between p-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full bg-black/30 text-white hover:bg-black/50"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full bg-black/30 text-white hover:bg-black/50"
              onClick={handleHeartClick}
            >
              <Heart className={cn(
                "h-5 w-5",
                isSaved && "fill-red-500 text-red-500"
              )} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full bg-black/30 text-white hover:bg-black/50"
              onClick={() => setShareModalOpen(true)}
            >
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Overlay Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            {tripInfo && (
              <Badge 
                className="bg-primary/90 text-primary-foreground cursor-pointer"
                onClick={() => navigate(`/trip/${tripInfo.id}`)}
              >
                {tripInfo.title}
              </Badge>
            )}
            {place.rating && (
              <Badge className="bg-white/90 text-foreground gap-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {place.rating}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold">{place.name}</h1>
          {place.nameLocal && <p className="text-white/80">{place.nameLocal}</p>}
          
          <div className="mt-3 flex items-center gap-4">
            {tripInfo && (
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => navigate(`/trip/${tripInfo.id}`)}
              >
                <Avatar className="h-6 w-6 border border-white/50">
                  <AvatarImage src={tripInfo.author.avatar} />
                  <AvatarFallback>{tripInfo.author.name[0]}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{tripInfo.author.name}</span>
                <span className="text-xs text-white/60">• 3 days ago</span>
              </div>
            )}
          </div>
          
          <div className="mt-2 flex items-center gap-4 text-sm text-white/80">
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              2.4k views
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 gap-1 text-white hover:bg-white/20"
              onClick={handleSaveClick}
            >
              {isSaved ? 'Saved ✓' : 'Save'}
            </Button>
          </div>
        </div>
      </div>

      {/* Content Sheet */}
      <div className="relative -mt-4 rounded-t-3xl bg-background pt-4">
        {/* Drag Handle */}
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-muted" />

        <div className="space-y-6 px-4 pb-24">
          {/* Traveler's Note */}
          <div>
            <h3 className="mb-2 font-semibold text-foreground">Traveler's Note</h3>
            <p className="text-sm text-muted-foreground">
              {place.description || 'No description available.'}
              {place.tips && place.tips.length > 0 && (
                <span className="block mt-2 text-foreground">{place.tips[0]}</span>
              )}
            </p>
          </div>

          {/* Hashtags */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">#Travel</Badge>
            <Badge variant="secondary">#{place.category}</Badge>
            {place.nameLocal && <Badge variant="secondary">#Japan</Badge>}
          </div>

          {/* Location */}
          <div>
            <h3 className="mb-2 font-semibold text-foreground">Location</h3>
            <div 
              className="flex items-center gap-2 rounded-xl bg-muted p-3 cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={() => navigate('/explore')}
            >
              <MapPin className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">
                {place.address || 'View on map'}
              </span>
            </div>
          </div>

          {/* Reviews */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Reviews ({reviews.length})</h3>
              <Button variant="link" size="sm" className="text-primary">See all</Button>
            </div>
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-xl border bg-card p-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={review.avatar} />
                      <AvatarFallback>{review.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{review.name}</span>
                        <div className="flex">
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">{review.time}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{review.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg gap-3">
          <Button 
            variant="outline" 
            className="flex-1 gap-2 rounded-xl"
            onClick={handleAskQuestion}
          >
            <MessageCircle className="h-4 w-4" />
            Ask Question
          </Button>
          <Button 
            className="flex-1 gap-2 rounded-xl"
            onClick={handleAddToItinerary}
          >
            <Diamond className="h-4 w-4" />
            Add to Itinerary
          </Button>
        </div>
      </div>

      <ShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        title={place.name}
        url={shareUrl}
      />

      <AddToItineraryDialog
        open={addToItineraryOpen}
        onOpenChange={setAddToItineraryOpen}
        places={[placeForDialog]}
        destination={tripInfo?.title?.split(',')[0] || 'Unknown'}
      />
    </div>
  );
}
