import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlaceCard } from './PlaceCard';
import type { Place } from '@/types/trip';

describe('PlaceCard', () => {
  it('renders standardized fields and map action', () => {
    const onViewMap = vi.fn();
    const place: Place = {
      id: 'place-1',
      name: 'KLCC Park',
      category: 'nature',
      source: 'ai',
      rating: 4.7,
      tags: ['landmark', 'sunset'],
    };

    render(<PlaceCard place={place} index={1} onViewMap={onViewMap} />);

    expect(screen.getByText('KLCC Park')).toBeInTheDocument();
    expect(screen.getByText('4.7')).toBeInTheDocument();
    expect(screen.getByText('AI Suggested')).toBeInTheDocument();
    expect(screen.getByText('#landmark')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /view on map/i }));
    expect(onViewMap).toHaveBeenCalledWith(expect.objectContaining({ id: 'place-1' }));
  });

  it('shows fallback labels when optional data is unavailable', () => {
    const place: Place = {
      id: 'place-2',
      name: 'Unknown Stop',
      category: 'culture',
      source: 'user',
    };

    render(<PlaceCard place={place} />);

    expect(screen.getByText('Rating unavailable')).toBeInTheDocument();
    expect(screen.getByText('No tags')).toBeInTheDocument();
    expect(screen.getByText('Imported')).toBeInTheDocument();
  });
});
