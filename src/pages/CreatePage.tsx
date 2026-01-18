import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/navigation/BottomNav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Link2, Mic, Camera, Sparkles, ArrowLeft, 
  Loader2, X, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCreateTrip } from '@/hooks/useUserTrips';
import { supabase } from '@/integrations/supabase/client';
import { PersonalizationChatInterface } from '@/components/personalization/PersonalizationChatInterface';
import type { AISuggestion } from '@/components/personalization/AISuggestionsList';

type FlowStep = 'hero' | 'review-extracted' | 'personalization' | 'generating';

interface ExtractedPlace {
  name: string;
  nameLocal?: string;
  category: string;
  description?: string;
  tips?: string[];
  selected?: boolean;
}

// Helper to parse destination and duration from description
function parseDescription(description: string): { destination: string; country: string; duration: number } {
  // Look for patterns like "5 days in Tokyo" or "Tokyo for 3 days"
  const daysMatch = description.match(/(\d+)\s*days?/i);
  const duration = daysMatch ? parseInt(daysMatch[1], 10) : 3;
  
  // Common city -> country mapping
  const cityCountryMap: Record<string, string> = {
    'tokyo': 'Japan', 'kyoto': 'Japan', 'osaka': 'Japan',
    'paris': 'France', 'london': 'UK', 'rome': 'Italy',
    'bangkok': 'Thailand', 'singapore': 'Singapore',
    'new york': 'USA', 'los angeles': 'USA', 'san francisco': 'USA',
    'bali': 'Indonesia', 'seoul': 'South Korea',
  };
  
  // Try to extract city name
  let destination = 'Unknown';
  let country = 'Unknown';
  
  const lowerDesc = description.toLowerCase();
  for (const [city, countryName] of Object.entries(cityCountryMap)) {
    if (lowerDesc.includes(city)) {
      destination = city.charAt(0).toUpperCase() + city.slice(1);
      country = countryName;
      break;
    }
  }
  
  // Fallback: try to find "in [City]" pattern
  if (destination === 'Unknown') {
    const inMatch = description.match(/in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
    if (inMatch) {
      destination = inMatch[1];
    }
  }
  
  return { destination, country, duration };
}

export default function CreatePage() {
  const navigate = useNavigate();
  const createTrip = useCreateTrip();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<FlowStep>('hero');
  const [tripDescription, setTripDescription] = useState('');
  
  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importType, setImportType] = useState<'url' | 'screenshot' | null>(null);
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [extractedPlaces, setExtractedPlaces] = useState<ExtractedPlace[]>([]);
  const [extractSummary, setExtractSummary] = useState('');
  
  // AI suggestions state
  const [aiSelectedPlaces, setAiSelectedPlaces] = useState<AISuggestion[]>([]);

  const toggleExtractedPlace = (index: number) => {
    setExtractedPlaces(prev => 
      prev.map((p, i) => i === index ? { ...p, selected: !p.selected } : p)
    );
  };

  const handleScreenshotUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportType('screenshot');

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        const { data, error } = await supabase.functions.invoke('extract-places-from-image', {
          body: { 
            image: base64,
            destination: parseDescription(tripDescription).destination 
          }
        });

        if (error) throw error;

        if (data.places && data.places.length > 0) {
          setExtractedPlaces(data.places.map((p: ExtractedPlace) => ({ ...p, selected: true })));
          setExtractSummary(data.summary || `Found ${data.places.length} places`);
          setStep('review-extracted');
          toast.success(`Extracted ${data.places.length} places from screenshot`);
        } else {
          toast.info('No places found in the image. Try a different screenshot.');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error extracting from screenshot:', error);
      toast.error('Failed to extract places. Please try again.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUrlImport = async () => {
    if (!urlInput.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    setIsImporting(true);
    setImportType('url');
    setUrlDialogOpen(false);

    try {
      const { data, error } = await supabase.functions.invoke('extract-places-from-url', {
        body: { 
          url: urlInput,
          destination: parseDescription(tripDescription).destination 
        }
      });

      if (error) throw error;

      if (data.places && data.places.length > 0) {
        setExtractedPlaces(data.places.map((p: ExtractedPlace) => ({ ...p, selected: true })));
        setExtractSummary(data.summary || `Found ${data.places.length} places from ${data.sourceType}`);
        setStep('review-extracted');
        toast.success(`Extracted ${data.places.length} places from URL`);
      } else {
        toast.info('No places found from this URL. Try a different link.');
      }
    } catch (error) {
      console.error('Error extracting from URL:', error);
      toast.error('Failed to extract places. Please try again.');
    } finally {
      setIsImporting(false);
      setUrlInput('');
    }
  };

  const handleConfirmExtracted = () => {
    // Move to personalization step with imported places
    setStep('personalization');
  };

  const handlePersonalizationComplete = (selectedPlaces: AISuggestion[]) => {
    setAiSelectedPlaces(selectedPlaces);
    handleGenerateTrip(selectedPlaces);
  };

  const handlePersonalizationSkip = () => {
    handleGenerateTrip([]);
  };

  const handleGenerateTrip = async (aiPlaces: AISuggestion[]) => {
    setStep('generating');
    
    // Parse user description
    const parsed = parseDescription(tripDescription);
    
    // Combine imported and AI-selected places
    const allPlaceNames = [
      ...extractedPlaces.filter(p => p.selected).map(p => p.name),
      ...aiPlaces.map(p => p.name),
    ];
    
    // Create title from description or destination
    const title = tripDescription.length > 50 
      ? `${parsed.duration} Days in ${parsed.destination}`
      : tripDescription || `Trip to ${parsed.destination}`;
    
    try {
      createTrip.mutate(
        {
          title,
          destination: parsed.destination,
          country: parsed.country,
          duration: parsed.duration,
        },
        {
          onSuccess: (data) => {
            // Store place names in session storage for the trip detail page to use
            if (allPlaceNames.length > 0) {
              sessionStorage.setItem(`trip-places-${data.trip.id}`, JSON.stringify(allPlaceNames));
            }
            navigate(`/trip/${data.trip.id}`);
          },
          onError: () => {
            setStep('personalization');
            toast.error('Failed to create trip. Please try again.');
          },
        }
      );
    } catch {
      setStep('personalization');
      toast.error('Failed to create trip. Please try again.');
    }
  };

  const handleImportAndContinue = () => {
    if (tripDescription.trim()) {
      setStep('personalization');
    } else {
      toast.error('Please describe your trip or import content first');
    }
  };

  const parsed = parseDescription(tripDescription);
  const importedPlaceNames = extractedPlaces.filter(p => p.selected).map(p => p.name);

  return (
    <div className="min-h-screen pb-24">
      {step === 'hero' && (
        <>
          {/* Hero Section with Gradient */}
          <div 
            className="relative overflow-hidden px-4 pb-8 pt-12"
            style={{
              background: 'linear-gradient(180deg, hsl(40 33% 96%) 0%, hsl(40 33% 98%) 100%)'
            }}
          >
            <div className="relative z-10">
              {/* Logo/Title */}
              <h1 className="text-4xl font-bold">
                <span className="text-foreground">Travel</span>
                <span className="text-primary">Better.</span>
              </h1>
              
              <p className="mt-4 text-lg text-muted-foreground">
                Describe your dream trip
              </p>

              {/* Large Text Area */}
              <Textarea
                value={tripDescription}
                onChange={(e) => setTripDescription(e.target.value)}
                placeholder="Tell me more about your trip...&#10;&#10;Exp: 5 Days in Tokyo, Purpose: Food & Culture, staying at Shibuya..."
                className="mt-4 min-h-[120px] resize-none rounded-xl border-border bg-card text-base shadow-sm"
              />

              {/* Hidden file input for screenshot */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleScreenshotUpload}
                className="hidden"
              />

              {/* Import Option Pills */}
              <div className="mt-4 flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2 rounded-full"
                  onClick={() => setUrlDialogOpen(true)}
                  disabled={isImporting}
                >
                  {isImporting && importType === 'url' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                  Link
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2 rounded-full"
                  disabled
                >
                  <Mic className="h-4 w-4" />
                  Voice
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2 rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                >
                  {isImporting && importType === 'screenshot' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  Screenshot
                </Button>
              </div>

              {/* Generate CTA */}
              <Button 
                onClick={handleImportAndContinue}
                className="mt-6 w-full gap-2 rounded-xl py-6 text-base"
                size="lg"
              >
                <Sparkles className="h-5 w-5" />
                Generate Itinerary
              </Button>

              {/* Footer */}
              <p className="mt-4 text-center text-xs text-muted-foreground">
                POWERED BY AI TRAVEL ENGINE
              </p>
            </div>
          </div>
        </>
      )}

      {step === 'personalization' && (
        <PersonalizationChatInterface
          destination={parsed.destination}
          importedPlaces={importedPlaceNames}
          duration={parsed.duration}
          onBack={() => setStep(extractedPlaces.length > 0 ? 'review-extracted' : 'hero')}
          onComplete={handlePersonalizationComplete}
          onSkip={handlePersonalizationSkip}
        />
      )}

      {step === 'generating' && (
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-muted border-t-primary" />
            <Sparkles className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-primary" />
          </div>
          <p className="mt-6 text-lg font-medium">Creating your perfect itinerary...</p>
          <p className="mt-2 text-sm text-muted-foreground animate-pulse">
            Analyzing preferences, optimizing routes...
          </p>
        </div>
      )}

      {step === 'review-extracted' && (
        <div className="bg-background">
          {/* Header */}
          <header className="flex items-center justify-between border-b px-4 py-4">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setStep('hero')}
                className="rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-semibold">Review Places</h1>
            </div>
          </header>

          <div className="p-4">
            <p className="text-sm text-muted-foreground mb-4">{extractSummary}</p>
            
            <div className="space-y-3">
              {extractedPlaces.map((place, index) => (
                <Card 
                  key={index}
                  className={cn(
                    'p-4 cursor-pointer transition-all',
                    place.selected 
                      ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                      : 'opacity-60'
                  )}
                  onClick={() => toggleExtractedPlace(index)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      checked={place.selected} 
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{place.name}</span>
                        {place.nameLocal && (
                          <span className="text-sm text-muted-foreground">{place.nameLocal}</span>
                        )}
                      </div>
                      <span className="text-xs text-primary capitalize">{place.category}</span>
                      {place.description && (
                        <p className="text-sm text-muted-foreground mt-1">{place.description}</p>
                      )}
                      {place.tips && place.tips.length > 0 && (
                        <p className="text-xs text-amber-600 mt-1">💡 {place.tips[0]}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <Button 
                variant="outline"
                className="flex-1"
                onClick={() => setStep('hero')}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 gap-2"
                onClick={handleConfirmExtracted}
              >
                <Check className="h-4 w-4" />
                Continue with {extractedPlaces.filter(p => p.selected).length} Places
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 'hero' && <BottomNav />}

      {/* URL Import Dialog */}
      <Dialog open={urlDialogOpen} onOpenChange={setUrlDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import from URL</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste a YouTube video, Instagram post, or travel blog URL to extract places.
            </p>
            <Input
              placeholder="https://youtube.com/watch?v=... or https://instagram.com/p/..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setUrlDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUrlImport} disabled={!urlInput.trim()}>
                <Sparkles className="h-4 w-4 mr-2" />
                Extract Places
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
