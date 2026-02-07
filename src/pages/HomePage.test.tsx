import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import HomePage from './HomePage';

vi.mock('@/components/navigation/BottomNav', () => ({
  BottomNav: () => null,
}));

vi.mock('@/components/home/SearchBar', () => ({
  SearchBar: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <input aria-label="Search" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));

vi.mock('@/hooks/useSavedTrips', () => ({
  useSavedTrips: () => ({ data: [] }),
  useToggleSaveTrip: () => ({ mutate: vi.fn() }),
}));

vi.mock('@/hooks/useRemixTrip', () => ({
  useRemixTrip: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/usePublicTrips', () => ({
  useFeaturedTrips: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('HomePage', () => {
  it('hides removed discovery sections and keeps trip feed', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.queryByText('Trending Destinations')).not.toBeInTheDocument();
    expect(screen.queryByText('Countries & City')).not.toBeInTheDocument();
    expect(screen.getByText('Visualize Influencer Routes')).toBeInTheDocument();
  });
});
