import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, BookOpen } from 'lucide-react';
import { usePromptBuilder } from '@/hooks/usePromptBuilder';
import { QuickSelectPills } from './QuickSelectPills';
import { PromptTextArea } from './PromptTextArea';
import { PromptPreview } from './PromptPreview';
import { ExamplePrompts } from './ExamplePrompts';
import { AISuggestionsList, AISuggestion } from './AISuggestionsList';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { ParsedDayGroup } from '@/types/itinerary';
import {
  AddPlacesOptionsDialog,
  type PlacementModeDecision,
} from '@/components/trip/AddPlacesOptionsDialog';
import {
  AddToItineraryDialog,
  type PlacementAssignment,
} from '@/components/trip/AddToItineraryDialog';

type ChatStep = 'customize' | 'preview' | 'loading' | 'suggestions';

const COMMA_SEPARATOR_REGEX = /[，,]/;

function splitCommaCandidates(value: string) {
  return value
    .split(COMMA_SEPARATOR_REGEX)
    .map(segment => segment.trim())
    .filter(Boolean);
}

export function parsePlacesFromPrompt(prompt: string, fallback: string[]): string[] {
  const lines = prompt.split(/\r?\n/).map(line => line.trim());
  const extracted: string[] = [];
  const seen = new Set<string>();
  const headerIndex = lines.findIndex(line => /places from my itinerary/i.test(line));

  const pushPlace = (value: string) => {
    const cleaned = value.replace(/^[-*•]\s*/, '').trim();
    if (!cleaned) return;

    const segments = splitCommaCandidates(cleaned);
    const candidates = segments.length > 1 ? segments : [cleaned];

    for (const candidate of candidates) {
      const key = candidate.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      extracted.push(candidate);
    }
  };

  if (headerIndex >= 0) {
    for (let i = headerIndex + 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line) {
        if (extracted.length > 0) break;
        continue;
      }
      pushPlace(line);
    }
  }

  if (extracted.length === 0) {
    for (const line of lines) {
      if (/^[-*•]\s+/.test(line)) {
        pushPlace(line);
      }
    }
  }

  if (extracted.length === 1 && COMMA_SEPARATOR_REGEX.test(extracted[0])) {
    const split = splitCommaCandidates(extracted[0]);
    if (split.length > 1) {
      const deduped: string[] = [];
      const splitSeen = new Set<string>();
      for (const item of split) {
        const key = item.toLowerCase();
        if (splitSeen.has(key)) continue;
        splitSeen.add(key);
        deduped.push(item);
      }
      return deduped;
    }
    if (fallback.length > extracted.length) {
      return fallback;
    }
  }

  return extracted.length > 0 ? extracted : fallback;
}

function buildSuggestionId(suggestion: AISuggestion, index: number): string {
  if (suggestion.suggestionId && suggestion.suggestionId.trim()) {
    return suggestion.suggestionId;
  }

  return `suggestion-${index}-${suggestion.name.toLowerCase().replace(/\s+/g, '-')}`;
}

interface PersonalizationChatInterfaceProps {
  destination: string;
  seedPlaces: string[];
  duration: number;
  rawItineraryText: string;
  parsedRequest?: string;
  parsedPreview?: string;
  parsedDayGroups?: ParsedDayGroup[];
  onBack: () => void;
  onComplete: (selectedPlaces: AISuggestion[], days: number, resolvedDestination: string | undefined, userPlaces: string[]) => void;
  onSkip: (days: number, userPlaces: string[]) => void;
}

