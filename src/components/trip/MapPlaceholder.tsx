import { MapPin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MapPlaceholderProps {
  destination?: string;
  placesCount?: number;
}

export function MapPlaceholder({ destination = 'Kyoto', placesCount = 4 }: MapPlaceholderProps) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-muted">
      {/* Map Background Pattern */}
      <div 
        className="h-40 w-full"
        style={{
          background: `
            linear-gradient(90deg, hsl(var(--muted)) 1px, transparent 1px),
            linear-gradient(hsl(var(--muted)) 1px, transparent 1px),
            hsl(var(--muted-foreground) / 0.05)
          `,
          backgroundSize: '20px 20px',
        }}
      >
        {/* Placeholder markers */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="flex gap-8">
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="mt-1 h-2 w-0.5 bg-primary/50" />
              </div>
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-travel-food text-white shadow-lg">
                  <span className="text-xs font-bold">1</span>
                </div>
                <div className="mt-1 h-2 w-0.5 bg-travel-food/50" />
              </div>
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-travel-culture text-white shadow-lg">
                  <span className="text-xs font-bold">2</span>
                </div>
                <div className="mt-1 h-2 w-0.5 bg-travel-culture/50" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View on Google Button */}
      <div className="absolute bottom-3 right-3">
        <Button variant="secondary" size="sm" className="gap-1.5 bg-card shadow-md">
          <ExternalLink className="h-3.5 w-3.5" />
          View on Google
        </Button>
      </div>

      {/* Stats overlay */}
      <div className="absolute left-3 top-3">
        <div className="rounded-lg bg-card/90 px-2.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm">
          {placesCount} stops • {destination}
        </div>
      </div>
    </div>
  );
}
