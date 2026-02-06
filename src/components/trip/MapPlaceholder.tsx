import { useEffect, useMemo, useState } from 'react';
import MapLibreGL from 'maplibre-gl';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Map, MapControls, MapMarker, MapRoute, MarkerContent, MarkerTooltip, useMap } from '@/components/ui/map';
import { cn } from '@/lib/utils';
import { geocodePlaceCoordinates } from '@/lib/geocode';
import { AUTH_DISABLED } from '@/lib/flags';
import { supabase } from '@/integrations/supabase/client';
import type { Place } from '@/types/trip';

interface MapPlaceholderProps {
  destination?: string;
  placesCount?: number;
  places?: Place[];
  className?: string;
  showOverlays?: boolean;
  controlsPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

function MapAutoFit({
  resolvedPlaces,
  routeCoordinates,
}: {
  resolvedPlaces: Array<{ coords: { lat: number; lng: number } }>;
  routeCoordinates: [number, number][];
}) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!isLoaded || !map) return;
    if (routeCoordinates.length < 2 && resolvedPlaces.length === 0) return;

    map.resize();

    if (routeCoordinates.length > 1) {
      const bounds = new MapLibreGL.LngLatBounds();
      routeCoordinates.forEach((coord) => bounds.extend(coord));
      map.fitBounds(bounds, {
        padding: { top: 56, bottom: 72, left: 32, right: 32 },
        duration: 500,
        maxZoom: 14,
      });
      return;
    }

    if (resolvedPlaces.length > 1) {
      const bounds = new MapLibreGL.LngLatBounds();
      resolvedPlaces.forEach(({ coords }) => bounds.extend([coords.lng, coords.lat]));
      map.fitBounds(bounds, {
        padding: { top: 56, bottom: 72, left: 32, right: 32 },
        duration: 500,
        maxZoom: 14,
      });
      return;
    }

    if (resolvedPlaces.length === 1) {
      const { coords } = resolvedPlaces[0];
      map.easeTo({ center: [coords.lng, coords.lat], zoom: 13, duration: 400 });
    }
  }, [isLoaded, map, resolvedPlaces, routeCoordinates]);

  return null;
}

function getCenterFromCoordinates(points: Array<{ lat: number; lng: number }>) {
  if (points.length === 0) return [0, 0] as [number, number];

  const totals = points.reduce(
    (acc, place) => {
      return {
        lat: acc.lat + place.lat,
        lng: acc.lng + place.lng,
      };
    },
    { lat: 0, lng: 0 }
  );

  return [
    totals.lng / points.length,
    totals.lat / points.length,
  ] as [number, number];
}

export function MapPlaceholder({
  destination = 'Kyoto',
  placesCount = 4,
  places = [],
  className,
  showOverlays = true,
  controlsPosition = 'top-right',
}: MapPlaceholderProps) {
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [fallbackCoordinates, setFallbackCoordinates] = useState<Record<string, { lat: number; lng: number }>>({});
  const resolvedPlaces = useMemo(
    () =>
      places
        .map((place, index) => {
          const coords = place.coordinates || fallbackCoordinates[place.id];
          if (!coords) return null;
          return { place, coords, index };
        })
        .filter((place): place is { place: Place; coords: { lat: number; lng: number }; index: number } => Boolean(place)),
    [places, fallbackCoordinates]
  );
  const routeRequest = useMemo(
    () => resolvedPlaces.map(({ coords }) => [coords.lng, coords.lat] as [number, number]),
    [resolvedPlaces]
  );
  const routeKey = useMemo(() => routeRequest.map((pair) => pair.join(',')).join(';'), [routeRequest]);

  useEffect(() => {
    let isActive = true;
    const missingPlaces = places.filter(
      (place) => !place.coordinates && !fallbackCoordinates[place.id]
    );
    if (missingPlaces.length === 0) return;

    const resolveMissingCoords = async () => {
      const updates: Record<string, { lat: number; lng: number }> = {};
      for (const place of missingPlaces) {
        const coords = await geocodePlaceCoordinates(place.name, destination);
        if (!coords) continue;
        updates[place.id] = coords;

        if (!AUTH_DISABLED) {
          const { error } = await supabase
            .from('places')
            .update({ latitude: coords.lat, longitude: coords.lng })
            .eq('id', place.id);
          if (error) {
            console.error('Failed to update place coordinates:', error);
          }
        }
      }

      if (!isActive || Object.keys(updates).length === 0) return;
      setFallbackCoordinates((prev) => ({ ...prev, ...updates }));
    };

    void resolveMissingCoords();
    return () => {
      isActive = false;
    };
  }, [places, destination, fallbackCoordinates]);

  useEffect(() => {
    if (resolvedPlaces.length < 2) {
      setRouteCoordinates([]);
      return;
    }

    const controller = new AbortController();
    const fetchRoute = async () => {
      setRouteCoordinates([]);
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${routeKey}?overview=full&geometries=geojson`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        const coords = data?.routes?.[0]?.geometry?.coordinates;
        if (Array.isArray(coords) && coords.length > 1) {
          setRouteCoordinates(coords as [number, number][]);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
      }
    };

    void fetchRoute();
    return () => controller.abort();
  }, [routeKey, resolvedPlaces.length]);

  const center = getCenterFromCoordinates(resolvedPlaces.map((place) => place.coords));
  const zoom = resolvedPlaces.length > 0 ? 12 : 1;

  return (
    <div
      className={cn(
        'relative h-40 overflow-hidden rounded-xl bg-muted',
        className
      )}
    >
      <Map
        center={center}
        zoom={zoom}
        minZoom={1}
        maxZoom={16}
      >
        <MapAutoFit resolvedPlaces={resolvedPlaces} routeCoordinates={routeCoordinates} />
        {routeCoordinates.length > 1 && (
          <MapRoute
            coordinates={routeCoordinates}
            color="#3B82F6"
            width={3}
            opacity={0.85}
          />
        )}
        {resolvedPlaces.map(({ place, coords, index }) => (
          <MapMarker
            key={place.id}
            longitude={coords.lng}
            latitude={coords.lat}
          >
            <MarkerContent className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[11px] font-semibold text-slate-700 shadow-md ring-1 ring-slate-200">
              {index + 1}
            </MarkerContent>
            <MarkerTooltip>{place.displayName || place.name}</MarkerTooltip>
          </MapMarker>
        ))}
        <MapControls showZoom position={controlsPosition} />
      </Map>

      {showOverlays && (
        <>
          <div className="absolute bottom-3 right-3">
            <Button variant="secondary" size="sm" className="gap-1.5 bg-card shadow-md">
              <ExternalLink className="h-3.5 w-3.5" />
              View on Google
            </Button>
          </div>

          <div className="absolute left-3 top-3">
            <div className="rounded-lg bg-card/90 px-2.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm">
              {placesCount} stops • {destination}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
