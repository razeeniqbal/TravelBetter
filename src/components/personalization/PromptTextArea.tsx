import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { RotateCcw, Lightbulb } from 'lucide-react';

interface PromptTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  isEdited: boolean;
  onReset: () => void;
  charCount: number;
  minChars?: number;
  maxChars?: number;
}

export function PromptTextArea({
  value,
  onChange,
  isEdited,
  onReset,
  charCount,
  minChars = 20,
  maxChars = 1000,
}: PromptTextAreaProps) {
  const isUnderMin = charCount < minChars;
  const isNearMax = charCount > maxChars * 0.9;
  const isOverMax = charCount > maxChars;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          Your Request
          {isEdited && (
            <span className="text-xs bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full">
              Customized
            </span>
          )}
        </label>
        {isEdited && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-xs text-muted-foreground hover:text-foreground gap-1 h-7"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        )}
      </div>

      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxChars}
          rows={4}
          className={cn(
            "w-full resize-none rounded-xl border bg-card px-4 py-3 text-sm leading-relaxed",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "transition-all duration-200",
            isUnderMin && "border-amber-400 focus:ring-amber-400",
            isOverMax && "border-destructive focus:ring-destructive",
            !isUnderMin && !isOverMax && "border-border"
          )}
          placeholder="Describe your perfect trip..."
          style={{ minHeight: '100px', maxHeight: '300px' }}
        />
        
        {/* Character count */}
        <div className={cn(
          "absolute bottom-2 right-3 text-xs",
          isUnderMin && "text-amber-600",
          isNearMax && !isOverMax && "text-amber-600",
          isOverMax && "text-destructive",
          !isUnderMin && !isNearMax && "text-muted-foreground"
        )}>
          {charCount}/{maxChars}
        </div>
      </div>

      {/* Tip */}
      <div className="flex items-start gap-2 rounded-lg bg-accent/10 px-3 py-2">
        <Lightbulb className="h-4 w-4 text-accent-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-accent-foreground">
          Be specific! The more details you share, the better suggestions you'll get.
        </p>
      </div>

      {/* Warning states */}
      {isUnderMin && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          ⚠️ Add at least {minChars - charCount} more characters for better results
        </p>
      )}
    </div>
  );
}
