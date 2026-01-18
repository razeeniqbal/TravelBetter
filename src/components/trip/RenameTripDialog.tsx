import { useState, useEffect } from 'react';
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

interface RenameTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTitle: string;
  onRename: (newTitle: string) => void;
  isPending?: boolean;
}

export function RenameTripDialog({
  open,
  onOpenChange,
  currentTitle,
  onRename,
  isPending,
}: RenameTripDialogProps) {
  const [title, setTitle] = useState(currentTitle);

  useEffect(() => {
    if (open) {
      setTitle(currentTitle);
    }
  }, [open, currentTitle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && title.trim() !== currentTitle) {
      onRename(title.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Rename Trip</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="trip-title">Trip Title</Label>
            <Input
              id="trip-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter trip title"
              className="mt-2"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!title.trim() || title.trim() === currentTitle || isPending}
            >
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
