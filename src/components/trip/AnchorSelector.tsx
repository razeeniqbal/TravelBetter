import { useState } from 'react';
import { Place } from '@/types/trip';
import { Home, MapPin, AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AnchorSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  places: Place[];
  currentAnchorId: string | null;
  onSelectAnchor: (placeId: string) => void;
}

export function AnchorSelector({
  open,
  onOpenChange,
  places,
  currentAnchorId,
  onSelectAnchor,
}: AnchorSelectorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(currentAnchorId);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingPlace, setPendingPlace] = useState<Place | null>(null);

  const accommodationKeywords = ['hotel', 'hostel', 'airbnb', 'apartment', 'guesthouse', 'resort', 'lodge', 'inn'];
  
  const isAccommodation = (place: Place) => {
    const nameLower = place.name.toLowerCase();
    return accommodationKeywords.some(k => nameLower.includes(k)) || place.category === 'accommodation';
  };

  // Sort places - accommodations first
  const sortedPlaces = [...places].sort((a, b) => {
    const aIsAccom = isAccommodation(a);
    const bIsAccom = isAccommodation(b);
    if (aIsAccom && !bIsAccom) return -1;
    if (!aIsAccom && bIsAccom) return 1;
    return 0;
  });

  const handleSelect = (place: Place) => {
    if (!isAccommodation(place)) {
      setPendingPlace(place);
      setShowWarning(true);
    } else {
      setSelectedId(place.id);
    }
  };

  const confirmNonAccommodation = () => {
    if (pendingPlace) {
      setSelectedId(pendingPlace.id);
      setPendingPlace(null);
    }
    setShowWarning(false);
  };

  const handleConfirm = () => {
    if (selectedId) {
      onSelectAnchor(selectedId);
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-amber-500" />
              Select Your Home Base
            </DialogTitle>
            <DialogDescription>
              We'll plan routes starting and ending at this location each day.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-2">
              {sortedPlaces.map((place) => {
                const isAccom = isAccommodation(place);
                const isSelected = place.id === selectedId;

                return (
                  <button
                    key={place.id}
                    onClick={() => handleSelect(place)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                      isSelected 
                        ? 'border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/20' 
                        : 'border-border hover:border-muted-foreground/30',
                      isAccom && !isSelected && 'bg-muted/30'
                    )}
                  >
                    <div className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                      isAccom 
                        ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' 
                        : 'bg-muted text-muted-foreground'
                    )}>
                      {isAccom ? <Home className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground line-clamp-1">{place.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {isAccom ? '🏨 Accommodation' : place.category.charAt(0).toUpperCase() + place.category.slice(1)}
                      </p>
                    </div>

                    {isSelected && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Skip for now
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={!selectedId}
              className="flex-1 bg-amber-500 hover:bg-amber-600"
            >
              <Home className="mr-2 h-4 w-4" />
              Set as Home Base
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Non-accommodation warning */}
      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Not an Accommodation
            </DialogTitle>
            <DialogDescription>
              "{pendingPlace?.name}" doesn't look like a hotel or accommodation. 
              Use it as your home base anyway?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowWarning(false)} className="flex-1">
              Pick Another
            </Button>
            <Button onClick={confirmNonAccommodation} className="flex-1">
              Yes, Use This
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
