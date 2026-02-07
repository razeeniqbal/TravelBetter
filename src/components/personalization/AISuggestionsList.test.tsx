import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AISuggestionsList, type AISuggestion } from './AISuggestionsList';

const suggestions: AISuggestion[] = [
  {
    suggestionId: 'sug-1',
    name: 'Petronas Twin Towers',
    category: 'culture',
    description: 'Iconic skyline landmark',
    confidence: 88,
    reason: 'Great skyline and city access',
  },
  {
    suggestionId: 'sug-2',
    name: 'Jalan Alor',
    category: 'food',
    description: 'Street food destination',
    confidence: 82,
    reason: 'Strong local food scene',
  },
];

describe('AISuggestionsList', () => {
  it('uses checklist selection controls and requires placement step before continue', () => {
    const onContinue = vi.fn();

    render(
      <AISuggestionsList
        suggestions={suggestions}
        onContinue={onContinue}
      />
    );

    const continueButton = screen.getByRole('button', { name: /continue with 0 places/i });
    expect(continueButton).toBeDisabled();
    expect(screen.queryByText(/accept all remaining/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /select petronas twin towers/i }));

    const placementButton = screen.getByRole('button', { name: /choose placement for 1 suggestion/i });
    fireEvent.click(placementButton);

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledWith([
      expect.objectContaining({
        suggestionId: 'sug-1',
        name: 'Petronas Twin Towers',
      }),
    ]);
  });

  it('allows continue with required imported places only', () => {
    const onContinue = vi.fn();

    render(
      <AISuggestionsList
        suggestions={suggestions}
        requiredPlaces={['KLCC Park']}
        onContinue={onContinue}
      />
    );

    const continueButton = screen.getByRole('button', { name: /continue with 1 place/i });
    expect(continueButton).toBeEnabled();

    fireEvent.click(continueButton);
    expect(onContinue).toHaveBeenCalledWith([]);
  });
});
