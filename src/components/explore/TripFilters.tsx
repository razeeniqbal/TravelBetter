import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TripFiltersState {
  destination?: string;
  duration?: string;
  style?: string;
  sortBy: 'trending' | 'recent' | 'remixes';
}

interface TripFiltersProps {
  filters: TripFiltersState;
  onFiltersChange: (filters: TripFiltersState) => void;
  destinations?: string[];
}

const travelStyles = [
  { id: 'foodie', label: '🍜 Foodie', icon: '🍜' },
  { id: 'adventure', label: '🏔️ Adventure', icon: '🏔️' },
  { id: 'culture', label: '🏛️ Culture', icon: '🏛️' },
  { id: 'budget', label: '💰 Budget', icon: '💰' },
  { id: 'luxury', label: '✨ Luxury', icon: '✨' },
  { id: 'nature', label: '🌳 Nature', icon: '🌳' },
];

const durationOptions = [
  { id: 'short', label: '1-3 days' },
  { id: 'medium', label: '4-7 days' },
  { id: 'long', label: '8+ days' },
];

export function TripFilters({
  filters,
  onFiltersChange,
  destinations = [],
}: TripFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeFilterCount = [
    filters.destination,
    filters.duration,
    filters.style,
  ].filter(Boolean).length;

  const clearFilters = () => {
    onFiltersChange({ sortBy: filters.sortBy });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Quick Sort Pills */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {(['trending', 'recent', 'remixes'] as const).map((sort) => (
          <button
            key={sort}
            onClick={() => onFiltersChange({ ...filters, sortBy: sort })}
            className={cn(
              'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              filters.sortBy === sort
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {sort === 'trending' && '🔥 Trending'}
            {sort === 'recent' && '🆕 Recent'}
            {sort === 'remixes' && '🔄 Most Remixed'}
          </button>
        ))}
      </div>

      {/* Filter Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 shrink-0">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge className="h-5 w-5 rounded-full p-0 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Filter Trips</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Destination */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Destination</label>
              <Select
                value={filters.destination || 'all'}
                onValueChange={(value) =>
                  onFiltersChange({
                    ...filters,
                    destination: value === 'all' ? undefined : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All destinations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All destinations</SelectItem>
                  {destinations.map((dest) => (
                    <SelectItem key={dest} value={dest}>
                      {dest}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Trip Length</label>
              <div className="flex flex-wrap gap-2">
                {durationOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() =>
                      onFiltersChange({
                        ...filters,
                        duration: filters.duration === opt.id ? undefined : opt.id,
                      })
                    }
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm transition-colors',
                      filters.duration === opt.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-muted'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Style */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Travel Style</label>
              <div className="flex flex-wrap gap-2">
                {travelStyles.map((style) => (
                  <button
                    key={style.id}
                    onClick={() =>
                      onFiltersChange({
                        ...filters,
                        style: filters.style === style.id ? undefined : style.id,
                      })
                    }
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm transition-colors',
                      filters.style === style.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-muted'
                    )}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={clearFilters}
              >
                Clear All
              </Button>
              <Button className="flex-1" onClick={() => setIsOpen(false)}>
                Apply Filters
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
