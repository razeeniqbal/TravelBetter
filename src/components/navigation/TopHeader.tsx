import { Search, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TopHeaderProps {
  title?: string;
  showSearch?: boolean;
}

export function TopHeader({ title = 'TravelBetter', showSearch = true }: TopHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="bg-gradient-to-r from-primary to-accent bg-clip-text text-xl font-bold text-transparent">
          {title}
        </h1>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Bell className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {showSearch && (
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search destinations, trips..."
              className="pl-10 bg-muted/50 border-0"
            />
          </div>
        </div>
      )}
    </header>
  );
}
