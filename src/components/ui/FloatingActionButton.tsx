import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface FloatingActionButtonProps {
  to?: string;
  onClick?: () => void;
  className?: string;
}

export function FloatingActionButton({ to = '/create', onClick, className }: FloatingActionButtonProps) {
  const buttonContent = (
    <div className={cn(
      'flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all',
      'hover:scale-110 hover:shadow-xl active:scale-95',
      className
    )}>
      <Plus className="h-6 w-6" strokeWidth={2.5} />
    </div>
  );

  if (to) {
    return <Link to={to}>{buttonContent}</Link>;
  }

  return <button onClick={onClick}>{buttonContent}</button>;
}
