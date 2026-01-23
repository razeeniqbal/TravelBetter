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
  itineraryText: string;
  seedPlaces: string[];
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

export function usePromptBuilder(
  initialDestination: string = '',
  initialSeedPlaces: string[] = [],
  initialItineraryText: string = ''
) {
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
    itineraryText: initialItineraryText,
    seedPlaces: initialSeedPlaces,
  });

  const prePrompt = useMemo(() => {
    const { quickSelections, destination } = state;
    const parts: string[] = [];
    const hasTraveler = Boolean(quickSelections.travelers);
    const hasPurposes = quickSelections.purposes.length > 0;
    const hasBudget = Boolean(quickSelections.budget);
    const hasPace = Boolean(quickSelections.pace);

    // Traveler intro
    if (hasTraveler) {
      parts.push(`I'm traveling as ${TRAVELER_LABELS[quickSelections.travelers] || quickSelections.travelers}`);
    } else {
      parts.push("I'm planning a trip");
    }

    // Destination
    if (destination) {
      parts[parts.length - 1] += ` to ${destination}`;
    }

    // Purposes
    if (hasPurposes) {
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
    if (hasBudget) {
      modifiers.push(`a ${BUDGET_LABELS[quickSelections.budget] || quickSelections.budget} budget`);
    }
    if (hasPace) {
      modifiers.push(`a ${PACE_LABELS[quickSelections.pace] || quickSelections.pace} pace`);
    }
    if (modifiers.length > 0) {
      parts.push(`Looking for ${modifiers.join(' with ')}`);
    }

    if (hasTraveler || hasPurposes || hasBudget || hasPace) {
      parts.push('Suggest places that match my interests');
    }

    return parts.join('. ') + '.';
  }, [state]);

  const itineraryBlock = useMemo(() => {
    if (state.seedPlaces.length > 0) {
      const lines = state.seedPlaces.map(place => `- ${place}`);
      return ['Places from my itinerary:', ...lines].join('\n');
    }
    return state.itineraryText.trim();
  }, [state.seedPlaces, state.itineraryText]);

  const generatedPrompt = useMemo(() => {
    const sections: string[] = [];
    if (prePrompt.trim()) {
      sections.push(prePrompt);
    }
    if (itineraryBlock) {
      sections.push(itineraryBlock);
    }
    return sections.join('\n\n');
  }, [prePrompt, itineraryBlock]);

  const displayPrompt = useMemo(() => {
    return state.isEdited ? state.customText : generatedPrompt;
  }, [state.isEdited, state.customText, generatedPrompt]);

  const setDestination = useCallback((destination: string) => {
    setState(prev => ({ ...prev, destination }));
  }, []);

  const setSeedPlaces = useCallback((places: string[]) => {
    setState(prev => ({ ...prev, seedPlaces: places }));
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
    }));
  }, []);

  const setTravelers = useCallback((travelers: string) => {
    setState(prev => ({
      ...prev,
      quickSelections: { ...prev.quickSelections, travelers },
    }));
  }, []);

  const setBudget = useCallback((budget: string) => {
    setState(prev => ({
      ...prev,
      quickSelections: { ...prev.quickSelections, budget },
    }));
  }, []);

  const setPace = useCallback((pace: string) => {
    setState(prev => ({
      ...prev,
      quickSelections: { ...prev.quickSelections, pace },
    }));
  }, []);

  const setItineraryText = useCallback((itineraryText: string) => {
    setState(prev => ({ ...prev, itineraryText }));
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
    setSeedPlaces,
    setItineraryText,
  };
}
