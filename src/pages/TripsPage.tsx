import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/navigation/BottomNav';
import { TripCard } from '@/components/trip/TripCard';
import { sampleTrips } from '@/data/sampleTrips';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Plus, Plane } from 'lucide-react';
import { useSavedTrips } from '@/hooks/useSavedTrips';

export default function TripsPage() {
  const navigate = useNavigate();
  const { data: savedTripIds = [], isLoading } = useSavedTrips();
  const [activeTab, setActiveTab] = useState('created');

  // For demo, we'll show sample trips as "created" by user
  const createdTrips = sampleTrips.slice(0, 2);
  const remixedTrips = sampleTrips.filter(t => t.remixedFrom);
  const savedTrips = sampleTrips.filter(t => savedTripIds.includes(t.id));

  const EmptyState = ({ message, cta }: { message: string; cta?: string }) => (
    <Card className="flex flex-col items-center justify-center p-8 text-center">
      <Plane className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <p className="text-muted-foreground">{message}</p>
      {cta && (
        <Button 
          variant="link" 
          className="mt-2 text-primary"
          onClick={() => navigate('/create')}
        >
          {cta}
        </Button>
      )}
    </Card>
  );

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
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full" 
          onClick={() => navigate('/create')}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </header>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b px-4">
          <TabsList className="w-full justify-start gap-4 bg-transparent h-12">
            <TabsTrigger 
              value="created" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-0"
            >
              Created
            </TabsTrigger>
            <TabsTrigger 
              value="remixed"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-0"
            >
              Remixed
            </TabsTrigger>
            <TabsTrigger 
              value="saved"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-0"
            >
              Saved
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="created" className="p-4">
          {createdTrips.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {createdTrips.map((trip) => (
                <TripCard 
                  key={trip.id} 
                  trip={trip} 
                  onClick={() => navigate(`/trip/${trip.id}`)}
                />
              ))}
            </div>
          ) : (
            <EmptyState 
              message="You haven't created any trips yet" 
              cta="Create your first trip"
            />
          )}
        </TabsContent>

        <TabsContent value="remixed" className="p-4">
          {remixedTrips.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {remixedTrips.map((trip) => (
                <TripCard 
                  key={trip.id} 
                  trip={trip} 
                  onClick={() => navigate(`/trip/${trip.id}`)}
                />
              ))}
            </div>
          ) : (
            <EmptyState 
              message="You haven't remixed any trips yet" 
              cta="Explore trips to remix"
            />
          )}
        </TabsContent>

        <TabsContent value="saved" className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : savedTrips.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {savedTrips.map((trip) => (
                <TripCard 
                  key={trip.id} 
                  trip={trip} 
                  onClick={() => navigate(`/trip/${trip.id}`)}
                />
              ))}
            </div>
          ) : (
            <EmptyState 
              message="No saved trips yet" 
              cta="Explore trips to save"
            />
          )}
        </TabsContent>
      </Tabs>
      
      <BottomNav />
    </div>
  );
}
