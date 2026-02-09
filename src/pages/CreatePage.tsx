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
import { PromptPreview } from '@/components/personalization/PromptPreview';
import type { AISuggestion } from '@/components/personalization/AISuggestionsList';
import type { ParsedDayGroup } from '@/types/itinerary';
import type { ScreenshotExtractItem, ScreenshotImageInput } from '@/types/itinerary';
import { filterPlaces } from '@/lib/itinerarySanitizer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type FlowStep = 'hero' | 'ocr-review' | 'personalization' | 'generating';

const JUDGE_TEMPLATE_TEXT = `9am take van 🚌 >> 11.30am reached
12pm reached Neo Grand Hatyai
Krua Pa Yad
Greeway Night Market

DAY 2
Central Hatyai
Maribu Cafe
Lee Garden Night Market 🛍️

DAY3
Kuay Jab Jae Khwan
Baan Khun Bhu
Baroffee Cafe Haytai`;

interface ExtractedPlace {
  name: string;
  displayName?: string;
  placeId?: string | null;
  nameLocal?: string;
  category: string;
  description?: string;
  tips?: string[];
  latitude?: number;
  longitude?: number;
}

function extractDurationDays(description: string): number | null {
  const daysMatch = description.match(/(\d+)\s*days?/i);
  return daysMatch ? parseInt(daysMatch[1], 10) : null;
}

