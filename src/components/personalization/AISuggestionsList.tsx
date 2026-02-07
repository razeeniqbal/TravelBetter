import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Circle, Clock, MapPin, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CategoryBadge } from '@/components/badges/CategoryBadge';
import type { PlaceCategory } from '@/types/trip';
import { useMemo, useState } from 'react';

export interface AISuggestion {
  suggestionId?: string;
  name: string;
  nameLocal?: string;
  category: string;
  description: string;
  duration?: number;
  cost?: string;
  tips?: string[];
  confidence: number;
  reason: string;
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
  confirmedDayNumber?: number;
}

interface AISuggestionsListProps {
  suggestions: AISuggestion[];
  processingTime?: number;
  requiredPlaces?: string[];
  onContinue: (selectedSuggestions: AISuggestion[]) => void;
}

export function AISuggestionsList({
  suggestions,
  processingTime,
  requiredPlaces = [],
  onContinue,
}: AISuggestionsListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const getSuggestionKey = (suggestion: AISuggestion, index: number) =>
    suggestion.suggestionId || `suggestion-${index}-${suggestion.name.toLowerCase().replace(/\s+/g, '-')}`;

  const selectedSuggestions = useMemo(
    () => suggestions.filter((suggestion, index) => selectedIds.has(getSuggestionKey(suggestion, index))),
    [selectedIds, suggestions]
  );

  const selectedCount = selectedSuggestions.length;
  const requiredCount = requiredPlaces.length;
  const canContinue = selectedCount > 0 || requiredCount > 0;

  const continueLabel = selectedCount > 0
    ? `Choose placement for ${selectedCount} suggestion${selectedCount !== 1 ? 's' : ''}`
    : `Continue with ${requiredCount} place${requiredCount !== 1 ? 's' : ''}`;

  const toggleSelected = (suggestion: AISuggestion, index: number) => {
    const key = getSuggestionKey(suggestion, index);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
          <Sparkles className="h-4 w-4" />
          AI Suggestions
        </div>
        <h2 className="text-lg font-semibold text-foreground mt-2">
          Found {suggestions.length} places for you
        </h2>
        {processingTime && (
          <p className="text-xs text-muted-foreground mt-1">
            Generated in {(processingTime / 1000).toFixed(1)}s
          </p>
        )}
      </div>

      {requiredCount > 0 && (
        <Card className="p-3 bg-secondary/30 border-secondary">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-secondary-foreground" />
            <span className="text-secondary-foreground font-medium">
              {requiredCount} place{requiredCount !== 1 ? 's' : ''} already included
            </span>
          </div>
          {suggestions.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Select additional suggestions with checklist controls below
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
            {requiredPlaces.slice(0, 5).map((place, index) => (
              <span
                key={index}
                className="text-xs bg-secondary px-2 py-1 rounded-full text-secondary-foreground"
              >
                {place}
              </span>
            ))}
            {requiredCount > 5 && (
              <span className="text-xs text-secondary-foreground px-2 py-1">
                +{requiredCount - 5} more
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Suggestions List */}
      <div className="space-y-3">
        {suggestions.map((suggestion, index) => {
          const key = getSuggestionKey(suggestion, index);
          const isSelected = selectedIds.has(key);

          return (
          <Card
            key={key}
            className={cn(
              "p-4 transition-all duration-200",
              isSelected && "border-primary bg-primary/5"
            )}
          >
            <div className="flex items-start gap-3">
              <button
                type="button"
                aria-label={`Select ${suggestion.name}`}
                onClick={() => toggleSelected(suggestion, index)}
                className={cn(
                  'mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground/40 text-muted-foreground hover:border-primary/60'
                )}
              >
                {isSelected ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-foreground">{suggestion.name}</h3>
                    {suggestion.nameLocal && (
                      <p className="text-xs text-muted-foreground">{suggestion.nameLocal}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <CategoryBadge category={suggestion.category as PlaceCategory} size="sm" />
                    {isSelected && (
                      <Badge variant="secondary" className="text-[10px]">
                        Selected
                      </Badge>
                    )}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {suggestion.description}
                </p>

                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                  {suggestion.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {suggestion.duration} min
                    </span>
                  )}
                  {suggestion.cost && (
                    <span className="font-medium">{suggestion.cost}</span>
                  )}
                  {suggestion.neighborhood && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {suggestion.neighborhood}
                    </span>
                  )}
                </div>

                {/* Reason */}
                <div className="mt-2 flex items-start gap-1.5">
                  <Badge variant="secondary" className="text-xs shrink-0">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI
                  </Badge>
                  <p className="text-xs text-muted-foreground italic">
                    "{suggestion.reason}"
                  </p>
                </div>

                {/* Tips */}
                {suggestion.tips && suggestion.tips.length > 0 && (
                  <p className="text-xs text-amber-600 mt-2">
                    Tip: {suggestion.tips[0]}
                  </p>
                )}
              </div>
            </div>
          </Card>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="sticky bottom-0 bg-background pt-4 pb-2 border-t space-y-3">
        <p className="text-xs text-muted-foreground">
          {selectedCount > 0
            ? `${selectedCount} suggestion${selectedCount !== 1 ? 's' : ''} selected`
            : 'Select suggestions, then choose manual or AI-assisted placement'}
        </p>
        <Button
          onClick={() => onContinue(selectedSuggestions)}
          className="w-full"
          disabled={!canContinue}
        >
          {continueLabel}
        </Button>
      </div>
    </div>
  );
}
