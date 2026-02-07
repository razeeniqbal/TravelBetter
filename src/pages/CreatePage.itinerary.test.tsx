import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import CreatePage from './CreatePage';
import { durationCommaSample, multiDaySample } from '@/test/fixtures/itinerarySamples';
import { mockFetchOnce, resetFetchMock } from '@/test/utils/mockFetch';

const createTripMutateMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useUserTrips', () => ({
  useCreateTripWithPlaces: () => ({ mutate: createTripMutateMock }),
}));

vi.mock('@/lib/resolvePlaces', () => ({
  resolvePlacesForTrip: vi.fn(async (places) => places),
}));

vi.mock('@/components/trip/AddToItineraryDialog', () => ({
  AddToItineraryDialog: ({
    open,
    placementAssignments,
    onConfirmPlacements,
  }: {
    open: boolean;
    placementAssignments?: Array<{ suggestionId: string; proposedDayNumber: number }>;
    onConfirmPlacements?: (placements: Array<{ suggestionId: string; confirmedDayNumber: number }>) => void;
  }) => {
    if (!open) return null;

    return (
      <div>
        <p>Confirm Day Assignments</p>
        <button
          type="button"
          onClick={() => {
            onConfirmPlacements?.(
              (placementAssignments || []).map((assignment) => ({
                suggestionId: assignment.suggestionId,
                confirmedDayNumber: assignment.proposedDayNumber,
              }))
            );
          }}
        >
          Confirm assignments
        </button>
      </div>
    );
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

beforeEach(() => {
  createTripMutateMock.mockReset();
  resetFetchMock();
});

function renderCreatePage() {
  const queryClient = new QueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CreatePage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

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

    renderCreatePage();

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

    renderCreatePage();

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

  it('sends duration days for duration-based comma lists', async () => {
    mockFetchOnce({
      json: {
        places: [],
        destination: 'Kuala Lumpur',
        cleanedRequest: 'Places from my itinerary:',
        previewText: 'Places from my itinerary:',
        days: [],
        success: true,
      },
    });

    renderCreatePage();

    fireEvent.change(screen.getByPlaceholderText(/tell me more about your trip/i), {
      target: { value: durationCommaSample },
    });

    fireEvent.click(screen.getByRole('button', { name: /generate itinerary/i }));

    await screen.findByRole('button', { name: /preview/i });

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const [, request] = fetchMock.mock.calls[0];
    const payload = JSON.parse(request.body as string) as Record<string, unknown>;

    expect(payload.duration_days).toBe(2);
  });

  it('renders canonical place names in the preview', async () => {
    mockFetchOnce({
      json: {
        places: [
          {
            name: 'klcc',
            displayName: 'Kuala Lumpur City Centre (KLCC)',
            placeId: 'place-klcc',
            category: 'attraction',
          },
        ],
        destination: 'Kuala Lumpur',
        cleanedRequest: 'Places from my itinerary:\n- Kuala Lumpur City Centre (KLCC)',
        previewText: 'Places from my itinerary:\n- Kuala Lumpur City Centre (KLCC)',
        days: [
          {
            label: 'Day 1',
            places: [{ name: 'Kuala Lumpur City Centre (KLCC)', source: 'user' }],
          },
        ],
        success: true,
      },
    });

    renderCreatePage();

    fireEvent.change(screen.getByPlaceholderText(/tell me more about your trip/i), {
      target: { value: '2 days in klcc, trx' },
    });

    fireEvent.click(screen.getByRole('button', { name: /generate itinerary/i }));

    const previewButton = await screen.findByRole('button', { name: /preview/i });
    fireEvent.click(previewButton);

    expect(await screen.findByText('Kuala Lumpur City Centre (KLCC)')).toBeInTheDocument();
  });

  it('confirms manual and ai placement assignments before trip generation', async () => {
    mockFetchOnce({
      json: {
        suggestions: [
          {
            suggestionId: 'sug-1',
            name: 'Senso-ji Temple',
            category: 'culture',
            description: 'Historic temple district',
            confidence: 91,
            reason: 'Matches first-time cultural highlights',
          },
          {
            suggestionId: 'sug-2',
            name: 'Shibuya Crossing',
            category: 'night',
            description: 'Iconic city crossing',
            confidence: 82,
            reason: 'Great evening city atmosphere',
          },
        ],
        resolvedDestination: 'Tokyo',
        success: true,
      },
    });

    mockFetchOnce({
      json: {
        mode: 'manual',
        placements: [
          {
            suggestionId: 'sug-1',
            displayName: 'Senso-ji Temple',
            proposedDayNumber: 2,
            confidence: 'high',
          },
        ],
      },
    });

    mockFetchOnce({
      json: {
        mode: 'ai',
        placements: [
          {
            suggestionId: 'sug-2',
            displayName: 'Shibuya Crossing',
            proposedDayNumber: 1,
            confidence: 'medium',
          },
        ],
      },
    });

    mockFetchOnce({
      json: {
        tripId: 'trip-preview',
        addedCount: 2,
        affectedDays: [1, 2],
      },
    });

    renderCreatePage();

    fireEvent.change(screen.getByPlaceholderText(/tell me more about your trip/i), {
      target: { value: 'Tokyo weekend food and culture trip' },
    });

    fireEvent.click(screen.getByRole('button', { name: /generate itinerary/i }));
    fireEvent.click(await screen.findByRole('button', { name: /preview/i }));
    fireEvent.click(await screen.findByRole('button', { name: /get ideas/i }));

    fireEvent.click(await screen.findByRole('button', { name: /select senso-ji temple/i }));
    fireEvent.click(screen.getByRole('button', { name: /select shibuya crossing/i }));
    fireEvent.click(screen.getByRole('button', { name: /choose placement for 2 suggestions/i }));

    const manualButtons = await screen.findAllByRole('button', { name: /manual day/i });
    const aiButtons = screen.getAllByRole('button', { name: /ai-assisted/i });
    fireEvent.click(manualButtons[0]);
    fireEvent.click(aiButtons[1]);

    const manualDayInput = screen.getByRole('spinbutton');
    fireEvent.change(manualDayInput, { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    fireEvent.click(await screen.findByRole('button', { name: /confirm assignments/i }));

    await waitFor(() => {
      expect(createTripMutateMock).toHaveBeenCalled();
    });

    const createPayload = createTripMutateMock.mock.calls[0][0] as {
      places: Array<{ name: string; dayIndex?: number; source: string }>;
    };

    expect(createPayload.places).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'Senso-ji Temple',
        dayIndex: 2,
        source: 'ai',
      }),
      expect.objectContaining({
        name: 'Shibuya Crossing',
        dayIndex: 1,
        source: 'ai',
      }),
    ]));

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const commitCall = fetchMock.mock.calls.find(call => String(call[0]).includes('suggestion-placement-commit'));
    expect(commitCall).toBeDefined();

    const commitPayload = JSON.parse(commitCall?.[1]?.body as string) as {
      placements: Array<{ suggestionId: string; confirmedDayNumber: number }>;
    };
    expect(commitPayload.placements).toEqual(expect.arrayContaining([
      { suggestionId: 'sug-1', confirmedDayNumber: 2 },
      { suggestionId: 'sug-2', confirmedDayNumber: 1 },
    ]));
  });

  it('supports multi-image OCR review edit and submit flow', async () => {
    mockFetchOnce({
      json: {
        batchId: 'ocr-batch-1',
        status: 'ready',
        processedCount: 2,
        failedCount: 0,
        items: [
          { filename: 'shot-1.png', status: 'processed', extractedText: 'Day 1\nSenso-ji Temple' },
          { filename: 'shot-2.png', status: 'processed', extractedText: 'Day 2\nShibuya Crossing' },
        ],
        mergedText: 'Day 1\nSenso-ji Temple\n\nDay 2\nShibuya Crossing',
        warnings: [],
      },
    });

    mockFetchOnce({
      json: {
        cleanedRequest: "I'm planning a trip to Tokyo.\n\nPlaces from my itinerary:\nDay 1\n- Senso-ji Temple\nDay 2\n- Shibuya Crossing",
        previewText: "I'm planning a trip to Tokyo.\n\nPlaces from my itinerary:\nDay 1\n- Senso-ji Temple\nDay 2\n- Shibuya Crossing",
        destination: 'Tokyo',
        days: [
          { label: 'Day 1', places: [{ name: 'Senso-ji Temple', source: 'user' }] },
          { label: 'Day 2', places: [{ name: 'Shibuya Crossing', source: 'user' }] },
        ],
        warnings: ['DUPLICATE_PLACE_NAMES'],
        success: true,
      },
    });

    renderCreatePage();

    fireEvent.change(screen.getByPlaceholderText(/tell me more about your trip/i), {
      target: { value: 'Tokyo screenshot import' },
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    const fileOne = new File(['fake-one'], 'shot-1.png', { type: 'image/png' });
    const fileTwo = new File(['fake-two'], 'shot-2.png', { type: 'image/png' });

    fireEvent.change(fileInput, {
      target: {
        files: [fileOne, fileTwo],
      },
    });

    const extractedTextArea = await screen.findByDisplayValue(/senso-ji temple/i);
    fireEvent.change(extractedTextArea, {
      target: { value: 'Day 1\nSenso-ji Temple\nDay 2\nShibuya Crossing\nMaybe TeamLab?' },
    });

    fireEvent.click(screen.getByRole('button', { name: /get ideas/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument();
    });

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const submitCall = fetchMock.mock.calls.find(call => String(call[0]).includes('screenshot-submit'));
    expect(submitCall).toBeDefined();

    const submitPayload = JSON.parse(submitCall?.[1]?.body as string) as { text: string; batchId: string };
    expect(submitPayload.batchId).toBe('ocr-batch-1');
    expect(submitPayload.text).toContain('Maybe TeamLab?');
  });

  it('shows OCR recovery dialog and supports manual text fallback', async () => {
    mockFetchOnce({
      json: {
        batchId: 'ocr-batch-failed',
        status: 'failed',
        processedCount: 0,
        failedCount: 1,
        items: [{ filename: 'shot-1.png', status: 'failed', error: 'No text detected' }],
        mergedText: '',
        warnings: ['1 image(s) failed OCR extraction'],
      },
    });

    renderCreatePage();

    fireEvent.change(screen.getByPlaceholderText(/tell me more about your trip/i), {
      target: { value: 'Tokyo screenshot import for manual fallback test' },
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: {
        files: [new File(['fake-one'], 'shot-1.png', { type: 'image/png' })],
      },
    });

    expect(await screen.findByText(/could not extract enough text/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /manual text/i }));

    expect(await screen.findByText(/travelbetter ai/i)).toBeInTheDocument();
  });
});
