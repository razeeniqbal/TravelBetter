import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  useUserTrips, 
  useTripDays, 
  useAddPlaceToItinerary,
  useCreateDayItinerary 
} from '@/hooks/useUserTrips';
import { useAuth } from '@/contexts/AuthContext';
import { Place } from '@/types/trip';
import { MapPin, Calendar, Plus, ChevronRight, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddToItineraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  places: Place[];
  destination: string;
}

type Step = 'select-places' | 'select-trip' | 'select-day' | 'success';

export function AddToItineraryDialog({ 
  open, 
  onOpenChange, 
  places,
  destination 
}: AddToItineraryDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('select-places');
  const [selectedPlaces, setSelectedPlaces] = useState<Place[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  
  const { data: userTrips, isLoading: tripsLoading } = useUserTrips();
  const { data: tripDays, isLoading: daysLoading } = useTripDays(selectedTripId);
  const addPlaceMutation = useAddPlaceToItinerary();
  const createDayMutation = useCreateDayItinerary();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep('select-places');
      setSelectedPlaces([]);
      setSelectedTripId(null);
      setSelectedDayId(null);
    }
  }, [open]);

  const selectedTrip = userTrips?.find(t => t.id === selectedTripId);

  const handlePlaceToggle = (place: Place) => {
    setSelectedPlaces(prev => {
      const exists = prev.find(p => p.id === place.id);
      if (exists) {
        return prev.filter(p => p.id !== place.id);
      }
      return [...prev, place];
    });
  };

  const handleSelectAllPlaces = () => {
    if (selectedPlaces.length === places.length) {
      setSelectedPlaces([]);
    } else {
      setSelectedPlaces([...places]);
    }
  };

  const handleTripSelect = (tripId: string) => {
    setSelectedTripId(tripId);
    setStep('select-day');
  };

  const handleCreateNewDay = async () => {
    if (!selectedTripId) return;
    
    const nextDayNumber = tripDays ? tripDays.length + 1 : 1;
    const newDay = await createDayMutation.mutateAsync({ 
      tripId: selectedTripId, 
      dayNumber: nextDayNumber 
    });
    
    if (newDay) {
      setSelectedDayId(newDay.id);
      handleAddPlaces(newDay.id);
    }
  };

  const handleDaySelect = (dayId: string) => {
    setSelectedDayId(dayId);
    handleAddPlaces(dayId);
  };

  const handleAddPlaces = async (dayId: string) => {
    // Add all selected places to the itinerary
    for (const place of selectedPlaces) {
      await addPlaceMutation.mutateAsync({
        dayItineraryId: dayId,
        placeId: place.id,
        placeName: place.name,
      });
    }
    
    setStep('success');
  };

  const handleViewItinerary = () => {
    onOpenChange(false);
    if (selectedTripId) {
      navigate(`/trip/${selectedTripId}`);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in required</DialogTitle>
            <DialogDescription>
              Please sign in to add places to your itinerary.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={() => navigate('/auth')} className="flex-1">
              Sign In
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'select-places' && 'Select Places to Add'}
            {step === 'select-trip' && 'Choose Itinerary'}
            {step === 'select-day' && 'Choose Day'}
            {step === 'success' && 'Added Successfully!'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select-places' && `Choose which places from ${destination} to add`}
            {step === 'select-trip' && 'Select one of your trips'}
            {step === 'select-day' && `Adding ${selectedPlaces.length} place${selectedPlaces.length > 1 ? 's' : ''} to ${selectedTrip?.title}`}
            {step === 'success' && `${selectedPlaces.length} place${selectedPlaces.length > 1 ? 's' : ''} added to your itinerary`}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Select Places */}
        {step === 'select-places' && (
          <>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">
                {selectedPlaces.length} of {places.length} selected
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleSelectAllPlaces}
              >
                {selectedPlaces.length === places.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-2 pb-4">
                {places.map((place) => {
                  const isSelected = selectedPlaces.some(p => p.id === place.id);
                  return (
                    <button
                      key={place.id}
                      onClick={() => handlePlaceToggle(place)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-muted-foreground/30'
                      )}
                    >
                      <div className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                        isSelected 
                          ? 'border-primary bg-primary text-primary-foreground' 
                          : 'border-muted-foreground/30'
                      )}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      
                      {place.imageUrl && (
                        <img 
                          src={place.imageUrl} 
                          alt={place.name}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{place.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {place.category}
                          </Badge>
                          {place.duration && <span>{place.duration} min</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
            
            <div className="flex gap-3 pt-2 border-t">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={() => setStep('select-trip')} 
                className="flex-1"
                disabled={selectedPlaces.length === 0}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </>
        )}

        {/* Step 2: Select Trip */}
        {step === 'select-trip' && (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              {tripsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : userTrips && userTrips.length > 0 ? (
                <div className="space-y-2 pb-4">
                  {userTrips.map((trip) => (
                    <button
                      key={trip.id}
                      onClick={() => handleTripSelect(trip.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                    >
                      {trip.cover_image ? (
                        <img 
                          src={trip.cover_image} 
                          alt={trip.title}
                          className="h-14 w-14 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center">
                          <MapPin className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{trip.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {trip.destination}, {trip.country}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {trip.duration} day{trip.duration > 1 ? 's' : ''}
                        </p>
                      </div>
                      
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground mb-4">No trips yet</p>
                  <Button onClick={() => navigate('/create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Trip
                  </Button>
                </div>
              )}
            </ScrollArea>
            
            <div className="flex gap-3 pt-2 border-t">
              <Button variant="outline" onClick={() => setStep('select-places')} className="flex-1">
                Back
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Select Day */}
        {step === 'select-day' && (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              {daysLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2 pb-4">
                  {tripDays && tripDays.map((day) => (
                    <button
                      key={day.id}
                      onClick={() => handleDaySelect(day.id)}
                      disabled={addPlaceMutation.isPending}
                      className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left disabled:opacity-50"
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      
                      <div className="flex-1">
                        <p className="font-medium">Day {day.day_number}</p>
                        {day.title && (
                          <p className="text-sm text-muted-foreground">{day.title}</p>
                        )}
                      </div>
                      
                      {addPlaceMutation.isPending && selectedDayId === day.id ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                  ))}
                  
                  {/* Add New Day Button */}
                  <button
                    onClick={handleCreateNewDay}
                    disabled={createDayMutation.isPending || addPlaceMutation.isPending}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 transition-all text-left disabled:opacity-50"
                  >
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      {createDayMutation.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Plus className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <p className="font-medium text-muted-foreground">Add New Day</p>
                      <p className="text-sm text-muted-foreground">
                        Day {tripDays ? tripDays.length + 1 : 1}
                      </p>
                    </div>
                  </button>
                </div>
              )}
            </ScrollArea>
            
            <div className="flex gap-3 pt-2 border-t">
              <Button variant="outline" onClick={() => setStep('select-trip')} className="flex-1">
                Back
              </Button>
            </div>
          </>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div className="flex flex-col items-center py-6">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            
            <p className="text-center text-muted-foreground mb-6">
              {selectedPlaces.map(p => p.name).join(', ')} 
              {selectedPlaces.length > 1 ? ' have' : ' has'} been added to{' '}
              <span className="font-medium text-foreground">{selectedTrip?.title}</span>
            </p>
            
            <div className="flex gap-3 w-full">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Done
              </Button>
              <Button onClick={handleViewItinerary} className="flex-1">
                View Itinerary
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
