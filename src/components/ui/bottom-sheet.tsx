import * as React from 'react';
import { Drawer } from 'vaul';

import { cn } from '@/lib/utils';

const BottomSheet = Drawer.Root;
const BottomSheetTrigger = Drawer.Trigger;
const BottomSheetPortal = Drawer.Portal;
const BottomSheetOverlay = Drawer.Overlay;
const BottomSheetTitle = Drawer.Title;
const BottomSheetDescription = Drawer.Description;

interface BottomSheetContentProps extends React.ComponentPropsWithoutRef<typeof Drawer.Content> {
  showHandle?: boolean;
  showOverlay?: boolean;
}

const BottomSheetContent = React.forwardRef<
  React.ElementRef<typeof Drawer.Content>,
  BottomSheetContentProps
>(({ className, children, showHandle = true, showOverlay = false, ...props }, ref) => (
  <BottomSheetPortal>
    {showOverlay && (
      <Drawer.Overlay className="fixed inset-0 z-30 bg-transparent pointer-events-none" />
    )}
      <Drawer.Content
        ref={ref}
        className={cn(
          'pointer-events-auto fixed inset-x-0 bottom-0 z-[70] flex h-[95vh] max-h-[95vh] flex-col overflow-hidden rounded-t-[28px] border border-border/60 bg-background/95 shadow-[0_-18px_40px_-24px_rgba(0,0,0,0.45)] backdrop-blur supports-[height:100dvh]:h-[95dvh] supports-[height:100dvh]:max-h-[95dvh]',
          className
        )}
        {...props}
      >
      {showHandle && (
        <div className="flex justify-center pt-3">
          <Drawer.Handle className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
        </div>
      )}
      {children}
    </Drawer.Content>
  </BottomSheetPortal>
));
BottomSheetContent.displayName = 'BottomSheetContent';

export {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetOverlay,
  BottomSheetPortal,
  BottomSheetTitle,
  BottomSheetTrigger,
};
