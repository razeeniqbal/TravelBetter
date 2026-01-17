import { PlaceCategory, PlaceSource } from '@/types/trip';
import { cn } from '@/lib/utils';
import { 
  UtensilsCrossed, 
  Landmark, 
  Trees, 
  ShoppingBag, 
  Moon, 
  Camera,
  Hotel,
  Train,
  User,
  Sparkles
} from 'lucide-react';

interface CategoryBadgeProps {
  category: PlaceCategory;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const categoryConfig: Record<PlaceCategory, { icon: typeof UtensilsCrossed; label: string; className: string }> = {
  food: { icon: UtensilsCrossed, label: 'Food', className: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
  culture: { icon: Landmark, label: 'Culture', className: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
  nature: { icon: Trees, label: 'Nature', className: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
  shop: { icon: ShoppingBag, label: 'Shopping', className: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400' },
  night: { icon: Moon, label: 'Nightlife', className: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
  photo: { icon: Camera, label: 'Photo Spot', className: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400' },
  accommodation: { icon: Hotel, label: 'Stay', className: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
  transport: { icon: Train, label: 'Transport', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

export function CategoryBadge({ category, size = 'sm', showLabel = true }: CategoryBadgeProps) {
  const config = categoryConfig[category];
  const Icon = config.icon;
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-medium',
      config.className,
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
    )}>
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      {showLabel && config.label}
    </span>
  );
}

interface SourceBadgeProps {
  source: PlaceSource;
  confidence?: number;
  size?: 'sm' | 'md';
}

export function SourceBadge({ source, confidence, size = 'sm' }: SourceBadgeProps) {
  const isUser = source === 'user';
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-medium',
      isUser 
        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
        : 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
    )}>
      {isUser ? (
        <>
          <User className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
          Imported
        </>
      ) : (
        <>
          <Sparkles className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
          AI Suggested
          {confidence && <span className="opacity-70">({confidence}%)</span>}
        </>
      )}
    </span>
  );
}
