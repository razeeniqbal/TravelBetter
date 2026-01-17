import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface DestinationCardProps {
  id: string;
  country: string;
  city: string;
  image: string;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

export function DestinationCard({ 
  id, 
  country, 
  city, 
  image, 
  selected, 
  onSelect 
}: DestinationCardProps) {
  return (
    <button
      onClick={() => onSelect?.(id)}
      className={cn(
        'group relative overflow-hidden rounded-2xl border-2 transition-all duration-200',
        selected 
          ? 'border-primary shadow-lg' 
          : 'border-transparent hover:border-muted-foreground/30'
      )}
    >
      <div className="aspect-[4/5] overflow-hidden">
        <img 
          src={image} 
          alt={`${city}, ${country}`}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute bottom-3 left-3 text-left text-white">
        <p className="text-lg font-bold leading-tight">{country}</p>
        <p className="text-sm text-white/80">{city}</p>
      </div>
      {selected && (
        <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-4 w-4" />
        </div>
      )}
    </button>
  );
}
