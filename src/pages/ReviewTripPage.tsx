import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { X, Star, ArrowRight, ChevronRight } from 'lucide-react';
import { sampleTrips } from '@/data/sampleTrips';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const vibes = [
  { id: 'adventure', label: 'Adventure', icon: '🏔️' },
  { id: 'relaxing', label: 'Relaxing', icon: '🧘' },
  { id: 'foodie', label: 'Foodie', icon: '🍜' },
  { id: 'culture', label: 'Culture', icon: '🏛️' },
  { id: 'romantic', label: 'Romantic', icon: '💕' },
];

export default function ReviewTripPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState<'overview' | 'day-review'>('overview');
  const [activeDay, setActiveDay] = useState(1);
  const [selectedVibes, setSelectedVibes] = useState<string[]>(['adventure']);
  const [rating, setRating] = useState(4);
  const [notes, setNotes] = useState('');

  const trip = sampleTrips.find(t => t.id === tripId) || sampleTrips[0];
  const currentDayItinerary = trip.itinerary.find(d => d.day === activeDay);

  const toggleVibe = (id: string) => {
    setSelectedVibes(prev => 
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    toast.success('Review submitted! Thank you for sharing.');
    navigate(`/trip/${tripId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Trip Details</p>
          <h1 className="text-lg font-semibold">Day {activeDay} Review</h1>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="rounded-full"
        >
          <X className="h-5 w-5" />
        </Button>
      </header>

      {step === 'overview' && (
        <div className="p-4">
          {/* Hero */}
          <div className="text-center py-6">
            <h2 className="text-xl font-bold text-foreground">Review and share your trip!</h2>
            <p className="mt-2 text-muted-foreground">
              How was your experience in {trip.destination}, {trip.country}?
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Badge variant="outline">{trip.createdAt}</Badge>
              <Badge className="bg-primary/10 text-primary">ITINERARY HIGHLIGHTS</Badge>
            </div>
          </div>

          {/* Timeline Preview */}
          <div className="space-y-3">
            {currentDayItinerary?.places.slice(0, 3).map((place, idx) => (
              <div key={place.id} className="flex gap-3">
                <div className="relative flex flex-col items-center">
                  <div className="flex h-3 w-3 items-center justify-center rounded-full bg-primary" />
                  {idx < 2 && <div className="w-0.5 flex-1 bg-border" />}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{place.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {9 + idx * 2}:00 AM
                    </Badge>
                  </div>
                  {place.imageUrl && (
                    <div className="mt-2 h-24 overflow-hidden rounded-lg">
                      <img 
                        src={place.imageUrl} 
                        alt={place.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Button 
            onClick={() => setStep('day-review')}
            className="mt-6 w-full gap-2 rounded-xl py-6"
          >
            Start Review
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      )}

      {step === 'day-review' && (
        <div className="p-4">
          {/* Day Header */}
          <div className="mb-6">
            <Badge variant="secondary" className="mb-2">{trip.createdAt}</Badge>
            <h2 className="text-3xl font-bold text-foreground">Day {activeDay}</h2>
            <p className="text-muted-foreground">{currentDayItinerary?.title || 'Exploring the city'}</p>
          </div>

          {/* Photo Carousel */}
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-2">
            {currentDayItinerary?.places.map((place) => (
              <div 
                key={place.id} 
                className="h-20 w-20 shrink-0 overflow-hidden rounded-lg"
              >
                <img 
                  src={place.imageUrl || 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=100&h=100&fit=crop'} 
                  alt={place.name}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>

          {/* Vibe Selection */}
          <div className="mt-6">
            <label className="mb-3 block text-sm font-medium">What was the vibe?</label>
            <div className="flex flex-wrap gap-2">
              {vibes.map((vibe) => (
                <button
                  key={vibe.id}
                  onClick={() => toggleVibe(vibe.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all',
                    selectedVibes.includes(vibe.id)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  <span>{vibe.icon}</span>
                  {vibe.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div className="mt-6">
            <label className="mb-3 block text-sm font-medium">Rate your day</label>
            <div className="flex items-center gap-4">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star 
                      className={cn(
                        'h-8 w-8 transition-colors',
                        star <= rating 
                          ? 'fill-amber-400 text-amber-400' 
                          : 'text-muted-foreground/30'
                      )} 
                    />
                  </button>
                ))}
              </div>
              <span className="text-2xl font-bold text-foreground">{rating}.0</span>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-6">
            <label className="mb-3 block text-sm font-medium">Your Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What made this day special? Any tips for future travelers?"
              className="min-h-[100px] resize-none rounded-xl"
            />
          </div>

          {/* Submit Button */}
          <Button 
            onClick={handleSubmit}
            className="mt-6 w-full gap-2 rounded-xl py-6"
          >
            Submit Review
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
