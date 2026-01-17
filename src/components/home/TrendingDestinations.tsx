import { cn } from '@/lib/utils';

interface Destination {
  id: string;
  name: string;
  image: string;
}

const destinations: Destination[] = [
  { id: 'alps', name: 'Alps', image: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=100&h=100&fit=crop' },
  { id: 'venice', name: 'Venice', image: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=100&h=100&fit=crop' },
  { id: 'tokyo', name: 'Tokyo', image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=100&h=100&fit=crop' },
  { id: 'paris', name: 'Paris', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=100&h=100&fit=crop' },
  { id: 'london', name: 'London', image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=100&h=100&fit=crop' },
  { id: 'bali', name: 'Bali', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=100&h=100&fit=crop' },
  { id: 'seoul', name: 'Seoul', image: 'https://images.unsplash.com/photo-1534274867514-d5b47ef89ed7?w=100&h=100&fit=crop' },
];

interface TrendingDestinationsProps {
  selected?: string | null;
  onSelect?: (id: string) => void;
}

export function TrendingDestinations({ selected, onSelect }: TrendingDestinationsProps) {
  return (
    <div className="py-4">
      <h3 className="mb-3 px-4 text-sm font-semibold text-muted-foreground">Trending Destinations</h3>
      <div className="no-scrollbar flex gap-4 overflow-x-auto px-4">
        {destinations.map((dest) => (
          <button
            key={dest.id}
            onClick={() => onSelect?.(dest.id)}
            className="flex flex-col items-center gap-2"
          >
            <div className={cn(
              'h-16 w-16 overflow-hidden rounded-full ring-2 ring-offset-2 transition-all',
              selected === dest.id 
                ? 'ring-primary ring-offset-background' 
                : 'ring-transparent ring-offset-transparent hover:ring-muted-foreground/30'
            )}>
              <img 
                src={dest.image} 
                alt={dest.name} 
                className="h-full w-full object-cover"
              />
            </div>
            <span className={cn(
              'text-xs font-medium',
              selected === dest.id ? 'text-primary' : 'text-muted-foreground'
            )}>
              {dest.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
