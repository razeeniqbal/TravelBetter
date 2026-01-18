import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TripNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destination: string;
  onSave: (name: string) => void;
  isLoading?: boolean;
}

export function TripNameDialog({
  open,
  onOpenChange,
  destination,
  onSave,
  isLoading,
}: TripNameDialogProps) {
  const [tripName, setTripName] = useState(`My ${destination} Adventure`);

  const handleSave = () => {
    if (tripName.trim()) {
      onSave(tripName.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Name Your Trip</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="trip-name">Trip Name</Label>
            <Input
              id="trip-name"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder="e.g., My Kyoto Food Adventure"
              maxLength={100}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              {tripName.length}/100 characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!tripName.trim() || isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Trip'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
