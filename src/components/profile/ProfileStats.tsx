import { Card } from '@/components/ui/card';
import { MapPin, Calendar, Copy, Eye, GitFork } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileStatsProps {
  countriesVisited: number;
  tripsCreated: number;
  tripsRemixed: number;
  totalViews?: number;
  totalRemixesReceived?: number;
  className?: string;
}

export function ProfileStats({
  countriesVisited,
  tripsCreated,
  tripsRemixed,
  totalViews = 0,
  totalRemixesReceived = 0,
  className,
}: ProfileStatsProps) {
  const stats = [
    {
      icon: MapPin,
      value: countriesVisited,
      label: 'Countries',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      icon: Calendar,
      value: tripsCreated,
      label: 'Trips Created',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      icon: Copy,
      value: tripsRemixed,
      label: 'Trips Remixed',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
  ];

  const secondaryStats = [
    {
      icon: GitFork,
      value: totalRemixesReceived,
      label: 'Your trips remixed',
    },
    {
      icon: Eye,
      value: totalViews,
      label: 'Total views',
    },
  ];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Primary Stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4 text-center">
            <div className={cn('mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full', stat.bgColor)}>
              <stat.icon className={cn('h-5 w-5', stat.color)} />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Secondary Stats */}
      {(totalViews > 0 || totalRemixesReceived > 0) && (
        <div className="flex justify-center gap-6 py-2">
          {secondaryStats.map((stat) => (
            stat.value > 0 && (
              <div key={stat.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <stat.icon className="h-4 w-4" />
                <span className="font-medium text-foreground">{stat.value}</span>
                <span>{stat.label}</span>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
