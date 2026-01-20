import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Sparkles, BookOpen, MapPin, Minus, Plus } from 'lucide-react';
import { usePromptBuilder } from '@/hooks/usePromptBuilder';
import { QuickSelectPills } from './QuickSelectPills';
import { PromptTextArea } from './PromptTextArea';
import { PromptPreview } from './PromptPreview';
import { ExamplePrompts } from './ExamplePrompts';
import { AISuggestionsList, AISuggestion } from './AISuggestionsList';
import { api } from '@/lib/api';
import { toast } from 'sonner';

type ChatStep = 'customize' | 'preview' | 'loading' | 'suggestions';

interface PersonalizationChatInterfaceProps {
  destination: string;
  importedPlaces: string[];
  duration: number;
  onBack: () => void;
  onComplete: (selectedPlaces: AISuggestion[], days: number, resolvedDestination?: string) => void;
  onSkip: (days: number) => void;
}

export function PersonalizationChatInterface({
  destination,
  importedPlaces,
  duration,
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
  } = usePromptBuilder(destination, importedPlaces);

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

    try {
      const { data, error } = await api.generateAISuggestions({
        destination,
        userPrompt: displayPrompt,
        quickSelections: state.quickSelections,
        importedPlaces: importedPlaces,
        duration: tripDays,
        existingPlaces: importedPlaces.map(name => ({ name })),
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
      toast.error('Failed to get suggestions. Please try again.');
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
    onComplete(selectedPlaces, tripDays, resolvedDestination);
  };

  const handleSkip = () => {
    onSkip(tripDays);
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
        {/* Imported Places Summary */}
        {importedPlaces.length > 0 && chatStep !== 'suggestions' && (
          <Card className="p-3 bg-secondary/30 border-secondary">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-secondary-foreground" />
              <span className="text-sm text-secondary-foreground">
                {importedPlaces.length} place{importedPlaces.length > 1 ? 's' : ''} already added
              </span>
            </div>
          </Card>
        )}

        {/* Customize Step */}
        {chatStep === 'customize' && (
          <>
            {/* Days Input */}
            <Card className="p-4 border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-foreground">How many days?</h3>
                  <p className="text-xs text-muted-foreground">Set your trip duration</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8 rounded-full"
                    onClick={() => setTripDays(Math.max(1, tripDays - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input 
                    type="number" 
                    value={tripDays} 
                    onChange={(e) => setTripDays(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                    className="w-16 text-center h-8"
                    min={1}
                    max={30}
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8 rounded-full"
                    onClick={() => setTripDays(Math.min(30, tripDays + 1))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>

            <QuickSelectPills
              selectedPurposes={state.quickSelections.purposes}
              selectedTravelers={state.quickSelections.travelers}
              selectedBudget={state.quickSelections.budget}
              selectedPace={state.quickSelections.pace}
              onTogglePurpose={togglePurpose}
              onSetTravelers={setTravelers}
              onSetBudget={setBudget}
              onSetPace={setPace}
            />

            <PromptTextArea
              value={displayPrompt}
              onChange={setCustomPrompt}
              isEdited={state.isEdited}
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
            importedPlaces={importedPlaces}
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
