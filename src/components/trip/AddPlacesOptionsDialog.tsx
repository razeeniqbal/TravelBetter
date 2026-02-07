import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Search, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

export type PlacementMode = 'manual' | 'ai';

export interface PlacementCandidate {
  suggestionId: string;
  displayName: string;
}

export interface PlacementModeDecision {
  suggestionId: string;
  displayName: string;
  mode: PlacementMode;
  manualDayNumber?: number;
}

interface AddPlacesOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destination?: string;
  dayNumber?: number;
  suggestions?: PlacementCandidate[];
  totalDays?: number;
  onConfirmPlacementModes?: (decisions: PlacementModeDecision[]) => void;
}

export function AddPlacesOptionsDialog({
  open,
  onOpenChange,
  destination,
  dayNumber,
  suggestions,
  totalDays = 1,
  onConfirmPlacementModes,
}: AddPlacesOptionsDialogProps) {
  const navigate = useNavigate();
  const isPlacementDecisionFlow = Boolean(suggestions?.length && onConfirmPlacementModes);
  const [decisions, setDecisions] = useState<Record<string, { mode?: PlacementMode; manualDayNumber: number }>>({});

  useEffect(() => {
    if (!open || !isPlacementDecisionFlow || !suggestions) return;

    const initialDecisions: Record<string, { mode?: PlacementMode; manualDayNumber: number }> = {};
    suggestions.forEach((suggestion) => {
      initialDecisions[suggestion.suggestionId] = {
        mode: undefined,
        manualDayNumber: 1,
      };
    });
    setDecisions(initialDecisions);
  }, [open, isPlacementDecisionFlow, suggestions]);

  const canConfirmPlacementModes = useMemo(() => {
    if (!suggestions || !isPlacementDecisionFlow) return false;

    return suggestions.every((suggestion) => {
      const decision = decisions[suggestion.suggestionId];
      if (!decision?.mode) return false;
      if (decision.mode === 'manual') {
        return Number.isFinite(decision.manualDayNumber)
          && decision.manualDayNumber >= 1
          && decision.manualDayNumber <= totalDays;
      }
      return true;
    });
  }, [decisions, isPlacementDecisionFlow, suggestions, totalDays]);

  const setPlacementMode = (suggestionId: string, mode: PlacementMode) => {
    setDecisions((prev) => ({
      ...prev,
      [suggestionId]: {
        mode,
        manualDayNumber: prev[suggestionId]?.manualDayNumber || 1,
      },
    }));
  };

  const setManualDay = (suggestionId: string, value: number) => {
    setDecisions((prev) => ({
      ...prev,
      [suggestionId]: {
        mode: prev[suggestionId]?.mode,
        manualDayNumber: value,
      },
    }));
  };

  const handleConfirmPlacementModes = () => {
    if (!suggestions || !onConfirmPlacementModes) return;

    const normalized: PlacementModeDecision[] = [];
    suggestions.forEach((suggestion) => {
      const decision = decisions[suggestion.suggestionId];
      if (!decision?.mode) return;

      normalized.push({
        suggestionId: suggestion.suggestionId,
        displayName: suggestion.displayName,
        mode: decision.mode,
        manualDayNumber: decision.mode === 'manual'
          ? Math.min(Math.max(1, decision.manualDayNumber), totalDays)
          : undefined,
      });
    });

    if (normalized.length !== suggestions.length) {
      toast.error('Please choose manual or AI-assisted placement for each suggestion.');
      return;
    }

    onConfirmPlacementModes(normalized);
    onOpenChange(false);
  };

  const handleGenerateWithAI = () => {
    onOpenChange(false);
    // Navigate to create page with destination pre-filled
    navigate(`/create?destination=${encodeURIComponent(destination || '')}`);
  };

  const handleAddManually = () => {
    onOpenChange(false);
    toast.info('Manual place search coming soon!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isPlacementDecisionFlow ? 'sm:max-w-lg' : 'sm:max-w-md'}>
        {isPlacementDecisionFlow ? (
          <>
            <DialogHeader>
              <DialogTitle>Choose Placement Mode</DialogTitle>
              <DialogDescription>
                Select manual day placement or AI-assisted placement for each suggestion.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {suggestions?.map((suggestion) => {
                const decision = decisions[suggestion.suggestionId];
                const mode = decision?.mode;
                const dayValue = decision?.manualDayNumber || 1;

                return (
                  <div key={suggestion.suggestionId} className="rounded-xl border border-border p-3">
                    <p className="text-sm font-medium text-foreground">{suggestion.displayName}</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <Button
                        type="button"
                        variant={mode === 'manual' ? 'default' : 'outline'}
                        className="justify-start"
                        onClick={() => setPlacementMode(suggestion.suggestionId, 'manual')}
                      >
                        <MapPin className="mr-2 h-4 w-4" />
                        Manual day
                      </Button>
                      <Button
                        type="button"
                        variant={mode === 'ai' ? 'default' : 'outline'}
                        className="justify-start"
                        onClick={() => setPlacementMode(suggestion.suggestionId, 'ai')}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        AI-assisted
                      </Button>
                    </div>

                    {mode === 'manual' && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Day</span>
                        <Input
                          type="number"
                          value={dayValue}
                          min={1}
                          max={totalDays}
                          onChange={(event) => setManualDay(suggestion.suggestionId, Number(event.target.value) || 1)}
                          className="h-8 w-24"
                        />
                        <span className="text-xs text-muted-foreground">of {totalDays}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={!canConfirmPlacementModes}
                onClick={handleConfirmPlacementModes}
              >
                Continue
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add Places to Day {dayNumber}</DialogTitle>
              <DialogDescription>
                Choose how you'd like to add places to your itinerary
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-4">
              <Button
                variant="outline"
                className="h-auto flex-col items-start gap-2 p-4 text-left"
                onClick={handleGenerateWithAI}
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
                    <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="font-medium">Generate with AI</p>
                    <p className="text-sm text-muted-foreground">
                      Get personalized place suggestions for {destination}
                    </p>
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto flex-col items-start gap-2 p-4 text-left"
                onClick={handleAddManually}
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Search className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Add Manually</p>
                    <p className="text-sm text-muted-foreground">
                      Search and browse places to add
                    </p>
                  </div>
                </div>
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
