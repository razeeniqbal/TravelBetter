import { GitFork, Eye, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RemixChain {
  tripId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar?: string;
}

interface AttributionBadgeProps {
  author: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  remixCount?: number;
  viewCount?: number;
  remixChain?: RemixChain[];
  className?: string;
  variant?: 'compact' | 'full';
}

export function AttributionBadge({
  author,
  remixCount = 0,
  viewCount = 0,
  remixChain = [],
  className,
  variant = 'compact',
}: AttributionBadgeProps) {
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={author.avatar} />
            <AvatarFallback className="text-xs">
              {author.name[0]}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">@{author.username}</span>
        </div>
        
        {remixCount > 0 && (
          <Badge variant="secondary" className="gap-1 text-xs">
            <GitFork className="h-3 w-3" />
            {remixCount}
          </Badge>
        )}
        
        {viewCount > 0 && (
          <Badge variant="outline" className="gap-1 text-xs">
            <Eye className="h-3 w-3" />
            {viewCount}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-3 rounded-lg border bg-card p-4', className)}>
      {/* Original Creator */}
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={author.avatar} />
          <AvatarFallback>{author.name[0]}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">Originally planned by</p>
          <p className="text-sm text-primary">@{author.username}</p>
        </div>
      </div>

      {/* Remix Chain */}
      {remixChain.length > 0 && (
        <div className="border-t pt-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Remix history
          </p>
          <div className="space-y-2">
            {remixChain.map((remix, index) => (
              <div key={remix.tripId} className="flex items-center gap-2 text-sm">
                <GitFork className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">↓</span>
                <Avatar className="h-5 w-5">
                  <AvatarImage src={remix.authorAvatar} />
                  <AvatarFallback className="text-[10px]">
                    {remix.authorName[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-primary">@{remix.authorUsername}</span>
                {index === remixChain.length - 1 && (
                  <span className="text-muted-foreground">(current)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-4 border-t pt-3">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <GitFork className="h-4 w-4" />
          <span>{remixCount} remixed</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Eye className="h-4 w-4" />
          <span>{viewCount} views</span>
        </div>
      </div>
    </div>
  );
}
