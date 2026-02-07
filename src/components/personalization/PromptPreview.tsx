import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, Edit2, MapPin } from 'lucide-react';
import type { ParsedDayGroup } from '@/types/itinerary';
import { Textarea } from '@/components/ui/textarea';

interface PromptPreviewProps {
  prompt: string;
  previewText?: string;
  importedPlaces: string[];
  dayGroups?: ParsedDayGroup[];
  onEdit: () => void;
  onSubmit: () => void;
  isLoading?: boolean;
  editableText?: string;
  onEditableTextChange?: (value: string) => void;
  editableLabel?: string;
  hideEditAction?: boolean;
}

export function PromptPreview({
  prompt,
  previewText,
  importedPlaces,
  dayGroups,
  onEdit,
  onSubmit,
  isLoading = false,
  editableText,
  onEditableTextChange,
  editableLabel = 'Extracted text',
  hideEditAction = false,
}: PromptPreviewProps) {
  const displayText = editableText !== undefined ? editableText : (previewText?.trim() || prompt);
  const hasDayGroups = Boolean(dayGroups && dayGroups.length > 0);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-foreground">Ready to explore?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review the exact prompt we will send to the AI
        </p>
      </div>

      {/* Prompt Preview Card */}
      <Card className="p-4 bg-gradient-to-br from-card to-muted/30 border-primary/20">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-lg">✨</span>
          </div>
          <div className="flex-1 min-w-0">
            {editableText !== undefined ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{editableLabel}</p>
                <Textarea
                  value={displayText}
                  onChange={(event) => onEditableTextChange?.(event.target.value)}
                  className="min-h-[180px] resize-y bg-background"
                />
              </div>
            ) : (
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {displayText}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Imported Places Summary */}
      {importedPlaces.length > 0 && (
        <Card className="p-3 bg-secondary/30 border-secondary">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-secondary-foreground" />
            <span className="text-secondary-foreground font-medium">
              {importedPlaces.length} place{importedPlaces.length > 1 ? 's' : ''} imported
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {importedPlaces.slice(0, 5).map((place, i) => (
              <span 
                key={i} 
                className="text-xs bg-secondary px-2 py-1 rounded-full text-secondary-foreground"
              >
                {place}
              </span>
            ))}
            {importedPlaces.length > 5 && (
              <span className="text-xs text-secondary-foreground px-2 py-1">
                +{importedPlaces.length - 5} more
              </span>
            )}
          </div>
        </Card>
      )}

      {hasDayGroups && (
        <Card className="p-3 bg-card border-border">
          <div className="text-sm font-medium text-foreground">Day breakdown</div>
          <div className="mt-3 space-y-3">
            {dayGroups?.map((day, index) => (
              <div key={`${day.label}-${index}`} className="space-y-2">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {day.label}
                </div>
                <ul className="space-y-1 text-sm text-foreground">
                  {day.places.map((place, placeIndex) => (
                    <li key={`${place.name}-${placeIndex}`} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{place.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        {!hideEditAction && (
          <Button
            variant="outline"
            onClick={onEdit}
            className="flex-1 gap-2"
            disabled={isLoading}
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </Button>
        )}
        <Button
          onClick={onSubmit}
          className="flex-1 gap-2"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Get Ideas
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
