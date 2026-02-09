import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Loader2, MapPin } from 'lucide-react';
import type { PlaceSearchResult } from '@/types/itinerary';
import { usePlaceSearch } from '@/hooks/usePlaceSearch';

interface DayPlaceSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayNumber: number;
  destination?: string;
  onAddPlace: (result: PlaceSearchResult) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function DayPlaceSearchDialog({
  open,
  onOpenChange,
  dayNumber,
  destination,
  onAddPlace,
  isSubmitting = false,
}: DayPlaceSearchDialogProps) {
  const {
    query,
    setQuery,
    results,
    status,
    errorMessage,
    isLoading,
    runSearch,
    retry,
    clearState,
  } = usePlaceSearch({
    destinationContext: destination,
    dayNumber,
    limit: 6,
    debounceMs: 350,
  });

  const [selectedResult, setSelectedResult] = useState<PlaceSearchResult | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setSelectedResult(null);
      setQuery('');
      clearState();
    }
  }, [clearState, open, setQuery]);

  useEffect(() => {
    if (!selectedResult) return;
    const stillExists = results.some((result) => result.providerPlaceId === selectedResult.providerPlaceId);
    if (!stillExists) {
      setSelectedResult(null);
    }
  }, [results, selectedResult]);

  useEffect(() => {
    if (results.length === 0) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((prev) => Math.min(prev, results.length - 1));
  }, [results]);

  const trimmedQuery = query.trim();
  const canSearch = trimmedQuery.length > 0;
  const canAdd = Boolean(selectedResult) && !isSubmitting;

  const selectedId = useMemo(() => {
    if (!selectedResult) return null;
    return selectedResult.providerPlaceId || `${selectedResult.displayName}-${selectedResult.formattedAddress || ''}`;
  }, [selectedResult]);

  const handleSubmitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSearch) return;
    void runSearch(trimmedQuery);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (event.key === 'Enter' && status === 'success') {
      event.preventDefault();
      setSelectedResult(results[activeIndex]);
    }
  };

  const handleAddSelectedPlace = async () => {
    if (!selectedResult) return;
    await onAddPlace(selectedResult);
    setSelectedResult(null);
    setQuery('');
    clearState();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add new place</DialogTitle>
          <DialogDescription>
            Search for a place to add to Day {dayNumber}{destination ? ` in ${destination}` : ''}.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={handleSubmitSearch}>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Search places"
              aria-label="Search places"
            />
            <Button type="submit" variant="outline" disabled={!canSearch || isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
            </Button>
          </div>

          {!canSearch && (
            <p className="text-xs text-muted-foreground">Enter a place name to search.</p>
          )}

          {status === 'loading' && (
            <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching places...
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm text-destructive">{errorMessage || 'Search failed. Please try again.'}</p>
              <Button type="button" variant="outline" size="sm" onClick={retry}>
                Retry search
              </Button>
            </div>
          )}

          {status === 'no_results' && (
            <div className="space-y-2 rounded-md border border-border/60 bg-muted/40 p-3">
              <p className="text-sm text-muted-foreground">No places found. Try a more specific query.</p>
              <Button type="button" variant="outline" size="sm" onClick={retry}>
                Retry search
              </Button>
            </div>
          )}

          {results.length > 0 && (
            <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border border-border/60 p-2">
              {results.map((result, resultIndex) => {
                const resultId = result.providerPlaceId || `${result.displayName}-${result.formattedAddress || ''}`;
                const isSelected = resultId === selectedId;
                const isActive = resultIndex === activeIndex;
                return (
                  <button
                    type="button"
                    key={resultId}
                    className={cn(
                      'w-full rounded-md border px-3 py-2 text-left transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : isActive
                          ? 'border-primary/60 bg-muted/60'
                          : 'border-border hover:border-primary/60 hover:bg-muted/50'
                    )}
                    onClick={() => setSelectedResult(result)}
                  >
                    <p className="text-sm font-medium text-foreground">{result.displayName}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {result.secondaryText || result.formattedAddress || 'Location details unavailable'}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleAddSelectedPlace} disabled={!canAdd}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add place'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
