import { Link, useLocation } from 'react-router-dom';
import { Home, Plane, Map, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/trips', icon: Plane, label: 'Trips' },
  { path: '/explore', icon: Map, label: 'Explore' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const location = useLocation();
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-lg">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {/* Left side nav items */}
        {navItems.slice(0, 2).map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-3 transition-colors',
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn(
                'h-5 w-5 transition-transform',
                isActive && 'scale-110'
              )} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}

        {/* Center FAB */}
        <div className="relative flex flex-1 items-center justify-center py-2">
          <div className="-mt-6">
            <FloatingActionButton />
          </div>
        </div>

        {/* Right side nav items */}
        {navItems.slice(2).map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-3 transition-colors',
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn(
                'h-5 w-5 transition-transform',
                isActive && 'scale-110'
              )} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
