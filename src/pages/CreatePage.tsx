import { useState } from 'react';
import { BottomNav } from '@/components/navigation/BottomNav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, FileText, Youtube, Instagram, Copy, Link2, Loader2, CheckCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type ImportSource = 'screenshot' | 'text' | 'youtube' | 'instagram' | 'rednote' | 'remix';
type FlowStep = 'select' | 'uploading' | 'analyzing' | 'personalize' | 'preview';

const importOptions = [
  { id: 'screenshot' as ImportSource, icon: Camera, label: 'Screenshot', desc: 'Upload a travel screenshot' },
  { id: 'text' as ImportSource, icon: FileText, label: 'Paste Text', desc: 'Paste from notes or blogs' },
  { id: 'youtube' as ImportSource, icon: Youtube, label: 'YouTube', desc: 'Import from video' },
  { id: 'instagram' as ImportSource, icon: Instagram, label: 'Instagram', desc: 'Import from post/reel' },
  { id: 'rednote' as ImportSource, icon: Link2, label: 'RedNote', desc: 'Import from 小红书' },
  { id: 'remix' as ImportSource, icon: Copy, label: 'Copy Trip', desc: "Remix someone's trip" },
];

const purposes = [
  { id: 'food', icon: '🍜', label: 'Food' },
  { id: 'culture', icon: '🏛️', label: 'Culture' },
  { id: 'nature', icon: '🌳', label: 'Nature' },
  { id: 'shop', icon: '🛍️', label: 'Shopping' },
  { id: 'night', icon: '🌃', label: 'Nightlife' },
  { id: 'photo', icon: '📸', label: 'Photography' },
];

const travelers = ['Solo', 'Couple', 'Family', 'Friends', 'Group'];

export default function CreatePage() {
  const [step, setStep] = useState<FlowStep>('select');
  const [selectedSource, setSelectedSource] = useState<ImportSource | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedPurposes, setSelectedPurposes] = useState<string[]>([]);
  const [selectedTraveler, setSelectedTraveler] = useState<string>('');

  const handleImport = (source: ImportSource) => {
    setSelectedSource(source);
    setStep('uploading');
    
    // Simulate upload
    let p = 0;
    const interval = setInterval(() => {
      p += 10;
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setStep('analyzing');
        setTimeout(() => setStep('personalize'), 2000);
      }
    }, 200);
  };

  const handlePersonalize = () => {
    toast.success('Trip created! Redirecting to your itinerary...');
    setStep('select');
    setSelectedSource(null);
    setProgress(0);
    setSelectedPurposes([]);
    setSelectedTraveler('');
  };

  const togglePurpose = (id: string) => {
    setSelectedPurposes(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="border-b px-4 py-4">
        <h1 className="text-xl font-bold">Create New Trip</h1>
        <p className="text-sm text-muted-foreground">Import from anywhere, personalize with AI</p>
      </header>

      {step === 'select' && (
        <div className="grid grid-cols-2 gap-3 p-4">
          {importOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <Card
                key={opt.id}
                className="cursor-pointer p-4 transition-all hover:shadow-travel hover:-translate-y-0.5"
                onClick={() => handleImport(opt.id)}
              >
                <Icon className="h-8 w-8 text-primary" />
                <h3 className="mt-2 font-semibold">{opt.label}</h3>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </Card>
            );
          })}
        </div>
      )}

      {(step === 'uploading' || step === 'analyzing') && (
        <div className="flex flex-col items-center justify-center px-4 py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg font-medium">
            {step === 'uploading' ? 'Uploading...' : 'Analyzing your content...'}
          </p>
          {step === 'uploading' && (
            <div className="mt-4 h-2 w-48 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
          {step === 'analyzing' && (
            <p className="mt-2 text-sm text-muted-foreground animate-pulse">
              Finding places, extracting details...
            </p>
          )}
        </div>
      )}

      {step === 'personalize' && (
        <div className="p-4 space-y-6">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Found 8 places from your content!</span>
          </div>

          <div>
            <h3 className="font-semibold mb-3">What's your travel focus?</h3>
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

          <div>
            <h3 className="font-semibold mb-3">Who's traveling?</h3>
            <div className="flex flex-wrap gap-2">
              {travelers.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTraveler(t)}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-medium transition-all',
                    selectedTraveler === t
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handlePersonalize} className="w-full gap-2" size="lg">
            <Sparkles className="h-5 w-5" />
            Generate My Personalized Trip
          </Button>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
