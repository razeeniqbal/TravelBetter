import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Copy, Link2, MessageCircle, Mail, Check } from 'lucide-react';

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  url: string;
}

export function ShareModal({ open, onOpenChange, title, url }: ShareModalProps) {
  const [isPublic, setIsPublic] = useState(true);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({
      title: 'Link copied!',
      description: 'The link has been copied to your clipboard.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async (platform: 'whatsapp' | 'email') => {
    const text = `Check out this trip: ${title}`;
    
    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank');
    } else if (platform === 'email') {
      window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`, '_blank');
    }
    
    onOpenChange(false);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url,
        });
        onOpenChange(false);
      } catch (err) {
        // User cancelled
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Trip</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Privacy Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="public">Public Trip</Label>
              <p className="text-sm text-muted-foreground">
                {isPublic ? 'Anyone with the link can view' : 'Only you can view'}
              </p>
            </div>
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          {/* Copy Link */}
          <div className="space-y-2">
            <Label>Trip Link</Label>
            <div className="flex gap-2">
              <Input
                value={url}
                readOnly
                className="bg-muted"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Share Options */}
          <div className="space-y-2">
            <Label>Share via</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => handleShare('whatsapp')}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => handleShare('email')}
              >
                <Mail className="h-4 w-4" />
                Email
              </Button>
            </div>
          </div>

          {/* Native Share (if supported) */}
          {typeof navigator !== 'undefined' && navigator.share && (
            <Button
              className="w-full gap-2"
              onClick={handleNativeShare}
            >
              <Link2 className="h-4 w-4" />
              More Options
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
