import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/navigation/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Link2, Mic, Camera, Sparkles, 
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useCreateTripWithPlaces, type PlaceInput } from '@/hooks/useUserTrips';
import { api } from '@/lib/api';
import { resolvePlacesForTrip } from '@/lib/resolvePlaces';
import { PersonalizationChatInterface } from '@/components/personalization/PersonalizationChatInterface';
import type { AISuggestion } from '@/components/personalization/AISuggestionsList';
import type { ParsedDayGroup } from '@/types/itinerary';
import { filterPlaces } from '@/lib/itinerarySanitizer';

type FlowStep = 'hero' | 'personalization' | 'generating';

interface ExtractedPlace {
  name: string;
  nameLocal?: string;
  category: string;
  description?: string;
  tips?: string[];
  latitude?: number;
  longitude?: number;
}

// Helper to parse duration from description (destination will be extracted by AI)
function parseDuration(description: string): number {
  const daysMatch = description.match(/(\d+)\s*days?/i);
  return daysMatch ? parseInt(daysMatch[1], 10) : 3;
}

// Simple helper to extract destination(s) for display purposes
// The actual destination will be determined by AI
function extractBasicDestination(description: string): string {
  if (!description.trim()) return '';

  // Handle multi-city patterns first: "X to Y", "X and Y", "X & Y"
  const multiCityPatterns = [
    /([A-Za-z][A-Za-z\s]*?)\s+to\s+([A-Za-z][A-Za-z\s]*?)(?:\s+for|\s+\d|\.|,|$)/i,
    /([A-Za-z][A-Za-z\s]*?)\s+(?:and|&)\s+([A-Za-z][A-Za-z\s]*?)(?:\s+for|\s+\d|\.|,|$)/i,
    /from\s+([A-Za-z][A-Za-z\s]*?)\s+to\s+([A-Za-z][A-Za-z\s]*?)(?:\s|$)/i,
  ];

  for (const pattern of multiCityPatterns) {
    const match = description.match(pattern);
    if (match) {
      const city1 = match[1].trim().split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
      const city2 = match[2].trim().split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
      return `${city1} to ${city2}`;
    }
  }

  // Try single destination patterns
  const singlePatterns = [
    /(?:to|in|at|visiting)\s+([A-Za-z][A-Za-z\s]+?)(?:\s+for|\s+\d|\.|,|$)/i,
  ];

  for (const pattern of singlePatterns) {
    const match = description.match(pattern);
    if (match) {
      return match[1].trim().split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }
  }

  // If no pattern matches, clean and use the description itself
  const cleaned = description
    .replace(/\d+\s*days?/gi, '')
    .replace(/\b(trip|travel|vacation|holiday|visit|visiting|going|planning|for|the|a|an)\b/gi, '')
    .trim();

  if (cleaned.length > 0 && cleaned.length < 100) {
    return cleaned.split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  return description.trim();
}

function getFirstLineSummary(description: string): string {
  const firstLine = description.split(/\r?\n/).find(line => line.trim());
  if (!firstLine) return '';

  const cleaned = firstLine
    .replace(/[\p{Extended_Pictographic}]/gu, '')
    .replace(/[*_~`>#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}

function sanitizeDestinationLabel(value: string): string {
  return value
    .replace(/[\p{Extended_Pictographic}]/gu, '')
    .replace(/\bi(?:'|’)m planning a trip to\b/i, '')
    .replace(/\bi am planning a trip to\b/i, '')
    .replace(/\bplaces from my itinerary\b/i, '')
    .replace(/\btrip\b/gi, '')
    .replace(/\b\d{1,2}\/\d{1,2}(?:\s*[-–]\s*\d{1,2}\/\d{1,2})?\b/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[.,:;]+$/g, '')
    .trim();
}

function isLikelyItinerary(description: string): boolean {
  const trimmed = description.trim();
  if (!trimmed) return false;
  const lineCount = description.split(/\r?\n/).filter(line => line.trim()).length;
  if (lineCount > 1) return true;

  return /(day\s*\d+|itinerary|schedule|>>|\d{1,2}[:.]\d{2}\s*(am|pm)?)/i.test(trimmed);
}

function extractFallbackPlaces(description: string): ExtractedPlace[] {
  const lines = description.split(/\r?\n/);
  const places: ExtractedPlace[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const cleaned = trimmed
      .replace(/[\p{Extended_Pictographic}]/gu, '')
      .replace(/^[•\-*]+\s*/g, '')
      .replace(/^day\s*\d+[:.\-]?\s*/i, '')
      .replace(/^\d{1,2}[:.]\d{2}\s*(am|pm)?\s*/i, '')
      .replace(/^\d{1,2}\s*(am|pm)\s*/i, '')
      .replace(/^\d+\.\s*/, '')
      .replace(/>>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) continue;
    if (cleaned.length > 80) continue;
    if (/\b(trip|itinerary|schedule|notes)\b/i.test(cleaned)) continue;
    if (/\b(arrive|depart|check[- ]?in|flight|train|bus|transfer)\b/i.test(cleaned)) continue;

    const letterCount = (cleaned.match(/\p{L}/gu) || []).length;
    const digitCount = (cleaned.match(/\d/g) || []).length;
    if (letterCount === 0 || digitCount > letterCount) continue;

    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    places.push({
      name: cleaned,
      category: 'attraction',
    });
  }

  return places;
}

function getDisplayDestination(description: string, extractedDestination?: string): string {
  const extracted = extractedDestination?.trim();
  if (extracted) {
    const sanitized = sanitizeDestinationLabel(extracted);
    if (sanitized) return sanitized;
  }

  const basic = extractBasicDestination(description);
  if (basic) {
    const sanitized = sanitizeDestinationLabel(basic);
    if (sanitized && sanitized.length <= 60 && !sanitized.includes('\n')) {
      return sanitized;
    }
  }

  const summaryLine = getFirstLineSummary(description);
  if (summaryLine) {
    const sanitized = sanitizeDestinationLabel(summaryLine);
    if (!sanitized) return summaryLine.length > 80 ? `${summaryLine.slice(0, 77)}...` : summaryLine;
    return sanitized.length > 80 ? `${sanitized.slice(0, 77)}...` : sanitized;
  }

  return basic || summaryLine;
}

export default function CreatePage() {
  const navigate = useNavigate();
  const createTripWithPlaces = useCreateTripWithPlaces();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<FlowStep>('hero');
  const [tripDescription, setTripDescription] = useState('');
  
  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importType, setImportType] = useState<'url' | 'screenshot' | 'text' | null>(null);
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [extractedPlaces, setExtractedPlaces] = useState<ExtractedPlace[]>([]);
  const [extractedDestination, setExtractedDestination] = useState('');
  const [showGeocodeMessage, setShowGeocodeMessage] = useState(false);
  const [parsedRequest, setParsedRequest] = useState('');
  const [parsedPreview, setParsedPreview] = useState('');
  const [parsedDayGroups, setParsedDayGroups] = useState<ParsedDayGroup[]>([]);

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

        const { data, error } = await api.extractPlacesFromImage(
          base64,
          extractBasicDestination(tripDescription) || undefined
        );

        if (error) throw error;

        if (data?.places && data.places.length > 0) {
          setExtractedPlaces(data.places);
          setStep('personalization');
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
      const { data, error } = await api.extractPlacesFromUrl(
        urlInput,
        extractBasicDestination(tripDescription) || undefined
      );

      if (error) throw error;

      if (data?.places && data.places.length > 0) {
        setExtractedPlaces(data.places);
        setStep('personalization');
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

  const handlePersonalizationComplete = (
    selectedPlaces: AISuggestion[],
    days: number,
    resolvedDestination?: string,
    userPlaces: string[] = []
  ) => {
    handleGenerateTrip(selectedPlaces, days, resolvedDestination, userPlaces);
  };

  const handlePersonalizationSkip = (days: number, userPlaces: string[] = []) => {
    handleGenerateTrip([], days, undefined, userPlaces);
  };

    const handleGenerateTrip = async (
      aiPlaces: AISuggestion[],
      days?: number,
      resolvedDestination?: string,
      userPlaces?: string[]
    ) => {
    setStep('generating');

    // Use resolved destination from AI or extract from description
    const fallbackDestination = getDisplayDestination(tripDescription, extractedDestination);
    const destination = resolvedDestination || fallbackDestination || 'Unknown';
    const finalDuration = days || parseDuration(tripDescription);

    // Combine imported and AI-selected places into PlaceInput objects
    const parsedLabels = parsedDayGroups.map(day => day.label);
    const sanitizedUserPlaces = filterPlaces(
      (userPlaces ?? extractedPlaces.map(p => p.name)).map(name => ({ name })),
      parsedLabels
    ).map(item => item.name);
    const finalUserPlaces = sanitizedUserPlaces;
    const extractedByName = new Map(
      extractedPlaces.map(place => [place.name.toLowerCase(), place])
    );
    const dayIndexByPlace = new Map<string, number>();
    const dayLabelByPlace = new Map<string, string>();
    parsedDayGroups.forEach((day, index) => {
      day.places.forEach(place => {
        const key = place.name.toLowerCase();
        dayIndexByPlace.set(key, index + 1);
        dayLabelByPlace.set(key, day.label);
      });
    });

    const importedPlaceInputs: PlaceInput[] = finalUserPlaces.map(name => {
      const match = extractedByName.get(name.toLowerCase());
      return {
        name,
        nameLocal: match?.nameLocal,
        category: match?.category || 'attraction',
        description: match?.description,
        tips: match?.tips,
        source: 'user' as const,
        dayIndex: dayIndexByPlace.get(name.toLowerCase()),
        dayLabel: dayLabelByPlace.get(name.toLowerCase()),
        coordinates:
          typeof match?.latitude === 'number' && typeof match?.longitude === 'number'
            ? { lat: match.latitude, lng: match.longitude }
            : undefined,
      };
    });

    const aiPlaceInputs: PlaceInput[] = aiPlaces.map(p => ({
      name: p.name,
      category: p.category || 'attraction',
      description: p.description,
      source: 'ai' as const,
      confidence: p.confidence,
      coordinates:
        typeof p.latitude === 'number' && typeof p.longitude === 'number'
          ? { lat: p.latitude, lng: p.longitude }
          : undefined,
    }));

    const allPlaces = [...importedPlaceInputs, ...aiPlaceInputs];
    const resolvedPlaces = await resolvePlacesForTrip(allPlaces, destination);
    const shouldShowGeocodeMessage = resolvedPlaces.some(place => !place.coordinates);
    setShowGeocodeMessage(shouldShowGeocodeMessage);

    // Create title from description or destination
    const trimmedDescription = tripDescription.trim();
    const useRawTitle = trimmedDescription.length > 0
      && trimmedDescription.length <= 50
      && !isLikelyItinerary(tripDescription);
    const title = useRawTitle
      ? trimmedDescription
      : destination
        ? `${finalDuration} Days in ${destination}`
        : `Trip (${finalDuration} days)`;

    try {
      createTripWithPlaces.mutate(
        {
          title,
          destination: destination,
          country: 'Unknown', // Will be resolved later or by user
          duration: finalDuration,
          places: resolvedPlaces,
        },
        {
          onSuccess: (data) => {
            setShowGeocodeMessage(false);
            navigate(`/trip/${data.trip.id}`);
          },
          onError: () => {
            setStep('personalization');
            setShowGeocodeMessage(false);
            toast.error('Failed to create trip. Please try again.');
          },
        }
      );
    } catch {
      setStep('personalization');
      setShowGeocodeMessage(false);
      toast.error('Failed to create trip. Please try again.');
    }
  };

  const handleTextImport = async () => {
    setIsImporting(true);
    setImportType('text');
    setExtractedPlaces([]);
    setExtractedDestination('');
    setParsedRequest('');
    setParsedPreview('');
    setParsedDayGroups([]);

    const destinationSeed = getDisplayDestination(tripDescription);
    const fallbackPlaces = extractFallbackPlaces(tripDescription);

    try {
      const { data, error } = await api.extractPlacesFromText(
        tripDescription,
        destinationSeed || undefined
      );

      const resolvedDestination = data?.destination || destinationSeed;
      const parsedDays = data?.days || [];
      const cleanedRequest = data?.cleanedRequest || '';
      const previewText = data?.previewText || cleanedRequest;

      if (error) {
        if (fallbackPlaces.length > 0) {
          setExtractedPlaces(fallbackPlaces);
          setExtractedDestination(resolvedDestination || destinationSeed);
          setParsedRequest(cleanedRequest);
          setParsedPreview(previewText);
          setParsedDayGroups(parsedDays);
          setStep('personalization');
          toast.success(`Captured ${fallbackPlaces.length} places from your itinerary`);
          return;
        }
        throw error;
      }

      const extracted = data?.places || [];
      const sanitizedExtracted = filterPlaces(extracted, parsedDays.map(day => day.label));
      if (sanitizedExtracted.length > 0) {
        setExtractedPlaces(sanitizedExtracted);
        setExtractedDestination(resolvedDestination || destinationSeed);
        setParsedRequest(cleanedRequest);
        setParsedPreview(previewText);
        setParsedDayGroups(parsedDays);
        setStep('personalization');
        toast.success(`Extracted ${sanitizedExtracted.length} places from your itinerary`);
        return;
      }

      if (fallbackPlaces.length > 0) {
        setExtractedPlaces(fallbackPlaces);
        setExtractedDestination(resolvedDestination || destinationSeed);
        setParsedRequest(cleanedRequest);
        setParsedPreview(previewText);
        setParsedDayGroups(parsedDays);
        setStep('personalization');
        toast.success(`Captured ${fallbackPlaces.length} places from your itinerary`);
        return;
      }

      if (resolvedDestination) {
        setExtractedDestination(resolvedDestination);
      }
      if (!cleanedRequest) {
        toast.info('We could not find specific places, but you can continue with your itinerary.');
      }
      setParsedRequest(cleanedRequest);
      setParsedPreview(previewText);
      setParsedDayGroups(parsedDays);
      setStep('personalization');
    } catch (error) {
      console.error('Error extracting from text:', error);
      toast.error('Failed to extract places. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportAndContinue = () => {
    if (!tripDescription.trim()) {
      toast.error('Please describe your trip first (e.g., "melaka to johor" or "5 days in Tokyo")');
      return;
    }

    if (isLikelyItinerary(tripDescription)) {
      handleTextImport();
      return;
    }

    setStep('personalization');
  };

  // Extract basic destination for display (AI will resolve the actual destination)
  const displayDestination = getDisplayDestination(tripDescription, extractedDestination);
  const tripDuration = parseDuration(tripDescription);
  const seedPlaceNames = extractedPlaces.map(p => p.name);

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
                disabled={isImporting}
              >
                {isImporting && importType === 'text' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
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
          destination={displayDestination || 'Your trip'}
          seedPlaces={seedPlaceNames}
          rawItineraryText={tripDescription}
          parsedRequest={parsedRequest}
          parsedPreview={parsedPreview}
          parsedDayGroups={parsedDayGroups}
          duration={tripDuration}
          onBack={() => setStep('hero')}
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
          <p className="mt-2 text-center text-sm text-muted-foreground animate-pulse">
            {showGeocodeMessage
              ? 'We are trying to locate the coords of the place you pasted in'
              : 'Analyzing preferences, optimizing routes...'}
          </p>
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
