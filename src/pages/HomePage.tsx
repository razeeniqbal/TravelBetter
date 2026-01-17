import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopHeader } from '@/components/navigation/TopHeader';
import { BottomNav } from '@/components/navigation/BottomNav';
import { TripCard } from '@/components/trip/TripCard';
import { sampleTrips } from '@/data/sampleTrips';
import { Badge } from '@/components/ui/badge';

const filters = ['All', 'Japan', 'Korea', 'Southeast Asia', 'Food', 'Culture', 'Nature'];

export default function HomePage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('All');

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopHeader />
      
      {/* Filter Pills */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
        {filters.map((filter) => (
          <Badge
            key={filter}
            variant={activeFilter === filter ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap px-4 py-1.5"
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </Badge>
        ))}
      </div>
      
      {/* Trip Grid */}
      <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-3">
        {sampleTrips.map((trip) => (
          <TripCard 
            key={trip.id} 
            trip={trip} 
            onClick={() => navigate(`/trip/${trip.id}`)}
          />
        ))}
      </div>
      
      <BottomNav />
    </div>
  );
}