export function PersonalizationChatInterface({
  destination,
  seedPlaces,
  duration,
  rawItineraryText,
  parsedRequest,
  parsedPreview,
  parsedDayGroups,
  onBack,
  onComplete,
  onSkip,
}: PersonalizationChatInterfaceProps) {
  const loadingStages = [
    'Understanding destination context',
    'Structuring day-by-day timeline',
    'Finalizing personalized suggestions',
  ];
  const [chatStep, setChatStep] = useState<ChatStep>('customize');
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [resolvedDestination, setResolvedDestination] = useState<string>();
  const [processingTime, setProcessingTime] = useState<number>();
  const [tripDays, setTripDays] = useState(duration || 3);
  const [finalizedPlaces, setFinalizedPlaces] = useState<string[]>([]);
  const [autoFilledPrompt, setAutoFilledPrompt] = useState(false);
  const [placementDialogOpen, setPlacementDialogOpen] = useState(false);
  const [placementConfirmOpen, setPlacementConfirmOpen] = useState(false);
  const [pendingPlacementSuggestions, setPendingPlacementSuggestions] = useState<AISuggestion[]>([]);
  const [placementAssignments, setPlacementAssignments] = useState<PlacementAssignment[]>([]);
  const [isResolvingPlacements, setIsResolvingPlacements] = useState(false);
  const [loadingStageIndex, setLoadingStageIndex] = useState(0);

  const {
    state,
    displayPrompt,
    isValid,
    charCount,
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
  } = usePromptBuilder(destination, seedPlaces, rawItineraryText);

  useEffect(() => {
    setDestination(destination);
  }, [destination, setDestination]);

  useEffect(() => {
    setSeedPlaces(seedPlaces);
  }, [seedPlaces, setSeedPlaces]);

  useEffect(() => {
    setItineraryText(rawItineraryText);
  }, [rawItineraryText, setItineraryText]);

  useEffect(() => {
    const trimmed = parsedRequest?.trim();
    if (!trimmed) return;
    setCustomPrompt(trimmed);
    setAutoFilledPrompt(true);
  }, [parsedRequest, setCustomPrompt]);

  useEffect(() => {
    if (chatStep !== 'loading') {
      setLoadingStageIndex(0);
      return;
    }

    setLoadingStageIndex(0);
    const timers = [
      window.setTimeout(() => setLoadingStageIndex(1), 1200),
      window.setTimeout(() => setLoadingStageIndex(2), 2400),
    ];

    return () => {
      timers.forEach(timer => window.clearTimeout(timer));
    };
  }, [chatStep]);


  const handleGetSuggestions = async () => {
    if (!isValid) {
      toast.error('Please add more details to your request');
      return;
    }

    // Allow any destination input - AI will interpret it
    if (!destination || !destination.trim()) {
      toast.error('Please describe your trip destination');
      return;
    }

    setChatStep('loading');
    const startTime = Date.now();
    const parsedPlaces = parsePlacesFromPrompt(displayPrompt, seedPlaces);
    setFinalizedPlaces(parsedPlaces);

    try {
      const { data, error } = await api.generateAISuggestions({
        destination,
        userPrompt: displayPrompt,
        cleanedRequest: parsedRequest || displayPrompt,
        dayGroups: parsedDayGroups,
        quickSelections: state.quickSelections as unknown as Record<string, unknown>,
        importedPlaces: parsedPlaces,
        duration: tripDays,
        existingPlaces: parsedPlaces.map(name => ({ name })),
        preferences: {
          purposes: state.quickSelections.purposes,
          travelers: state.quickSelections.travelers,
          budget: state.quickSelections.budget,
          pace: state.quickSelections.pace,
        },
        travelStyle: state.quickSelections.purposes,
      });

      if (error) throw error;

      const endTime = Date.now();
      setProcessingTime(endTime - startTime);

      if (data?.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions.map((s: AISuggestion, index: number) => ({
          ...s,
          suggestionId: buildSuggestionId(s, index),
        })));
        // Store the AI-resolved destination for use when creating the trip
        if (data.resolvedDestination) {
          setResolvedDestination(data.resolvedDestination);
        }
        setChatStep('suggestions');
      } else {
        toast.info('No suggestions found. Try adjusting your preferences.');
        setChatStep('customize');
      }
    } catch (error) {
      console.error('Error getting suggestions:', error);
      const message = error instanceof Error
        ? error.message
        : 'Failed to get suggestions. Please try again.';
      toast.error(message);
      setChatStep('customize');
    }
  };

  const handleContinue = (selectedSuggestions: AISuggestion[]) => {
    const parsedPlaces = finalizedPlaces.length > 0
      ? finalizedPlaces
      : parsePlacesFromPrompt(displayPrompt, seedPlaces);

    if (selectedSuggestions.length === 0) {
      onComplete([], tripDays, resolvedDestination, parsedPlaces);
      return;
    }

    setPendingPlacementSuggestions(selectedSuggestions);
    setPlacementDialogOpen(true);
  };

  const handlePlacementModeConfirm = async (decisions: PlacementModeDecision[]) => {
    setPlacementDialogOpen(false);
    setIsResolvingPlacements(true);

    try {
      const manual = decisions.filter(item => item.mode === 'manual');
      const ai = decisions.filter(item => item.mode === 'ai');
      const assignments: PlacementAssignment[] = [];

      if (manual.length > 0) {
        const { data, error } = await api.previewSuggestionPlacement('trip-preview', {
          mode: 'manual',
          selectedSuggestions: manual.map(item => ({
            suggestionId: item.suggestionId,
            displayName: item.displayName,
            manualDayNumber: item.manualDayNumber || 1,
          })),
          destinationContext: destination,
        });

        if (error || !data) {
          throw error || new Error('Failed to preview manual placement');
        }

        data.placements.forEach((placement) => {
          assignments.push({
            suggestionId: placement.suggestionId,
            displayName: placement.displayName,
            mode: 'manual',
            proposedDayNumber: placement.proposedDayNumber,
            confidence: placement.confidence,
          });
        });
      }

      if (ai.length > 0) {
        const { data, error } = await api.previewSuggestionPlacement('trip-preview', {
          mode: 'ai',
          selectedSuggestions: ai.map(item => ({
            suggestionId: item.suggestionId,
            displayName: item.displayName,
          })),
          destinationContext: destination,
        });

        if (error || !data) {
          throw error || new Error('Failed to preview AI-assisted placement');
        }

        data.placements.forEach((placement) => {
          assignments.push({
            suggestionId: placement.suggestionId,
            displayName: placement.displayName,
            mode: 'ai',
            proposedDayNumber: placement.proposedDayNumber,
            confidence: placement.confidence,
          });
        });
      }

      const assignmentsBySuggestionId = new Map(assignments.map(item => [item.suggestionId, item]));
      const normalizedAssignments = decisions.map((decision) => {
        const preview = assignmentsBySuggestionId.get(decision.suggestionId);
        if (preview) return preview;

        return {
          suggestionId: decision.suggestionId,
          displayName: decision.displayName,
          mode: decision.mode,
          proposedDayNumber: decision.manualDayNumber || 1,
          confidence: decision.mode === 'manual' ? 'high' : 'medium',
        } as PlacementAssignment;
      });

      setPlacementAssignments(normalizedAssignments);
      setPlacementConfirmOpen(true);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Unable to prepare placement confirmation';
      toast.error(message);
    } finally {
      setIsResolvingPlacements(false);
    }
  };

  const handleConfirmPlacements = async (
    placements: Array<{ suggestionId: string; confirmedDayNumber: number }>
  ) => {
    const parsedPlaces = finalizedPlaces.length > 0
      ? finalizedPlaces
      : parsePlacesFromPrompt(displayPrompt, seedPlaces);

    setIsResolvingPlacements(true);

    try {
      const { error } = await api.commitSuggestionPlacement('trip-preview', { placements });
      if (error) throw error;

      const confirmedDayBySuggestionId = new Map(
        placements.map(item => [item.suggestionId, item.confirmedDayNumber])
      );

      const selectedPlaces = pendingPlacementSuggestions.map((suggestion) => ({
        ...suggestion,
        confirmedDayNumber: confirmedDayBySuggestionId.get(suggestion.suggestionId || '') || 1,
      }));

      setPlacementConfirmOpen(false);
      setPlacementAssignments([]);
      setPendingPlacementSuggestions([]);

      onComplete(selectedPlaces, tripDays, resolvedDestination, parsedPlaces);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save placement assignments';
      toast.error(message);
    } finally {
      setIsResolvingPlacements(false);
    }
  };

  const handleSkip = () => {
    const parsedPlaces = parsePlacesFromPrompt(displayPrompt, seedPlaces);
    setFinalizedPlaces(parsedPlaces);
    onSkip(tripDays, parsedPlaces);
  };

  const handlePromptChange = (value: string) => {
    if (autoFilledPrompt) {
      setAutoFilledPrompt(false);
    }
    setCustomPrompt(value);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={chatStep === 'suggestions' ? () => setChatStep('customize') : onBack}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-foreground">TravelBetter AI</h1>
              <p className="text-xs text-muted-foreground">
                {destination ? `Planning ${destination}` : 'Personalize your trip'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExamplesOpen(true)}
            className="text-muted-foreground"
          >
            <BookOpen className="h-4 w-4 mr-1" />
            Examples
          </Button>
        </div>
      </header>

      <div className="p-4 pb-24 space-y-6">
        {/* Customize Step */}
        {chatStep === 'customize' && (
          <>
            <QuickSelectPills
              selectedPurposes={state.quickSelections.purposes}
              selectedTravelers={state.quickSelections.travelers}
              selectedBudget={state.quickSelections.budget}
              selectedPace={state.quickSelections.pace}
              tripDays={tripDays}
              onTogglePurpose={togglePurpose}
              onSetTravelers={setTravelers}
              onSetBudget={setBudget}
              onSetPace={setPace}
              onChangeDays={setTripDays}
            />

            <PromptTextArea
              value={displayPrompt}
              onChange={handlePromptChange}
              isEdited={state.isEdited}
              autoFilled={autoFilledPrompt}
              onReset={resetToGenerated}
              charCount={charCount}
              importStatusText={parsedPreview ? 'You can edit imported OCR text before generating ideas.' : undefined}
            />

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleSkip}
                className="flex-1"
              >
                Skip for now
              </Button>
              <Button
                onClick={() => setChatStep('preview')}
                disabled={!isValid}
                className="flex-1 gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Preview
              </Button>
            </div>
          </>
        )}

        {/* Preview Step */}
        {chatStep === 'preview' && (
          <PromptPreview
            prompt={displayPrompt}
            previewText={parsedPreview}
            importedPlaces={[]}
            dayGroups={parsedDayGroups}
            onEdit={() => setChatStep('customize')}
            onSubmit={handleGetSuggestions}
          />
        )}

        {/* Loading Step */}
        {chatStep === 'loading' && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-muted border-t-primary" />
              <Sparkles className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-primary" />
            </div>
            <p className="mt-6 text-lg font-medium text-foreground">
              Finding perfect places...
            </p>
            <p className="mt-2 text-sm text-muted-foreground animate-pulse">
              {loadingStages[loadingStageIndex]}
            </p>
          </div>
        )}

        {/* Suggestions Step */}
        {chatStep === 'suggestions' && (
          <AISuggestionsList
            suggestions={suggestions}
            processingTime={processingTime}
            requiredPlaces={finalizedPlaces}
            onContinue={handleContinue}
          />
        )}
      </div>

      {/* Example Prompts Modal */}
      <ExamplePrompts
        open={examplesOpen}
        onOpenChange={setExamplesOpen}
        onSelectTemplate={applyTemplate}
        destination={destination}
      />

      <AddPlacesOptionsDialog
        open={placementDialogOpen}
        onOpenChange={setPlacementDialogOpen}
        suggestions={pendingPlacementSuggestions.map((suggestion) => ({
          suggestionId: suggestion.suggestionId || suggestion.name,
          displayName: suggestion.name,
        }))}
        totalDays={tripDays}
        onConfirmPlacementModes={handlePlacementModeConfirm}
      />

      <AddToItineraryDialog
        open={placementConfirmOpen}
        onOpenChange={setPlacementConfirmOpen}
        placementAssignments={placementAssignments}
        totalDays={tripDays}
        isConfirmingPlacements={isResolvingPlacements}
        onConfirmPlacements={handleConfirmPlacements}
      />
    </div>
  );
}
