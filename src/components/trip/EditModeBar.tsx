import { Pencil, Save, X, Home, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EditModeBarProps {
  isEditMode: boolean;
  isSaving: boolean;
  hasAnchor: boolean;
  onToggleEdit: () => void;
  onSave: () => void;
  onDiscard: () => void;
  onSelectAnchor: () => void;
}

export function EditModeBar({
  isEditMode,
  isSaving,
  hasAnchor,
  onToggleEdit,
  onSave,
  onDiscard,
  onSelectAnchor,
}: EditModeBarProps) {
  if (!isEditMode) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onToggleEdit}
        className="gap-2"
      >
        <Pencil className="h-4 w-4" />
        Edit Trip
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onSelectAnchor}
        className={cn(
          "gap-2",
          hasAnchor 
            ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400" 
            : "border-dashed"
        )}
      >
        <Home className="h-4 w-4" />
        {hasAnchor ? 'Change Anchor' : 'Set Anchor'}
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onDiscard}
        disabled={isSaving}
        className="gap-2 text-muted-foreground"
      >
        <X className="h-4 w-4" />
        Cancel
      </Button>
      
      <Button
        size="sm"
        onClick={onSave}
        disabled={isSaving}
        className="gap-2 bg-green-600 hover:bg-green-700"
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Save
      </Button>
    </div>
  );
}
