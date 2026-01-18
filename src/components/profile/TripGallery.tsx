import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TripCard } from '@/components/trip/TripCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plane, Plus } from 'lucide-react';
import { Trip } from '@/types/trip';

interface TripGalleryProps {
  createdTrips: Trip[];
  remixedTrips: Trip[];
  savedTrips: Trip[];
  isLoading?: boolean;
}

export function TripGallery({
  createdTrips,
  remixedTrips,
  savedTrips,
  isLoading,
}: TripGalleryProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('created');

  const EmptyState = ({ message, cta }: { message: string; cta?: string }) => (
    <Card className="flex flex-col items-center justify-center p-8 text-center">
      <Plane className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <p className="text-muted-foreground">{message}</p>
      {cta && (
        <Button
          variant="link"
          className="mt-2 gap-1 text-primary"
          onClick={() => navigate('/create')}
        >
          <Plus className="h-4 w-4" />
          {cta}
        </Button>
      )}
    </Card>
  );

  const TripGrid = ({ trips, emptyMessage, emptyCta }: { 
    trips: Trip[]; 
    emptyMessage: string; 
    emptyCta?: string;
  }) => (
    trips.length > 0 ? (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {trips.map((trip) => (
          <TripCard
            key={trip.id}
            trip={trip}
            onClick={() => navigate(`/trip/${trip.id}`)}
          />
        ))}
      </div>
    ) : (
      <EmptyState message={emptyMessage} cta={emptyCta} />
    )
  );

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="w-full justify-start gap-4 bg-transparent h-12 border-b rounded-none px-0">
        <TabsTrigger
          value="created"
          className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-0 pb-3"
        >
          Created ({createdTrips.length})
        </TabsTrigger>
        <TabsTrigger
          value="remixed"
          className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-0 pb-3"
        >
          Remixed ({remixedTrips.length})
        </TabsTrigger>
        <TabsTrigger
          value="saved"
          className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-0 pb-3"
        >
          Saved ({savedTrips.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="created" className="pt-4">
        <TripGrid
          trips={createdTrips}
          emptyMessage="You haven't created any trips yet"
          emptyCta="Create your first trip"
        />
      </TabsContent>

      <TabsContent value="remixed" className="pt-4">
        <TripGrid
          trips={remixedTrips}
          emptyMessage="You haven't remixed any trips yet"
          emptyCta="Explore trips to remix"
        />
      </TabsContent>

      <TabsContent value="saved" className="pt-4">
        <TripGrid
          trips={savedTrips}
          emptyMessage="No saved trips yet"
          emptyCta="Explore trips to save"
        />
      </TabsContent>
    </Tabs>
  );
}
