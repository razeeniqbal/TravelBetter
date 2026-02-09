import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DayPlaceSearchDialog } from './DayPlaceSearchDialog';

const placeSearchState = vi.hoisted(() => ({
  query: 'klcc',
  setQuery: vi.fn(),
  results: [
    {
      providerPlaceId: 'provider-place-1',
      displayName: 'Kuala Lumpur City Centre (KLCC)',
      secondaryText: 'Kuala Lumpur, Malaysia',
      formattedAddress: 'Kuala Lumpur, Malaysia',
      coordinates: { lat: 3.1579, lng: 101.7123 },
      categories: ['tourist_attraction'],
      mapsUri: 'https://maps.google.com/?cid=123',
    },
  ],
  status: 'success',
  errorMessage: null,
  isLoading: false,
  runSearch: vi.fn(),
  retry: vi.fn(),
  clearState: vi.fn(),
}));

vi.mock('@/hooks/usePlaceSearch', () => ({
  usePlaceSearch: () => placeSearchState,
}));

describe('DayPlaceSearchDialog', () => {
  beforeEach(() => {
    placeSearchState.setQuery.mockReset();
    placeSearchState.runSearch.mockReset();
    placeSearchState.retry.mockReset();
    placeSearchState.clearState.mockReset();
    placeSearchState.query = 'klcc';
    placeSearchState.status = 'success';
    placeSearchState.results = [
      {
        providerPlaceId: 'provider-place-1',
        displayName: 'Kuala Lumpur City Centre (KLCC)',
        secondaryText: 'Kuala Lumpur, Malaysia',
        formattedAddress: 'Kuala Lumpur, Malaysia',
        coordinates: { lat: 3.1579, lng: 101.7123 },
        categories: ['tourist_attraction'],
        mapsUri: 'https://maps.google.com/?cid=123',
      },
    ];
  });

  it('renders place results with secondary location context and supports selection', async () => {
    const onAddPlace = vi.fn();

    render(
      <DayPlaceSearchDialog
        open
        onOpenChange={vi.fn()}
        dayNumber={2}
        destination="Kuala Lumpur"
        onAddPlace={onAddPlace}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /kuala lumpur city centre/i }));
    expect(screen.getByText(/kuala lumpur, malaysia/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /add place/i }));
    expect(onAddPlace).toHaveBeenCalledWith(expect.objectContaining({
      providerPlaceId: 'provider-place-1',
      displayName: 'Kuala Lumpur City Centre (KLCC)',
    }));
  });

  it('shows no-results state and allows retry without adding', () => {
    const onAddPlace = vi.fn();
    placeSearchState.status = 'no_results';
    placeSearchState.results = [];

    render(
      <DayPlaceSearchDialog
        open
        onOpenChange={vi.fn()}
        dayNumber={1}
        destination="Kuala Lumpur"
        onAddPlace={onAddPlace}
      />
    );

    expect(screen.getByText(/no places found/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry search/i }));
    expect(placeSearchState.retry).toHaveBeenCalledTimes(1);
    expect(onAddPlace).not.toHaveBeenCalled();
  });
});
