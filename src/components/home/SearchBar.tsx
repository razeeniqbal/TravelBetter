import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  onFilterClick?: () => void;
  showFilter?: boolean;
}

export function SearchBar({ 
  value, 
  onChange, 
  placeholder = 'Search places, cities, reviews...', 
  onFilterClick,
  showFilter = true 
}: SearchBarProps) {
  return (
    <div className="relative flex items-center gap-2 px-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="h-12 rounded-xl border-border bg-card pl-10 pr-4 text-sm shadow-sm transition-shadow focus:shadow-md"
        />
      </div>
      {showFilter && (
        <Button 
          variant="outline" 
          size="icon" 
          className="h-12 w-12 shrink-0 rounded-xl border-border"
          onClick={onFilterClick}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
