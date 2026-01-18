import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Sparkles, BookOpen, MapPin } from 'lucide-react';
import { usePromptBuilder } from '@/hooks/usePromptBuilder';
import { QuickSelectPills } from './QuickSelectPills';
import { PromptTextArea } from './PromptTextArea';
import { PromptPreview } from './PromptPreview';
import { ExamplePrompts } from './ExamplePrompts';
import { AISuggestionsList, AISuggestion } from './AISuggestionsList';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type ChatStep = 'customize' | 'preview' | 'loading' | 'suggestions';

interface PersonalizationChatInterfaceProps {
  destination: string;
  importedPlaces: string[];
  duration: number;
  onBack: () => void;
  onComplete: (selectedPlaces: AISuggestion[]) => void;
  onSkip: () => void;
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
  const [processingTime, setProcessingTime] = useState<number>();

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

    setChatStep('loading');
    const startTime = Date.now();

    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-suggestions', {
        body: {
          destination,
          userPrompt: displayPrompt,
          quickSelections: state.quickSelections,
          importedPlaces: importedPlaces,
          duration,
          existingPlaces: importedPlaces.map(name => ({ name })),
          preferences: {
            purposes: state.quickSelections.purposes,
            travelers: state.quickSelections.travelers,
            budget: state.quickSelections.budget,
            pace: state.quickSelections.pace,
          },
          travelStyle: state.quickSelections.purposes,
        },
      });

      if (error) throw error;

      const endTime = Date.now();
      setProcessingTime(endTime - startTime);
      
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions.map((s: AISuggestion) => ({
          ...s,
          accepted: false,
          rejected: false,
        })));
        setPromptInterpretation(data.promptInterpretation);
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
    onComplete(selectedPlaces);
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
                onClick={onSkip}
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
