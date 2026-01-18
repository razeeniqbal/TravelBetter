import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface QuickSelectPillsProps {
  selectedPurposes: string[];
  selectedTravelers: string;
  selectedBudget: string;
  selectedPace: string;
  onTogglePurpose: (purpose: string) => void;
  onSetTravelers: (travelers: string) => void;
  onSetBudget: (budget: string) => void;
  onSetPace: (pace: string) => void;
}

const purposes = [
  { id: 'food', label: 'Food', icon: '🍜' },
  { id: 'culture', label: 'Culture', icon: '🏛️' },
  { id: 'nature', label: 'Nature', icon: '🌳' },
  { id: 'shop', label: 'Shop', icon: '🛍️' },
  { id: 'night', label: 'Night', icon: '🌙' },
  { id: 'photo', label: 'Photo', icon: '📸' },
  { id: 'active', label: 'Active', icon: '🏃' },
];

const travelers = [
  { id: 'solo', label: 'Solo', icon: '🧑' },
  { id: 'couple', label: 'Couple', icon: '💑' },
  { id: 'family', label: 'Family', icon: '👨‍👩‍👧' },
  { id: 'friends', label: 'Friends', icon: '👯' },
  { id: 'group', label: 'Group', icon: '👥' },
];

const budgets = [
  { id: 'budget', label: 'Budget', icon: '$' },
  { id: 'moderate', label: 'Mid-range', icon: '$$' },
  { id: 'luxury', label: 'Luxury', icon: '$$$' },
];

const paces = [
  { id: 'relaxed', label: 'Relaxed', icon: '🐢' },
  { id: 'moderate', label: 'Moderate', icon: '🚶' },
  { id: 'packed', label: 'Packed', icon: '🏃' },
];

export function QuickSelectPills({
  selectedPurposes,
  selectedTravelers,
  selectedBudget,
  selectedPace,
  onTogglePurpose,
  onSetTravelers,
  onSetBudget,
  onSetPace,
}: QuickSelectPillsProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <div className="space-y-5">
      {/* Purpose Section - Multi-select */}
      <div>
        <label className="mb-3 block text-sm font-medium text-foreground">
          What do you love?
        </label>
        <div className="flex flex-wrap gap-2">
          {purposes.map((p) => (
            <button
              key={p.id}
              onClick={() => onTogglePurpose(p.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200',
                selectedPurposes.includes(p.id)
                  ? 'border-primary bg-primary/10 text-primary scale-105'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/50'
              )}
            >
              <span>{p.icon}</span>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Travelers Section - Single-select */}
      <div>
        <label className="mb-3 block text-sm font-medium text-foreground">
          Who's traveling?
        </label>
        <div className="flex flex-wrap gap-2">
          {travelers.map((t) => (
            <button
              key={t.id}
              onClick={() => onSetTravelers(t.id === selectedTravelers ? '' : t.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200',
                selectedTravelers === t.id
                  ? 'border-primary bg-primary/10 text-primary scale-105'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/50'
              )}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Options - Collapsible */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-muted/50 px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
          <span>Advanced Options</span>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform duration-200",
            advancedOpen && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-4">
          {/* Budget */}
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Budget
            </label>
            <div className="flex gap-2">
              {budgets.map((b) => (
                <button
                  key={b.id}
                  onClick={() => onSetBudget(b.id === selectedBudget ? '' : b.id)}
                  className={cn(
                    'flex-1 rounded-lg border py-2 text-sm font-medium transition-all duration-200',
                    selectedBudget === b.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                  )}
                >
                  <span className="block">{b.icon}</span>
                  <span className="text-xs">{b.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pace */}
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Pace
            </label>
            <div className="flex gap-2">
              {paces.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSetPace(p.id === selectedPace ? '' : p.id)}
                  className={cn(
                    'flex-1 rounded-lg border py-2 text-sm font-medium transition-all duration-200',
                    selectedPace === p.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                  )}
                >
                  <span className="block">{p.icon}</span>
                  <span className="text-xs">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
