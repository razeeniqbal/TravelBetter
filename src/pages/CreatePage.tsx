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
  Link2, Mic, Camera, Sparkles, ArrowLeft, Settings, 
  Calendar, Users, Plus, Minus, ChevronRight, Utensils, MapPin,
  Loader2, X, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCreateTrip } from '@/hooks/useUserTrips';
import { supabase } from '@/integrations/supabase/client';

type FlowStep = 'hero' | 'preferences' | 'generating' | 'review-extracted';

interface ExtractedPlace {
  name: string;
  nameLocal?: string;
  category: string;
  description?: string;
  tips?: string[];
  selected?: boolean;
}

const purposes = [
  { id: 'business', label: 'Business', icon: '💼' },
  { id: 'holiday', label: 'Holiday', icon: '🏖️' },
  { id: 'hiking', label: 'Hiking', icon: '🥾' },
  { id: 'food', label: 'Food', icon: '🍜' },
  { id: 'culture', label: 'Culture', icon: '🏛️' },
  { id: 'nature', label: 'Nature', icon: '🌳' },
];

const foodPreferences = [
  { id: 'spicy', label: 'Spicy', icon: '🌶️', desc: 'Love the heat!' },
  { id: 'local', label: 'Local', icon: '🍜', desc: 'Authentic cuisine' },
  { id: 'reviewed', label: 'Top Rated', icon: '⭐', desc: 'Highest reviews' },
];

const placeTypes = [
  { id: 'beach', label: 'Beach' },
  { id: 'museum', label: 'Museum' },
  { id: 'shopping', label: 'Shopping Malls' },
  { id: 'photo', label: 'Photo Spots' },
  { id: 'concerts', label: 'Concerts' },
  { id: 'nature', label: 'Parks' },
  { id: 'nightlife', label: 'Nightlife' },
];

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
  const [selectedPurposes, setSelectedPurposes] = useState<string[]>([]);
  const [selectedFood, setSelectedFood] = useState<string[]>([]);
  const [selectedPlaces, setSelectedPlaces] = useState<string[]>([]);
  const [travelers, setTravelers] = useState(2);
  const [dates, setDates] = useState('');
  
  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importType, setImportType] = useState<'url' | 'screenshot' | null>(null);
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [extractedPlaces, setExtractedPlaces] = useState<ExtractedPlace[]>([]);
  const [extractSummary, setExtractSummary] = useState('');

  const togglePurpose = (id: string) => {
    setSelectedPurposes(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleFood = (id: string) => {
    setSelectedFood(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const togglePlace = (id: string) => {
    setSelectedPlaces(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

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
    const selectedPlaceNames = extractedPlaces
      .filter(p => p.selected)
      .map(p => p.name)
      .join(', ');
    
    if (selectedPlaceNames) {
      setTripDescription(prev => 
        prev ? `${prev}\n\nPlaces to visit: ${selectedPlaceNames}` : `Places to visit: ${selectedPlaceNames}`
      );
    }
    
    setStep('preferences');
  };

  const handleGenerate = async () => {
    setStep('generating');
    
    // Parse user description
    const parsed = parseDescription(tripDescription);
    
    // Parse duration from dates field if provided (e.g., "5 days" or date range)
    let duration = parsed.duration;
    if (dates) {
      const daysFromDates = dates.match(/(\d+)\s*days?/i);
      if (daysFromDates) {
        duration = parseInt(daysFromDates[1], 10);
      }
    }
    
    // Create title from description or destination
    const title = tripDescription.length > 50 
      ? `${duration} Days in ${parsed.destination}`
      : tripDescription || `Trip to ${parsed.destination}`;
    
    try {
      createTrip.mutate(
        {
          title,
          destination: parsed.destination,
          country: parsed.country,
          duration,
        },
        {
          onSuccess: (data) => {
            navigate(`/trip/${data.trip.id}`);
          },
          onError: () => {
            setStep('preferences');
            toast.error('Failed to create trip. Please try again.');
          },
        }
      );
    } catch {
      setStep('preferences');
      toast.error('Failed to create trip. Please try again.');
    }
  };

  const handleImportAndContinue = () => {
    if (tripDescription.trim()) {
      setStep('preferences');
    } else {
      toast.error('Please describe your trip or import content first');
    }
  };

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

      {step === 'preferences' && (
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
              <h1 className="text-lg font-semibold">Plan Your Trip</h1>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Settings className="h-5 w-5" />
            </Button>
          </header>

          <div className="space-y-6 p-4">
            {/* Days/Time Period */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Days / Time Period
              </label>
              <Input
                type="text"
                placeholder="e.g., Jan 15-20, 2025 or 5 days"
                value={dates}
                onChange={(e) => setDates(e.target.value)}
                className="rounded-xl"
              />
            </div>

            {/* Purpose of Trip */}
            <div>
              <label className="mb-3 block text-sm font-medium">Purpose of Trip</label>
              <div className="flex flex-wrap gap-2">
                {purposes.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => togglePurpose(p.id)}
                    className={cn(
                      'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all',
                      selectedPurposes.includes(p.id)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    <span>{p.icon}</span>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* PAX */}
            <div>
              <label className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4 text-muted-foreground" />
                Travelers (PAX)
              </label>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={() => setTravelers(Math.max(1, travelers - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center text-xl font-semibold">{travelers}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={() => setTravelers(travelers + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Food Selection */}
            <div>
              <label className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Utensils className="h-4 w-4 text-muted-foreground" />
                Food Preference
              </label>
              <div className="grid grid-cols-3 gap-2">
                {foodPreferences.map((f) => (
                  <Card
                    key={f.id}
                    className={cn(
                      'cursor-pointer p-3 text-center transition-all',
                      selectedFood.includes(f.id)
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'hover:border-muted-foreground/30'
                    )}
                    onClick={() => toggleFood(f.id)}
                  >
                    <span className="text-2xl">{f.icon}</span>
                    <p className="mt-1 text-xs font-medium">{f.label}</p>
                  </Card>
                ))}
              </div>
            </div>

            {/* Places to Visit */}
            <div>
              <label className="mb-3 flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Places to Visit
              </label>
              <div className="flex flex-wrap gap-2">
                {placeTypes.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => togglePlace(p.id)}
                    className={cn(
                      'rounded-full px-4 py-2 text-sm font-medium transition-all',
                      selectedPlaces.includes(p.id)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Find Perfect Trips CTA */}
            <Button 
              onClick={handleGenerate}
              className="w-full gap-2 rounded-xl py-6 text-base"
              size="lg"
            >
              Find Perfect Trips
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
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
                <X className="h-5 w-5" />
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
                Add {extractedPlaces.filter(p => p.selected).length} Places
              </Button>
            </div>
          </div>
        </div>
      )}

      {step !== 'generating' && step !== 'review-extracted' && <BottomNav />}

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
