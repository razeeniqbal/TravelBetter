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

type ChatStep = 'customize' | 'preview' | 'loading' | 'suggestions';

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
  const [chatStep, setChatStep] = useState<ChatStep>('customize');
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [promptInterpretation, setPromptInterpretation] = useState<string>();
  const [resolvedDestination, setResolvedDestination] = useState<string>();
  const [processingTime, setProcessingTime] = useState<number>();
  const [tripDays, setTripDays] = useState(duration || 3);
  const [finalizedPlaces, setFinalizedPlaces] = useState<string[]>([]);
  const [autoFilledPrompt, setAutoFilledPrompt] = useState(false);

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

  const parsePlacesFromPrompt = (prompt: string, fallback: string[]): string[] => {
    const lines = prompt.split(/\r?\n/).map(line => line.trim());
    const extracted: string[] = [];
    const seen = new Set<string>();
    const headerIndex = lines.findIndex(line => /places from my itinerary/i.test(line));

    const pushPlace = (value: string) => {
      const cleaned = value.replace(/^[-*•]\s*/, '').trim();
      if (!cleaned) return;
      const key = cleaned.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      extracted.push(cleaned);
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

    return extracted.length > 0 ? extracted : fallback;
  };

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
        setSuggestions(data.suggestions.map((s: AISuggestion) => ({
          ...s,
          accepted: false,
          rejected: false,
        })));
        setPromptInterpretation(data.promptInterpretation);
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

  const handleAccept = (index: number) => {
    setSuggestions(prev => 
      prev.map((s, i) => i === index ? { ...s, accepted: true, rejected: false } : s)
    );
  };

  const handleReject = (index: number) => {
    setSuggestions(prev => 
      prev.map((s, i) => i === index ? { ...s, rejected: true, accepted: false } : s)
    );
  };

  const handleAcceptAll = () => {
    setSuggestions(prev => 
      prev.map(s => s.rejected ? s : { ...s, accepted: true })
    );
  };

  const handleContinue = () => {
    const selectedPlaces = suggestions.filter(s => s.accepted);
    const parsedPlaces = finalizedPlaces.length > 0
      ? finalizedPlaces
      : parsePlacesFromPrompt(displayPrompt, seedPlaces);
    onComplete(selectedPlaces, tripDays, resolvedDestination, parsedPlaces);
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
              Analyzing your preferences
            </p>
          </div>
        )}

        {/* Suggestions Step */}
        {chatStep === 'suggestions' && (
          <AISuggestionsList
            suggestions={suggestions}
            promptInterpretation={promptInterpretation}
            processingTime={processingTime}
            requiredPlaces={finalizedPlaces}
            onAccept={handleAccept}
            onReject={handleReject}
            onAcceptAll={handleAcceptAll}
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
    </div>
  );
}
