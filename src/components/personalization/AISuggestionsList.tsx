import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, X, Clock, MapPin, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CategoryBadge } from '@/components/badges/CategoryBadge';
import type { PlaceCategory } from '@/types/trip';

export interface AISuggestion {
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
  accepted?: boolean;
  rejected?: boolean;
}

interface AISuggestionsListProps {
  suggestions: AISuggestion[];
  promptInterpretation?: string;
  processingTime?: number;
  onAccept: (index: number) => void;
  onReject: (index: number) => void;
  onAcceptAll: () => void;
  onContinue: () => void;
}

export function AISuggestionsList({
  suggestions,
  promptInterpretation,
  processingTime,
  onAccept,
  onReject,
  onAcceptAll,
  onContinue,
}: AISuggestionsListProps) {
  const acceptedCount = suggestions.filter(s => s.accepted).length;
  const pendingCount = suggestions.filter(s => !s.accepted && !s.rejected).length;

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

      {/* AI Interpretation */}
      {promptInterpretation && (
        <Card className="p-3 bg-accent/10 border-accent/30">
          <p className="text-xs text-accent-foreground">
            <span className="font-medium">AI understood: </span>
            {promptInterpretation}
          </p>
        </Card>
      )}

      {/* Suggestions List */}
      <div className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <Card 
            key={index}
            className={cn(
              "p-4 transition-all duration-200",
              suggestion.accepted && "border-green-500 bg-green-50 dark:bg-green-950/20",
              suggestion.rejected && "opacity-50 border-muted"
            )}
          >
            <div className="flex items-start gap-3">
              {/* Confidence Indicator */}
              <div className="flex flex-col items-center shrink-0">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
                  suggestion.confidence >= 80 && "bg-green-100 text-green-700",
                  suggestion.confidence >= 60 && suggestion.confidence < 80 && "bg-amber-100 text-amber-700",
                  suggestion.confidence < 60 && "bg-gray-100 text-gray-600"
                )}>
                  {suggestion.confidence}%
                </div>
                <Progress 
                  value={suggestion.confidence} 
                  className="w-10 h-1 mt-1"
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-foreground">{suggestion.name}</h3>
                    {suggestion.nameLocal && (
                      <p className="text-xs text-muted-foreground">{suggestion.nameLocal}</p>
                    )}
                  </div>
                  <CategoryBadge category={suggestion.category as PlaceCategory} size="sm" />
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
                    💡 {suggestion.tips[0]}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            {!suggestion.accepted && !suggestion.rejected && (
              <div className="flex gap-2 mt-3 ml-13">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReject(index)}
                  className="flex-1 text-muted-foreground hover:text-destructive hover:border-destructive"
                >
                  <X className="h-4 w-4 mr-1" />
                  Skip
                </Button>
                <Button
                  size="sm"
                  onClick={() => onAccept(index)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            )}

            {suggestion.accepted && (
              <div className="flex items-center gap-2 mt-3 ml-13 text-green-600">
                <Check className="h-4 w-4" />
                <span className="text-sm font-medium">Added to trip</span>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="sticky bottom-0 bg-background pt-4 pb-2 border-t space-y-3">
        {pendingCount > 0 && (
          <Button
            variant="outline"
            onClick={onAcceptAll}
            className="w-full"
          >
            Accept All Remaining ({pendingCount})
          </Button>
        )}
        <Button
          onClick={onContinue}
          className="w-full"
          disabled={acceptedCount === 0}
        >
          Continue with {acceptedCount} Place{acceptedCount !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
}
