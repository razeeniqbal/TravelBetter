import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/navigation/BottomNav';
import { AddToItineraryDialog } from '@/components/trip/AddToItineraryDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Mic, Star, Clock, Plus } from 'lucide-react';
import { sampleTrips } from '@/data/sampleTrips';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { usePlaces } from '@/hooks/usePlaces';
import { Place } from '@/types/trip';
import { Map, MapControls, MapMarker, MarkerContent, MarkerTooltip, MapPopup } from '@/components/ui/map';

const categories = [
  { id: 'all', label: 'All', icon: '📍' },
  { id: 'food', label: 'Restaurants', icon: '🍜' },
  { id: 'nature', label: 'Parks', icon: '🌳' },
  { id: 'shop', label: 'Shopping', icon: '🛍️' },
  { id: 'culture', label: 'Culture', icon: '🏛️' },
];

export default function ExplorePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch places from database
  const { data: dbPlaces = [], isLoading } = usePlaces(activeCategory === 'all' ? undefined : activeCategory);

  // Get sample places as fallback
  const samplePlaces = useMemo(() => 
    sampleTrips.flatMap(trip => trip.itinerary.flatMap(day => day.places)),
    []
  );

  // Combine DB places with sample places, prioritizing DB
  const allPlaces: Place[] = useMemo(() => {
    if (dbPlaces.length > 0) return dbPlaces;
    if (activeCategory === 'all') return samplePlaces;
    return samplePlaces.filter(p => p.category === activeCategory);
  }, [dbPlaces, samplePlaces, activeCategory]);
  
  const selectedMapPlace = selectedPlace
    ? allPlaces.find(p => p.id === selectedPlace)
    : null;

  const displayPlace = selectedMapPlace || allPlaces[0];
  const selectedMapCoords = useMemo(
    () => (selectedMapPlace?.coordinates ? selectedMapPlace.coordinates : null),
    [selectedMapPlace]
  );

  const placesWithCoords = useMemo(
    () =>
      allPlaces
        .map((place, index) => {
          const coords = place.coordinates;
          if (!coords) return null;
          return { place, coords, index };
        })
        .filter((place): place is { place: Place; coords: { lat: number; lng: number }; index: number } => Boolean(place)),
    [allPlaces]
  );

  const mapCenter = useMemo(() => {
    if (placesWithCoords.length === 0) return [0, 0] as [number, number];
    const totals = placesWithCoords.reduce(
      (acc, place) => {
        return {
          lat: acc.lat + place.coords.lat,
          lng: acc.lng + place.coords.lng,
        };
      },
      { lat: 0, lng: 0 }
    );
    return [
      totals.lng / placesWithCoords.length,
      totals.lat / placesWithCoords.length,
    ] as [number, number];
  }, [placesWithCoords]);

  const mapZoom = placesWithCoords.length > 0 ? 12 : 1;

  const getMarkerClass = (category?: string) => {
    switch (category) {
      case 'food':
        return 'bg-travel-food';
      case 'culture':
        return 'bg-travel-culture';
      case 'nature':
        return 'bg-travel-nature';
      case 'shop':
        return 'bg-travel-shop';
      case 'night':
        return 'bg-travel-night';
      case 'photo':
        return 'bg-travel-photo';
      default:
        return 'bg-primary';
    }
  };

  const [addToItineraryOpen, setAddToItineraryOpen] = useState(false);

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
    if (displayPlace) {
      setAddToItineraryOpen(true);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Search Bar */}
      <div className="absolute left-0 right-0 top-0 z-20 p-4">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Search places..."
              className="h-12 rounded-xl bg-card pl-4 pr-12 shadow-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button 
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-muted p-1.5"
              onClick={handleSearch}
            >
              <Mic className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="absolute left-0 right-0 top-20 z-20 px-4">
        <div className="no-scrollbar flex gap-2 overflow-x-auto py-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-sm transition-all',
                activeCategory === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-foreground hover:bg-muted'
              )}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="h-[60vh] w-full">
        <Map center={mapCenter} zoom={mapZoom} minZoom={1} maxZoom={16}>
          {placesWithCoords.map(({ place, coords, index }) => (
            <MapMarker
              key={place.id}
              longitude={coords.lng}
              latitude={coords.lat}
              onClick={() => setSelectedPlace(place.id)}
            >
              <MarkerContent
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold text-white shadow-lg transition-transform",
                  getMarkerClass(place.category),
                  selectedPlace === place.id && "ring-2 ring-white/80"
                )}
              >
                {index + 1}
              </MarkerContent>
              <MarkerTooltip>{place.name}</MarkerTooltip>
            </MapMarker>
          ))}

          {selectedMapPlace && selectedMapCoords && (
            <MapPopup
              longitude={selectedMapCoords.lng}
              latitude={selectedMapCoords.lat}
              closeButton
              onClose={() => setSelectedPlace(null)}
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold">{selectedMapPlace.name}</p>
                <p className="text-xs text-muted-foreground">{selectedMapPlace.category}</p>
              </div>
            </MapPopup>
          )}

          <MapControls showZoom position="bottom-right" />
        </Map>
      </div>

      {/* Bottom Sheet */}
      <div className="relative -mt-8 rounded-t-3xl bg-background pt-3 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)]">
        {/* Drag Handle */}
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-muted" />

        {displayPlace && (
          <div className="px-4 pb-4">
            <div 
              className="flex items-start justify-between gap-4 cursor-pointer"
              onClick={() => navigate(`/place/${displayPlace.id}`)}
            >
              <div>
                <h3 className="font-semibold text-foreground">{displayPlace.name}</h3>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  {displayPlace.rating && (
                    <>
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span>{displayPlace.rating}</span>
                      <span>• 128 reviews</span>
                    </>
                  )}
                  <span>• {displayPlace.category}</span>
                </div>
              </div>
            </div>

            {/* Photos Carousel */}
            <div 
              className="no-scrollbar mt-4 flex gap-2 overflow-x-auto cursor-pointer"
              onClick={() => navigate(`/place/${displayPlace.id}`)}
            >
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 w-24 shrink-0 overflow-hidden rounded-lg">
                  <img 
                    src={displayPlace.imageUrl || 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=200&h=150&fit=crop'} 
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>

            {/* Status */}
            <div className="mt-4 flex items-center gap-4 text-sm">
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                Open now
              </Badge>
              <span className="text-muted-foreground">
                {displayPlace.duration ? `${displayPlace.duration} min` : '~30 min'} visit
              </span>
            </div>

            {/* Add Button */}
            <Button 
              className="mt-4 w-full gap-2 rounded-xl"
              onClick={handleAddToItinerary}
            >
              <Plus className="h-4 w-4" />
              Add to Itinerary Plan
            </Button>
          </div>
        )}
      </div>

      {displayPlace && (
        <AddToItineraryDialog
          open={addToItineraryOpen}
          onOpenChange={setAddToItineraryOpen}
          places={[displayPlace]}
          destination={displayPlace.name}
        />
      )}

      <BottomNav />
    </div>
  );
}
