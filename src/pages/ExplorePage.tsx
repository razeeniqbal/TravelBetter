import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/navigation/BottomNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Mic, Layers, Navigation, Star, Clock, Plus } from 'lucide-react';
import { sampleTrips } from '@/data/sampleTrips';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const categories = [
  { id: 'restaurants', label: 'Restaurants', icon: '🍜' },
  { id: 'parks', label: 'Parks', icon: '🌳' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️' },
  { id: 'culture', label: 'Culture', icon: '🏛️' },
];

export default function ExplorePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState('restaurants');
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Get places for display
  const allPlaces = sampleTrips.flatMap(trip => 
    trip.itinerary.flatMap(day => day.places)
  );
  
  const displayPlace = selectedPlace 
    ? allPlaces.find(p => p.id === selectedPlace) 
    : allPlaces[0];

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
    toast({
      title: 'Coming soon!',
      description: 'Add to itinerary feature will be available soon.',
    });
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

      {/* Map Placeholder */}
      <div 
        className="h-[60vh] w-full"
        style={{
          background: `
            linear-gradient(90deg, hsl(var(--muted)) 1px, transparent 1px),
            linear-gradient(hsl(var(--muted)) 1px, transparent 1px),
            hsl(var(--muted-foreground) / 0.03)
          `,
          backgroundSize: '30px 30px',
        }}
      >
        {/* Floating Map Controls */}
        <div className="absolute right-4 top-40 flex flex-col gap-2">
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-card shadow-lg">
            <Layers className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-card shadow-lg">
            <Navigation className="h-4 w-4" />
          </Button>
        </div>

        {/* Map Markers Placeholder */}
        <div className="absolute inset-0 flex items-center justify-center pt-20">
          <div className="relative">
            {/* Category Markers */}
            <div className="flex gap-12">
              {allPlaces.slice(0, 3).map((place, idx) => (
                <div 
                  key={place.id} 
                  className="flex flex-col items-center cursor-pointer"
                  onClick={() => {
                    setSelectedPlace(place.id);
                    navigate(`/place/${place.id}`);
                  }}
                >
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-110",
                    idx === 0 ? "bg-travel-food" : idx === 1 ? "bg-travel-culture" : "bg-travel-nature"
                  )}>
                    {idx === 0 ? '🍜' : idx === 1 ? '🏛️' : '🌳'}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Selected Place Marker */}
            {displayPlace && (
              <div 
                className="absolute left-1/2 top-16 -translate-x-1/2 cursor-pointer"
                onClick={() => navigate(`/place/${displayPlace.id}`)}
              >
                <div className="rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-lg">
                  {displayPlace.name}
                </div>
                <div className="mx-auto h-4 w-0.5 bg-primary" />
              </div>
            )}
          </div>
        </div>
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

      <BottomNav />
    </div>
  );
}
