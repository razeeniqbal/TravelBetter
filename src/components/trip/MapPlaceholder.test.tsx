import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { MapPlaceholder } from './MapPlaceholder';
import type { Place } from '@/types/trip';

vi.mock('maplibre-gl', () => ({
  default: {
    LngLatBounds: class {
      extend() {
        return this;
      }
    },
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      update: () => ({ eq: () => ({ error: null }) }),
    }),
  },
}));

vi.mock('@/components/ui/map', () => ({
  Map: ({ children }: { children?: ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
  MapControls: () => null,
  MapMarker: ({ children }: { children?: ReactNode }) => (
    <div data-testid="marker">{children}</div>
  ),
  MapRoute: () => null,
  MarkerContent: ({ children }: { children?: ReactNode }) => (
    <div data-testid="marker-content">{children}</div>
  ),
  MarkerTooltip: ({ children }: { children?: ReactNode }) => (
    <div data-testid="marker-tooltip">{children}</div>
  ),
  useMap: () => ({ map: null, isLoaded: false }),
}));

describe('MapPlaceholder', () => {
  it('renders marker tooltips with canonical display names', () => {
    const places: Place[] = [
      {
        id: 'place-1',
        name: 'Raw Place Name',
        displayName: 'Canonical Place Name',
        category: 'culture',
        source: 'user',
        coordinates: { lat: 1.23, lng: 4.56 },
      },
    ];

    render(
      <MapPlaceholder
        destination="Hatyai"
        places={places}
        placesCount={places.length}
        showOverlays={false}
      />
    );

    expect(screen.getByText('Canonical Place Name')).toBeInTheDocument();
  });
});
