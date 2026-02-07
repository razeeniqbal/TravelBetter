import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/navigation/BottomNav';
import { SearchBar } from '@/components/home/SearchBar';
import { sampleTrips } from '@/data/sampleTrips';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Heart, GitFork, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSavedTrips, useToggleSaveTrip } from '@/hooks/useSavedTrips';
import { useRemixTrip } from '@/hooks/useRemixTrip';
import { useFeaturedTrips } from '@/hooks/usePublicTrips';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Trip } from '@/types/trip';

const filters = ['All', 'Europe', 'Asia', 'Roadtrips', 'Beach', 'Culture'];

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: savedTripIds = [] } = useSavedTrips();
  const toggleSaveTrip = useToggleSaveTrip();
  const remixMutation = useRemixTrip();
  const { toast } = useToast();

  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate('/search');
    }
  };

  const handleHeartClick = (e: React.MouseEvent, tripId: string) => {
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to save trips.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    const isSaved = savedTripIds.includes(tripId);
    toggleSaveTrip.mutate({ tripId, isSaved });
  };

  // Fetch real public trips, fall back to sample data if none exist
  const { data: publicTrips, isLoading: isLoadingTrips } = useFeaturedTrips();
  const displayTrips: Trip[] = publicTrips && publicTrips.length > 0 ? publicTrips : sampleTrips;
  const filteredTrips = useMemo(() => {
    if (activeFilter === 'All') return displayTrips;

    const normalizedFilter = activeFilter.toLowerCase();
    return displayTrips.filter((trip) => {
      const searchable = [
        trip.destination,
        trip.country,
        ...(trip.tags || []),
        ...(trip.travelStyle || []),
      ]
        .join(' ')
        .toLowerCase();

      if (activeFilter === 'Roadtrips') {
        return /road|drive|route/.test(searchable);
      }
      if (activeFilter === 'Beach') {
        return /beach|coast|island|sea/.test(searchable);
      }
      if (activeFilter === 'Culture') {
        return /culture|temple|museum|heritage|history/.test(searchable);
      }

      return searchable.includes(normalizedFilter);
    });
  }, [activeFilter, displayTrips]);

  const handleRemixClick = async (e: React.MouseEvent, trip: Trip) => {
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to remix trips.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    try {
      const newTripId = await remixMutation.mutateAsync(trip);
      navigate(`/trip/${newTripId}`);
    } catch (error) {
      console.error('Error remixing trip:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Section */}
      <div className="px-4 pb-2 pt-6">
        <h1 className="text-2xl font-bold text-foreground">Where to next?</h1>
        <p className="text-muted-foreground">Plan your perfect trip</p>
      </div>

      {/* Search Bar */}
      <div className="py-3" onClick={handleSearch}>
        <SearchBar 
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search places, cities, reviews..."
        />
      </div>

      {/* Filter Pills */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
        {filters.map((filter) => (
          <Badge
            key={filter}
            variant={activeFilter === filter ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap px-4 py-1.5 text-sm"
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </Badge>
        ))}
      </div>

      {/* Visualize Influencer Routes Section */}
      <div className="px-4 py-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Visualize Influencer Routes</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1 text-primary"
            onClick={() => navigate('/trips')}
          >
            See all <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
        
        {/* Masonry-style Grid */}
        {isLoadingTrips ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
        <div className="columns-2 gap-3 space-y-3">
          {filteredTrips.map((trip, index) => {
            const isSaved = savedTripIds.includes(trip.id);
            
            return (
              <div 
                key={trip.id} 
                className="break-inside-avoid"
              >
                <div 
                  className="group relative cursor-pointer overflow-hidden rounded-xl bg-card shadow-travel transition-all hover:shadow-travel-hover"
                  onClick={() => navigate(`/trip/${trip.id}`)}
                >
                  {/* Image with variable height */}
                  <div className={`overflow-hidden ${index % 3 === 0 ? 'aspect-[3/4]' : 'aspect-square'}`}>
                    <img 
                      src={trip.coverImage} 
                      alt={trip.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  
                  {/* Location Badge */}
                  <div className="absolute left-2 top-2">
                    <Badge className="bg-white/90 text-foreground backdrop-blur-sm">
                      {trip.destination}
                    </Badge>
                  </div>
                  
                  {/* Action Icons */}
                  <div className="absolute right-2 top-2 flex flex-col gap-2">
                    {/* Heart Icon */}
                    <button 
                      className="rounded-full bg-white/80 p-1.5 backdrop-blur-sm transition-colors hover:bg-white"
                      onClick={(e) => handleHeartClick(e, trip.id)}
                    >
                      <Heart className={cn(
                        "h-4 w-4 transition-colors",
                        isSaved ? "fill-red-500 text-red-500" : "text-foreground"
                      )} />
                    </button>
                    
                    {/* Remix Icon */}
                    <button 
                      className={cn(
                        "rounded-full bg-white/80 p-1.5 backdrop-blur-sm transition-colors hover:bg-white",
                        remixMutation.isPending && "opacity-50 pointer-events-none"
                      )}
                      onClick={(e) => handleRemixClick(e, trip)}
                    >
                      <GitFork className="h-4 w-4 text-foreground" />
                    </button>
                  </div>

                  {/* Bottom Content */}
                  <div className="p-3">
                    <h3 className="font-medium text-foreground line-clamp-1">{trip.title}</h3>
                    <div className="mt-2 flex items-center gap-2">
                      <img 
                        src={trip.author.avatar} 
                        alt={trip.author.name}
                        className="h-5 w-5 rounded-full object-cover"
                      />
                      <span className="text-xs text-muted-foreground">@{trip.author.username}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Floating Start Planning Button */}
      <div className="fixed bottom-24 right-4 z-40">
        <Button 
          onClick={() => navigate('/create')}
          className="gap-2 rounded-full px-6 py-6 shadow-lg"
        >
          Start Planning!
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      
      <BottomNav />
    </div>
  );
}