function inferTripDurationDays(
  description: string,
  extractedPlaces: ExtractedPlace[],
  parsedDayGroups: ParsedDayGroup[]
): number {
  const explicitDuration = extractDurationDays(description);
  if (explicitDuration && explicitDuration > 0) {
    return explicitDuration;
  }

  const hasExplicitDayMarkers = /\bday\s*\d+\b/i.test(description);
  if (hasExplicitDayMarkers && parsedDayGroups.length > 0) {
    return Math.max(1, parsedDayGroups.length);
  }

  const candidatePlaces = extractedPlaces.length > 0
    ? extractedPlaces
    : extractFallbackPlaces(description);
  const placeCount = candidatePlaces.length;

  if (placeCount <= 0) {
    return 3;
  }

  const estimatedVisitMinutes = placeCount * 120;
  const estimatedCommuteMinutes = Math.max(0, placeCount - 1) * 30;
  const estimatedTotalMinutes = estimatedVisitMinutes + estimatedCommuteMinutes;
  const maxMinutesPerDay = 10 * 60;

  return Math.max(1, Math.ceil(estimatedTotalMinutes / maxMinutesPerDay));
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

  const hasDuration = /\b\d+\s*days?\b/i.test(trimmed);
  const hasCommaList = /[，,]/.test(trimmed);
  if (hasDuration && hasCommaList) return true;

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
      .replace(/^[•*-]+\s*/g, '')
      .replace(/^day\s*\d+[:.-]?\s*/i, '')
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

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

async function readFileAsBase64(file: File): Promise<string> {
  if (typeof file.arrayBuffer === 'function') {
    const buffer = await file.arrayBuffer();
    return arrayBufferToBase64(buffer);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      if (!base64) {
        reject(new Error('Unable to read screenshot file'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error || new Error('Unable to read screenshot file'));
    reader.readAsDataURL(file);
  });
}

export default function CreatePage() {
  const navigate = useNavigate();
  const createTripWithPlaces = useCreateTripWithPlaces();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<FlowStep>('hero');
  const [tripDescription, setTripDescription] = useState('');
  const [premiumFeatureDialogOpen, setPremiumFeatureDialogOpen] = useState(false);
  const [premiumFeatureLabel, setPremiumFeatureLabel] = useState('');
  
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
  const [ocrBatchId, setOcrBatchId] = useState<string | null>(null);
  const [ocrReviewText, setOcrReviewText] = useState('');
  const [ocrItems, setOcrItems] = useState<ScreenshotExtractItem[]>([]);
  const [ocrWarnings, setOcrWarnings] = useState<string[]>([]);
  const [ocrFailureDialogOpen, setOcrFailureDialogOpen] = useState(false);
  const [lastScreenshotPayload, setLastScreenshotPayload] = useState<ScreenshotImageInput[]>([]);
  const [screenshotStageMessage, setScreenshotStageMessage] = useState('');

  const openPremiumFeatureDialog = (featureLabel: string) => {
    setPremiumFeatureLabel(featureLabel);
    setPremiumFeatureDialogOpen(true);
  };

  const handleUseJudgeTemplate = () => {
    setTripDescription(JUDGE_TEMPLATE_TEXT);
    toast.success('Judge template pasted into the input');
  };

  const handleCopyJudgeTemplate = async () => {
    try {
      await navigator.clipboard.writeText(JUDGE_TEMPLATE_TEXT);
      toast.success('Judge template copied');
    } catch {
      toast.error('Unable to copy template. Please copy manually.');
    }
  };

  const processScreenshotBatch = async (images: ScreenshotImageInput[]) => {
    if (images.length === 0) return;

    setIsImporting(true);
    setImportType('screenshot');
    setScreenshotStageMessage('Extracting text from uploaded screenshots...');
    setOcrWarnings([]);

    try {
      const { data, error } = await api.extractScreenshots({
        destination: extractBasicDestination(tripDescription) || undefined,
        images,
      });

      if (error || !data) {
        throw error || new Error('Failed to extract screenshot text');
      }

      setOcrBatchId(data.batchId);
      setOcrItems(data.items);
      setOcrReviewText(data.mergedText || '');
      setOcrWarnings(data.warnings || []);

      if (data.status === 'failed' || !data.mergedText.trim()) {
        setOcrFailureDialogOpen(true);
        return;
      }

      if (data.status === 'partial') {
        toast.info('Some screenshots failed to extract. Review text and continue.');
      } else {
        toast.success(`Extracted text from ${data.processedCount} screenshot(s)`);
      }

      setStep('ocr-review');
    } catch (error) {
      console.error('Error extracting from screenshot batch:', error);
      toast.error('Failed to extract screenshot text. Try again or paste text manually.');
      setOcrFailureDialogOpen(true);
    } finally {
      setIsImporting(false);
      setScreenshotStageMessage('');
    }
  };

  const handleScreenshotUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setIsImporting(true);
    setImportType('screenshot');
    setScreenshotStageMessage('Preparing files for OCR...');

    try {
      const images: ScreenshotImageInput[] = [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        const base64Data = await readFileAsBase64(file);
        const mimeType = file.type === 'image/webp' ? 'image/webp' : file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        images.push({
          filename: file.name || `screenshot-${images.length + 1}.jpg`,
          mimeType,
          base64Data,
        });
      }

      if (images.length === 0) {
        toast.error('Please select at least one PNG, JPEG, or WEBP screenshot.');
        return;
      }

      setLastScreenshotPayload(images);
      await processScreenshotBatch(images);
    } finally {
      setIsImporting(false);
      setScreenshotStageMessage('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRetryScreenshotExtraction = async () => {
    setOcrFailureDialogOpen(false);
    if (lastScreenshotPayload.length === 0) {
      toast.info('Pick screenshots again to retry extraction.');
      return;
    }
    await processScreenshotBatch(lastScreenshotPayload);
  };

  const handleManualTextFallback = () => {
    setOcrFailureDialogOpen(false);
    setStep('personalization');
    toast.info('You can paste itinerary text and continue manually.');
  };

  const handleSubmitOcrReview = async () => {
    if (!ocrBatchId || !ocrReviewText.trim()) {
      toast.error('Review text is empty. Add text before continuing.');
      return;
    }

    setIsImporting(true);
    setImportType('screenshot');
    setScreenshotStageMessage('Converting extracted text into itinerary places...');

    try {
      const { data, error } = await api.submitScreenshotText({
        batchId: ocrBatchId,
        text: ocrReviewText,
        destination: getDisplayDestination(tripDescription, extractedDestination) || undefined,
        durationDays: extractDurationDays(tripDescription) || undefined,
      });

      if (error || !data) {
        throw error || new Error('Failed to submit extracted text');
      }

      const parsedDays = data.days || [];
      const dayPlaceNames = parsedDays.flatMap(day => day.places.map(place => place.name));
      const uniquePlaces = [...new Set(dayPlaceNames.map(name => name.trim()).filter(Boolean))];

      setTripDescription(ocrReviewText);
      setParsedRequest(data.cleanedRequest || ocrReviewText);
      setParsedPreview(data.previewText || data.cleanedRequest || ocrReviewText);
      setParsedDayGroups(parsedDays);
      setExtractedDestination(data.destination || extractBasicDestination(ocrReviewText));
      setExtractedPlaces(uniquePlaces.map(name => ({ name, category: 'attraction' })));
      setOcrWarnings(data.warnings || []);

      if ((data.warnings || []).length > 0) {
        toast.info('Review notes detected. You can adjust text in personalization if needed.');
      }

      setStep('personalization');
    } catch (error) {
      console.error('Error submitting screenshot OCR text:', error);
      toast.error('Unable to continue from extracted text. Retry or edit text manually.');
      setOcrFailureDialogOpen(true);
    } finally {
      setIsImporting(false);
      setScreenshotStageMessage('');
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
    const explicitlyRequestedDuration = extractDurationDays(tripDescription);
    const inferredDuration = inferTripDurationDays(tripDescription, extractedPlaces, parsedDayGroups);
    const finalDuration = explicitlyRequestedDuration || days || inferredDuration;

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
      const canonicalName = match?.displayName || name;
      return {
        name: canonicalName,
        displayName: match?.displayName,
        placeId: match?.placeId ?? undefined,
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
      dayIndex: p.confirmedDayNumber,
      dayLabel: p.confirmedDayNumber ? `Day ${p.confirmedDayNumber}` : undefined,
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
    const durationDays = extractDurationDays(tripDescription);
    const fallbackPlaces = extractFallbackPlaces(tripDescription);

    try {
      const { data, error } = await api.extractPlacesFromText(
        tripDescription,
        destinationSeed || undefined,
        durationDays || undefined
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
  const tripDuration = inferTripDurationDays(tripDescription, extractedPlaces, parsedDayGroups);
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

              <div className="mt-3 rounded-xl border border-border/70 bg-card p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Judge template
                </p>
                <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                  {JUDGE_TEMPLATE_TEXT}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={handleUseJudgeTemplate}
                  >
                    Use template
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={handleCopyJudgeTemplate}
                  >
                    Copy template
                  </Button>
                </div>
              </div>

              {/* Hidden file input for screenshot */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleScreenshotUpload}
                className="hidden"
              />

              {/* Import Option Pills */}
              <div className="mt-4 flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2 rounded-full"
                  onClick={() => openPremiumFeatureDialog('Link import')}
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
                  onClick={() => openPremiumFeatureDialog('Voice input')}
                  disabled={isImporting}
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

              {importType === 'screenshot' && screenshotStageMessage && (
                <p className="mt-3 text-sm text-muted-foreground animate-pulse">
                  {screenshotStageMessage}
                </p>
              )}

              {ocrItems.length > 0 && (
                <div className="mt-4 rounded-xl border border-border bg-card p-3">
                  <p className="text-sm font-medium text-foreground">Screenshot extraction status</p>
                  <div className="mt-2 space-y-1">
                    {ocrItems.map(item => (
                      <div key={item.filename} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{item.filename}</span>
                        <span className={item.status === 'processed' ? 'text-green-600' : 'text-amber-600'}>
                          {item.status === 'processed' ? 'Processed' : 'Failed'}
                        </span>
                      </div>
                    ))}
                  </div>
                  {ocrWarnings.length > 0 && (
                    <p className="mt-2 text-xs text-amber-700">{ocrWarnings.join(' • ')}</p>
                  )}
                </div>
              )}

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

      {step === 'ocr-review' && (
        <div className="px-4 py-6">
          <PromptPreview
            prompt={tripDescription}
            editableText={ocrReviewText}
            editableLabel="Extracted screenshot text"
            hideEditAction
            importedPlaces={[]}
            onEditableTextChange={setOcrReviewText}
            onEdit={() => setStep('hero')}
            onSubmit={handleSubmitOcrReview}
            isLoading={isImporting}
          />
        </div>
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

      <AlertDialog open={ocrFailureDialogOpen} onOpenChange={setOcrFailureDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Could not extract enough text</AlertDialogTitle>
            <AlertDialogDescription>
              Retry OCR with the same screenshots or continue by entering text manually.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleManualTextFallback}>Manual text</AlertDialogCancel>
            <AlertDialogAction onClick={handleRetryScreenshotExtraction}>Retry extraction</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={premiumFeatureDialogOpen} onOpenChange={setPremiumFeatureDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Premium feature</AlertDialogTitle>
            <AlertDialogDescription>
              {premiumFeatureLabel || 'This feature'} is available for premium members only.
              Upgrade to unlock it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Maybe later</AlertDialogCancel>
            <AlertDialogAction onClick={() => setPremiumFeatureDialogOpen(false)}>
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
