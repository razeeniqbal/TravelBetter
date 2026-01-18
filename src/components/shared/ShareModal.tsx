import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Copy, Link2, MessageCircle, Mail, Check, FileDown, Globe, Lock } from 'lucide-react';
import { useTripPrivacy } from '@/hooks/useTripPrivacy';

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  url: string;
  tripId?: string;
  isPublic?: boolean;
  isOwner?: boolean;
}

export function ShareModal({ 
  open, 
  onOpenChange, 
  title, 
  url, 
  tripId,
  isPublic = true,
  isOwner = false,
}: ShareModalProps) {
  const [localIsPublic, setLocalIsPublic] = useState(isPublic);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const privacyMutation = useTripPrivacy(tripId || '');

  useEffect(() => {
    setLocalIsPublic(isPublic);
  }, [isPublic]);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({
      title: 'Link copied!',
      description: 'The link has been copied to your clipboard.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrivacyToggle = async (newValue: boolean) => {
    if (!isOwner || !tripId) {
      setLocalIsPublic(newValue);
      return;
    }
    
    setLocalIsPublic(newValue);
    privacyMutation.mutate(newValue);
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

  const handleExportPDF = () => {
    toast({
      title: 'Coming soon!',
      description: 'PDF export will be available in a future update.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Trip</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Privacy Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              {localIsPublic ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <Globe className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                  <Lock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
              )}
              <div>
                <Label htmlFor="public" className="font-medium">
                  {localIsPublic ? 'Public Trip' : 'Private Trip'}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {localIsPublic ? 'Anyone with the link can view' : 'Only you can view'}
                </p>
              </div>
            </div>
            <Switch
              id="public"
              checked={localIsPublic}
              onCheckedChange={handlePrivacyToggle}
              disabled={!isOwner && !!tripId}
            />
          </div>

          {/* Warning for private trips */}
          {!localIsPublic && (
            <div className="rounded-lg bg-orange-50 p-3 text-sm text-orange-800 dark:bg-orange-900/20 dark:text-orange-200">
              ⚠️ This trip is private. Make it public to share with others.
            </div>
          )}

          {/* Copy Link */}
          <div className="space-y-2">
            <Label>Trip Link</Label>
            <div className="flex gap-2">
              <Input
                value={url}
                readOnly
                className="bg-muted font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Share Options */}
          <div className="space-y-2">
            <Label>Share via</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => handleShare('whatsapp')}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => handleShare('email')}
              >
                <Mail className="h-4 w-4" />
                Email
              </Button>
            </div>
          </div>

          {/* Export PDF */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleExportPDF}
          >
            <FileDown className="h-4 w-4" />
            Export as PDF
          </Button>

          {/* Native Share (if supported) */}
          {typeof navigator !== 'undefined' && navigator.share && (
            <Button
              className="w-full gap-2"
              onClick={handleNativeShare}
            >
              <Link2 className="h-4 w-4" />
              More Sharing Options
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
