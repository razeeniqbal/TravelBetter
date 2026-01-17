import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchBar } from '@/components/home/SearchBar';
import { BottomNav } from '@/components/navigation/BottomNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MapPin } from 'lucide-react';
import { sampleTrips } from '@/data/sampleTrips';

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Get places from sample trips for display
  const allPlaces = sampleTrips.flatMap(trip => 
    trip.itinerary.flatMap(day => 
      day.places.map(place => ({ ...place, tripTitle: trip.title, author: trip.author }))
    )
  );

  const featuredPlace = allPlaces[0];
  const nearbyPlaces = allPlaces.slice(1, 5);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Search Header */}
      <div className="pb-4 pt-6">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search places, cities, reviews..."
          showFilter={true}
        />
      </div>

      {/* Top Result */}
      {featuredPlace && (
        <div className="px-4 py-4">
          <h2 className="mb-3 font-semibold text-foreground">Top Result</h2>
          <Card 
            className="overflow-hidden cursor-pointer transition-all hover:shadow-travel"
            onClick={() => navigate(`/place/${featuredPlace.id}`)}
          >
            <div className="relative h-40">
              <img 
                src={featuredPlace.imageUrl || 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&h=400&fit=crop'} 
                alt={featuredPlace.name}
                className="h-full w-full object-cover"
              />
              {featuredPlace.rating && (
                <Badge className="absolute right-2 top-2 gap-1 bg-white/90 text-foreground">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {featuredPlace.rating}
                </Badge>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-foreground">{featuredPlace.name}</h3>
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {featuredPlace.tripTitle} • 0.3 km away
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={featuredPlace.author.avatar} />
                  <AvatarFallback>{featuredPlace.author.name[0]}</AvatarFallback>
                </Avatar>
                <p className="text-xs text-muted-foreground italic">
                  "{featuredPlace.description?.slice(0, 50)}..."
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Nearby Favorites */}
      <div className="px-4 py-4">
        <h2 className="mb-3 font-semibold text-foreground">Nearby Favorites</h2>
        <div className="no-scrollbar flex gap-3 overflow-x-auto">
          {nearbyPlaces.map((place) => (
            <Card 
              key={place.id}
              className="w-40 shrink-0 overflow-hidden cursor-pointer transition-all hover:shadow-travel"
              onClick={() => navigate(`/place/${place.id}`)}
            >
              <div className="relative h-24">
                <img 
                  src={place.imageUrl || 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=200&h=150&fit=crop'} 
                  alt={place.name}
                  className="h-full w-full object-cover"
                />
                {place.cost && (
                  <Badge className="absolute left-2 top-2 bg-black/70 text-white text-[10px]">
                    {place.cost}
                  </Badge>
                )}
              </div>
              <div className="p-2">
                <h4 className="text-sm font-medium text-foreground line-clamp-1">{place.name}</h4>
                <p className="text-xs text-muted-foreground capitalize">{place.category}</p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex -space-x-1">
                    <Avatar className="h-4 w-4 border border-background">
                      <AvatarImage src={place.author.avatar} />
                      <AvatarFallback className="text-[8px]">{place.author.name[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                  {place.rating && (
                    <div className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs">{place.rating}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
