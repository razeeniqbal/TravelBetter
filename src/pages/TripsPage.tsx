import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/navigation/BottomNav';
import { TripCard } from '@/components/trip/TripCard';
import { sampleTrips } from '@/data/sampleTrips';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';

export default function TripsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">My Trips</h1>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate('/create')}>
          <Plus className="h-5 w-5" />
        </Button>
      </header>

      {/* Trips Grid */}
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
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
