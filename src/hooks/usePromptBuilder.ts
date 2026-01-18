import { useState, useCallback, useMemo } from 'react';

export interface QuickSelections {
  purposes: string[];
  travelers: string;
  budget: string;
  pace: string;
}

export interface PromptBuilderState {
  quickSelections: QuickSelections;
  customText: string;
  isEdited: boolean;
  destination: string;
  importedPlaces: string[];
}

const PURPOSE_LABELS: Record<string, string> = {
  food: 'exploring local food scenes',
  culture: 'visiting cultural attractions',
  nature: 'outdoor adventures',
  shop: 'shopping experiences',
  night: 'nightlife',
  photo: 'photography spots',
  active: 'active activities',
};

const TRAVELER_LABELS: Record<string, string> = {
  solo: 'a solo traveler',
  couple: 'a couple',
  family: 'a family',
  friends: 'a group of friends',
  group: 'a large group',
};

const BUDGET_LABELS: Record<string, string> = {
  budget: 'budget-friendly',
  moderate: 'mid-range',
  luxury: 'luxury',
};

const PACE_LABELS: Record<string, string> = {
  relaxed: 'relaxed',
  moderate: 'moderate',
  packed: 'action-packed',
};

export function usePromptBuilder(initialDestination: string = '', initialImportedPlaces: string[] = []) {
  const [state, setState] = useState<PromptBuilderState>({
    quickSelections: {
      purposes: [],
      travelers: '',
      budget: '',
      pace: '',
    },
    customText: '',
    isEdited: false,
    destination: initialDestination,
    importedPlaces: initialImportedPlaces,
  });

  const generatedPrompt = useMemo(() => {
    const { quickSelections, destination, importedPlaces } = state;
    const parts: string[] = [];

    // Traveler intro
    if (quickSelections.travelers) {
      parts.push(`I'm traveling as ${TRAVELER_LABELS[quickSelections.travelers] || quickSelections.travelers}`);
    } else {
      parts.push("I'm planning a trip");
    }

    // Destination
    if (destination) {
      parts[parts.length - 1] += ` to ${destination}`;
    }

    // Purposes
    if (quickSelections.purposes.length > 0) {
      const purposeTexts = quickSelections.purposes.map(p => PURPOSE_LABELS[p] || p);
      if (purposeTexts.length === 1) {
        parts.push(`I love ${purposeTexts[0]}`);
      } else {
        const lastPurpose = purposeTexts.pop();
        parts.push(`I love ${purposeTexts.join(', ')} and ${lastPurpose}`);
      }
    }

    // Budget and pace
    const modifiers: string[] = [];
    if (quickSelections.budget) {
      modifiers.push(`a ${BUDGET_LABELS[quickSelections.budget] || quickSelections.budget} budget`);
    }
    if (quickSelections.pace) {
      modifiers.push(`a ${PACE_LABELS[quickSelections.pace] || quickSelections.pace} pace`);
    }
    if (modifiers.length > 0) {
      parts.push(`Looking for ${modifiers.join(' with ')}`);
    }

    // Imported places context
    if (importedPlaces.length > 0) {
      parts.push(`Based on the places I've already added (${importedPlaces.slice(0, 3).join(', ')}${importedPlaces.length > 3 ? '...' : ''}), suggest more spots that match my interests`);
    } else {
      parts.push('Suggest places that match my interests');
    }

    return parts.join('. ') + '.';
  }, [state]);

  const displayPrompt = useMemo(() => {
    return state.isEdited ? state.customText : generatedPrompt;
  }, [state.isEdited, state.customText, generatedPrompt]);

  const setDestination = useCallback((destination: string) => {
    setState(prev => ({ ...prev, destination }));
  }, []);

  const setImportedPlaces = useCallback((places: string[]) => {
    setState(prev => ({ ...prev, importedPlaces: places }));
  }, []);

  const togglePurpose = useCallback((purpose: string) => {
    setState(prev => ({
      ...prev,
      quickSelections: {
        ...prev.quickSelections,
        purposes: prev.quickSelections.purposes.includes(purpose)
          ? prev.quickSelections.purposes.filter(p => p !== purpose)
          : [...prev.quickSelections.purposes, purpose],
      },
      isEdited: false, // Reset to auto-generated when pills change
    }));
  }, []);

  const setTravelers = useCallback((travelers: string) => {
    setState(prev => ({
      ...prev,
      quickSelections: { ...prev.quickSelections, travelers },
      isEdited: false,
    }));
  }, []);

  const setBudget = useCallback((budget: string) => {
    setState(prev => ({
      ...prev,
      quickSelections: { ...prev.quickSelections, budget },
      isEdited: false,
    }));
  }, []);

  const setPace = useCallback((pace: string) => {
    setState(prev => ({
      ...prev,
      quickSelections: { ...prev.quickSelections, pace },
      isEdited: false,
    }));
  }, []);

  const setCustomPrompt = useCallback((text: string) => {
    setState(prev => ({
      ...prev,
      customText: text,
      isEdited: true,
    }));
  }, []);

  const resetToGenerated = useCallback(() => {
    setState(prev => ({
      ...prev,
      isEdited: false,
      customText: '',
    }));
  }, []);

  const applyTemplate = useCallback((template: string) => {
    setState(prev => ({
      ...prev,
      customText: template,
      isEdited: true,
    }));
  }, []);

  return {
    state,
    displayPrompt,
    generatedPrompt,
    isValid: displayPrompt.length >= 20,
    charCount: displayPrompt.length,
    togglePurpose,
    setTravelers,
    setBudget,
    setPace,
    setCustomPrompt,
    resetToGenerated,
    applyTemplate,
    setDestination,
    setImportedPlaces,
  };
}
