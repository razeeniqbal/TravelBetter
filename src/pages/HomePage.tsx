import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/navigation/BottomNav';
import { TripCard } from '@/components/trip/TripCard';
import { TrendingDestinations } from '@/components/home/TrendingDestinations';
import { SearchBar } from '@/components/home/SearchBar';
import { DestinationCard } from '@/components/home/DestinationCard';
import { sampleTrips } from '@/data/sampleTrips';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Heart } from 'lucide-react';

const filters = ['All', 'Europe', 'Asia', 'Roadtrips', 'Beach', 'Culture'];

const destinations = [
  { id: 'jp', country: 'Japan', city: 'Tokyo', image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=500&fit=crop' },
  { id: 'it', country: 'Italy', city: 'Venice', image: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=400&h=500&fit=crop' },
  { id: 'kr', country: 'South Korea', city: 'Seoul', image: 'https://images.unsplash.com/photo-1534274867514-d5b47ef89ed7?w=400&h=500&fit=crop' },
  { id: 'id', country: 'Indonesia', city: 'Bali', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&h=500&fit=crop' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [selectedTrending, setSelectedTrending] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleDestination = (id: string) => {
    setSelectedDestination(prev => prev === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Section */}
      <div className="px-4 pb-2 pt-6">
        <h1 className="text-2xl font-bold text-foreground">Where to next?</h1>
        <p className="text-muted-foreground">Plan your perfect trip</p>
      </div>

      {/* Search Bar */}
      <div className="py-3">
        <SearchBar 
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search places, cities, reviews..."
        />
      </div>

      {/* Trending Destinations */}
      <TrendingDestinations 
        selected={selectedTrending} 
        onSelect={setSelectedTrending} 
      />

      {/* Countries & City Section */}
      <div className="px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-foreground">Countries & City</h2>
            <p className="text-xs text-muted-foreground">Select multiple destinations for your route</p>
          </div>
          <Button variant="ghost" size="sm" className="gap-1 text-primary">
            See all <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {destinations.map((dest) => (
            <DestinationCard
              key={dest.id}
              {...dest}
              selected={selectedDestination === dest.id}
              onSelect={toggleDestination}
            />
          ))}
        </div>
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
          <Button variant="ghost" size="sm" className="gap-1 text-primary">
            See all <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
        
        {/* Masonry-style Grid */}
        <div className="columns-2 gap-3 space-y-3">
          {sampleTrips.map((trip, index) => (
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
                
                {/* Heart Icon */}
                <button 
                  className="absolute right-2 top-2 rounded-full bg-white/80 p-1.5 backdrop-blur-sm transition-colors hover:bg-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Heart className="h-4 w-4 text-foreground" />
                </button>

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
          ))}
        </div>
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
