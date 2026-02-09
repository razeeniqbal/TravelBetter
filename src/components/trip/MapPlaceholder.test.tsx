import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
  MapMarker: ({
    children,
    onClick,
  }: {
    children?: ReactNode;
    onClick?: () => void;
  }) => (
    <button data-testid="marker" type="button" onClick={onClick}>
      {children}
    </button>
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
  const places: Place[] = [
    {
      id: 'place-1',
      name: 'Raw Place Name',
      displayName: 'Canonical Place Name',
      category: 'culture',
      source: 'user',
      coordinates: { lat: 1.23, lng: 4.56 },
    },
    {
      id: 'place-2',
      name: 'Second Stop',
      displayName: 'Second Stop Canonical',
      category: 'food',
      source: 'ai',
      coordinates: { lat: 1.25, lng: 4.58 },
    },
  ];

  it('renders marker tooltips with canonical display names', () => {
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

  it('notifies selected place when marker is clicked', () => {
    const onMarkerClick = vi.fn();

    render(
      <MapPlaceholder
        destination="Hatyai"
        places={places}
        placesCount={places.length}
        showOverlays={false}
        onMarkerClick={onMarkerClick}
      />
    );

    const markers = screen.getAllByTestId('marker');
    fireEvent.click(markers[0]);

    expect(onMarkerClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'place-1' }));
  });

  it('keeps callback stable during rapid marker taps', () => {
    const onMarkerClick = vi.fn();

    render(
      <MapPlaceholder
        destination="Hatyai"
        places={places}
        placesCount={places.length}
        showOverlays={false}
        onMarkerClick={onMarkerClick}
      />
    );

    const markers = screen.getAllByTestId('marker');
    fireEvent.click(markers[0]);
    fireEvent.click(markers[1]);

    expect(onMarkerClick).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: 'place-1' }));
    expect(onMarkerClick).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: 'place-2' }));
  });
});
