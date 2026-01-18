import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ExamplePromptsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: string) => void;
  destination?: string;
}

const templates = [
  {
    id: 'foodie-couple',
    title: 'Foodie Couple',
    icon: '🍜💑',
    description: 'Perfect for couples who love exploring local cuisine',
    template: (dest: string) => 
      `We're a couple traveling to ${dest || '[destination]'} who are obsessed with food! Looking for authentic local restaurants, street food spots, and hidden culinary gems. We prefer places with vegetarian options and love trying regional specialties. Suggest breakfast, lunch, and dinner spots with a mix of casual and upscale dining.`,
  },
  {
    id: 'family-trip',
    title: 'Family Adventure',
    icon: '👨‍👩‍👧🎢',
    description: 'Kid-friendly activities and easy logistics',
    template: (dest: string) => 
      `We're a family with young kids visiting ${dest || '[destination]'}. Looking for kid-friendly attractions, parks, interactive museums, and activities that keep children engaged. We need places with easy access, family restrooms, and nearby snack options. Balance of fun and educational experiences appreciated!`,
  },
  {
    id: 'solo-adventure',
    title: 'Solo Explorer',
    icon: '🧑🎒',
    description: 'Off-the-beaten-path discoveries',
    template: (dest: string) => 
      `I'm traveling solo to ${dest || '[destination]'} and want authentic local experiences. Looking for hidden gems, cozy cafes perfect for people-watching, nature spots for reflection, and safe neighborhoods to explore on foot. I enjoy photography and connecting with local culture. Mix of popular highlights and lesser-known spots please!`,
  },
  {
    id: 'photography-tour',
    title: 'Photo Safari',
    icon: '📸🌅',
    description: 'The most photogenic spots and best timing',
    template: (dest: string) => 
      `I'm a photographer visiting ${dest || '[destination]'}. Looking for the most photogenic locations including sunrise/sunset spots, unique architecture, vibrant street scenes, and natural landscapes. Please include best times to visit for optimal lighting and any spots that are especially Instagram-worthy but not overcrowded.`,
  },
];

export function ExamplePrompts({
  open,
  onOpenChange,
  onSelectTemplate,
  destination,
}: ExamplePromptsProps) {
  const handleSelect = (template: (dest: string) => string) => {
    onSelectTemplate(template(destination || ''));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>💡</span>
            Example Prompts
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Use these as inspiration or apply directly to your trip
        </p>

        <div className="space-y-3 mt-2">
          {templates.map((t) => (
            <Card 
              key={t.id} 
              className="p-4 hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => handleSelect(t.template)}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{t.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground">{t.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.description}
                  </p>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="h-auto p-0 mt-2 text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(t.template);
                    }}
                  >
                    Use this prompt →
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
