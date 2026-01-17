import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/navigation/BottomNav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Link2, Mic, Camera, Sparkles, ArrowLeft, Settings, 
  Calendar, Users, Plus, Minus, ChevronRight, Utensils, MapPin 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type FlowStep = 'hero' | 'preferences' | 'generating';

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

export default function CreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<FlowStep>('hero');
  const [tripDescription, setTripDescription] = useState('');
  const [selectedPurposes, setSelectedPurposes] = useState<string[]>([]);
  const [selectedFood, setSelectedFood] = useState<string[]>([]);
  const [selectedPlaces, setSelectedPlaces] = useState<string[]>([]);
  const [travelers, setTravelers] = useState(2);
  const [dates, setDates] = useState('');

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

  const handleGenerate = () => {
    setStep('generating');
    toast.success('Generating your personalized itinerary...');
    setTimeout(() => {
      navigate('/trip/trip-kyoto-1');
    }, 2000);
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

              {/* Import Option Pills */}
              <div className="mt-4 flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2 rounded-full"
                  onClick={() => setTripDescription('https://youtube.com/watch?v=...')}
                >
                  <Link2 className="h-4 w-4" />
                  Link
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2 rounded-full"
                >
                  <Mic className="h-4 w-4" />
                  Voice
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2 rounded-full"
                >
                  <Camera className="h-4 w-4" />
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

      {step !== 'generating' && <BottomNav />}
    </div>
  );
}
