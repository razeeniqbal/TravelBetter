import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Map, MapControls, MapMarker, MarkerContent, MarkerTooltip } from '@/components/ui/map';
import type { Place } from '@/types/trip';

interface MapPlaceholderProps {
  destination?: string;
  placesCount?: number;
  places?: Place[];
}

function getCenterFromPlaces(places: Place[]) {
  const withCoords = places.filter((place) => place.coordinates);
  if (withCoords.length === 0) return [0, 0] as [number, number];

  const totals = withCoords.reduce(
    (acc, place) => {
      const coords = place.coordinates!;
      return {
        lat: acc.lat + coords.lat,
        lng: acc.lng + coords.lng,
      };
    },
    { lat: 0, lng: 0 }
  );

  return [
    totals.lng / withCoords.length,
    totals.lat / withCoords.length,
  ] as [number, number];
}

export function MapPlaceholder({
  destination = 'Kyoto',
  placesCount = 4,
  places = [],
}: MapPlaceholderProps) {
  const placesWithCoords = places.filter((place) => place.coordinates);
  const center = getCenterFromPlaces(places);
  const zoom = placesWithCoords.length > 0 ? 12 : 1;

  return (
    <div className="relative h-40 overflow-hidden rounded-xl bg-muted">
      <Map
        center={center}
        zoom={zoom}
        minZoom={1}
        maxZoom={16}
      >
        {placesWithCoords.map((place, index) => (
          <MapMarker
            key={place.id}
            longitude={place.coordinates!.lng}
            latitude={place.coordinates!.lat}
          >
            <MarkerContent className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-lg">
              {index + 1}
            </MarkerContent>
            <MarkerTooltip>{place.name}</MarkerTooltip>
          </MapMarker>
        ))}
        <MapControls showZoom position="top-right" />
      </Map>

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
