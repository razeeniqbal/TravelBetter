import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import CreatePage from './CreatePage';
import { multiDaySample } from '@/test/fixtures/itinerarySamples';
import { mockFetchOnce } from '@/test/utils/mockFetch';

vi.mock('@/hooks/useUserTrips', () => ({
  useCreateTripWithPlaces: () => ({ mutate: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

describe('CreatePage itinerary preview', () => {
  it('shows day-grouped preview after text import', async () => {
    mockFetchOnce({
      json: {
        places: [{ name: 'Breakfast: Pastel de Belem', category: 'attraction' }],
        destination: 'Lisbon',
        cleanedRequest: 'Places from my itinerary:\n- Breakfast: Pastel de Belem',
        previewText: 'Places from my itinerary:\n- Breakfast: Pastel de Belem',
        days: [
          { label: 'DAY 1 6/8 WED', places: [{ name: 'Breakfast: Pastel de Belem', source: 'user' }] },
          { label: 'DAY 2 - Thu', places: [{ name: 'LX Factory', source: 'user' }] },
        ],
        success: true,
      },
    });

    render(
      <MemoryRouter>
        <CreatePage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/tell me more about your trip/i), {
      target: { value: multiDaySample },
    });

    fireEvent.click(screen.getByRole('button', { name: /generate itinerary/i }));

    const previewButton = await screen.findByRole('button', { name: /preview/i });
    fireEvent.click(previewButton);

    expect(await screen.findByText('DAY 1 6/8 WED')).toBeInTheDocument();
    expect(screen.getByText('Breakfast: Pastel de Belem')).toBeInTheDocument();
    expect(screen.getByText('DAY 2 - Thu')).toBeInTheDocument();
    expect(screen.getByText('LX Factory')).toBeInTheDocument();
  });

  it('shows comma-separated places as separate preview bullets', async () => {
    mockFetchOnce({
      json: {
        places: [
          { name: 'Neo Grand Hatyai', category: 'attraction' },
          { name: 'Krua Pa Yad 叫菜吃饭', category: 'restaurant' },
          { name: 'thefellows.hdy café', category: 'cafe' },
          { name: 'Mookata Paeyim晚餐', category: 'restaurant' },
          { name: 'Greeway Night Market 逛夜市', category: 'market' },
        ],
        destination: 'Hatyai',
        cleanedRequest: 'Places from my itinerary:\n- Neo Grand Hatyai\n- Krua Pa Yad 叫菜吃饭\n- thefellows.hdy café\n- Mookata Paeyim晚餐\n- Greeway Night Market 逛夜市',
        previewText: 'Places from my itinerary:\n- Neo Grand Hatyai\n- Krua Pa Yad 叫菜吃饭\n- thefellows.hdy café\n- Mookata Paeyim晚餐\n- Greeway Night Market 逛夜市',
        days: [
          {
            label: 'Day 1',
            places: [
              { name: 'Neo Grand Hatyai', source: 'user' },
              { name: 'Krua Pa Yad 叫菜吃饭', source: 'user' },
              { name: 'thefellows.hdy café', source: 'user' },
              { name: 'Mookata Paeyim晚餐', source: 'user' },
              { name: 'Greeway Night Market 逛夜市', source: 'user' },
            ],
          },
        ],
        success: true,
      },
    });

    render(
      <MemoryRouter>
        <CreatePage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/tell me more about your trip/i), {
      target: { value: 'Hatyai weekend itinerary' },
    });

    fireEvent.click(screen.getByRole('button', { name: /generate itinerary/i }));

    const previewButton = await screen.findByRole('button', { name: /preview/i });
    fireEvent.click(previewButton);

    expect(await screen.findByText('Neo Grand Hatyai')).toBeInTheDocument();
    expect(screen.getByText('Krua Pa Yad 叫菜吃饭')).toBeInTheDocument();
    expect(screen.getByText('thefellows.hdy café')).toBeInTheDocument();
    expect(screen.getByText('Mookata Paeyim晚餐')).toBeInTheDocument();
    expect(screen.getByText('Greeway Night Market 逛夜市')).toBeInTheDocument();
  });
});
