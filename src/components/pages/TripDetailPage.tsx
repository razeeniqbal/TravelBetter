"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { DraggableTimeline } from '@/components/trip/DraggableTimeline';
import { MapPlaceholder } from '@/components/trip/MapPlaceholder';
import { ShareModal } from '@/components/shared/ShareModal';
import { AddToItineraryDialog } from '@/components/trip/AddToItineraryDialog';
import { AnchorSelector } from '@/components/trip/AnchorSelector';
import { AddPlacesOptionsDialog } from '@/components/trip/AddPlacesOptionsDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BottomSheet, BottomSheetContent, BottomSheetDescription, BottomSheetTitle } from '@/components/ui/bottom-sheet';
import { TimelinePlace } from '@/components/trip/TimelinePlace';
import { ArrowLeft, MoreHorizontal, Plus, Share2, ListPlus, GitFork, Home, User, Sparkles, Pencil, Save, X, Loader2, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useTripDetail } from '@/hooks/useTripDetail';
import { useTripEdit } from '@/hooks/useTripEdit';
import { useRemixTrip } from '@/hooks/useRemixTrip';
import { useCreateDayItinerary } from '@/hooks/useUserTrips';
import { supabase } from '@/integrations/supabase/client';
import { AUTH_DISABLED } from '@/lib/flags';

interface TripDetailPageContentProps {
  tripId: string;
}

export default function TripDetailPageContent({ tripId }: TripDetailPageContentProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeDay, setActiveDay] = useState(1);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [addToItineraryOpen, setAddToItineraryOpen] = useState(false);
  const [anchorSelectorOpen, setAnchorSelectorOpen] = useState(false);
  const [addPlacesDialogOpen, setAddPlacesDialogOpen] = useState(false);
  const [isAddingDay, setIsAddingDay] = useState(false);
  const snapPoints = useMemo(() => [0.2, 0.55, 0.9], []);
  const [activeSnapPoint, setActiveSnapPoint] = useState<number | string | null>(snapPoints[0]);
  const [showSwipeHint, setShowSwipeHint] = useState(true);

  const handleSnapPointChange = useCallback((value: number | string | null) => {
    setActiveSnapPoint((prev) => {
      if (prev !== value) {
        setShowSwipeHint(false);
      }
      return value;
    });
  }, []);
  
  // Fetch trip from database
  const { data: trip, isLoading } = useTripDetail(tripId);
  const tripEdit = useTripEdit(tripId);
  const remixMutation = useRemixTrip();
  const createDayMutation = useCreateDayItinerary();

  const isOwnTrip = trip && !AUTH_DISABLED && user && trip.user_id === user.id;

  const handleDayTimestampChange = (dayIndex: number, timestamp: string) => {
    if (!trip) return;
    const updatedDays = [...trip.days];
    updatedDays[dayIndex] = {
      ...updatedDays[dayIndex],
      timestamp,
    };
    tripEdit.mutate({ days: updatedDays });
  };

  const handleAddDay = async () => {
    if (!trip) return;
    setIsAddingDay(true);
    try {
      await createDayMutation.mutateAsync({
        trip_id: tripId,
        day_number: trip.days.length + 1,
      });
      await new Promise(resolve => setTimeout(resolve, 500));
      setActiveDay(trip.days.length + 1);
    } finally {
      setIsAddingDay(false);
    }
  };

  const handleRemixTrip = async () => {
    try {
      const newTripId = await remixMutation.mutateAsync(trip!);
      router.push(`/trip/${newTripId}`);
    } catch (error) {
      console.error('Error remixing trip:', error);
      toast.error('Failed to remix trip');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <p className="text-muted-foreground">Trip not found</p>
        <Button onClick={() => router.push('/')} className="mt-4">
          Back to Home
        </Button>
      </div>
    );
  }

  const currentDay = trip.days[activeDay - 1];

  return (
    <div className="relative flex min-h-screen flex-col bg-background pb-0">
      {/* Map Section */}
      <MapPlaceholder places={currentDay?.places || []} />

      {/* Header */}
      <div className="absolute left-0 right-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/20 to-transparent px-4 py-4 z-40">
        <button
          onClick={() => router.push('/')}
          className="rounded-full bg-white/80 p-2 backdrop-blur-sm transition-colors hover:bg-white"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => setShareModalOpen(true)}
            className="rounded-full bg-white/80 p-2 backdrop-blur-sm transition-colors hover:bg-white"
          >
            <Share2 className="h-5 w-5 text-foreground" />
          </button>
          {!isOwnTrip && (
            <button
              onClick={handleRemixTrip}
              className="rounded-full bg-white/80 p-2 backdrop-blur-sm transition-colors hover:bg-white"
            >
              <GitFork className="h-5 w-5 text-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Sheet with Itinerary */}
      <BottomSheet open={true} onOpenChange={() => {}}>
        <BottomSheetContent className="flex h-full max-h-[90vh] flex-col">
          <BottomSheetTitle className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{trip.title}</h1>
              <p className="text-sm text-muted-foreground">{trip.destination}</p>
            </div>
            {isOwnTrip && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push(`/trip/${tripId}/review`)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </BottomSheetTitle>

          <div className="flex-1 overflow-y-auto">
            <DraggableTimeline
              trip={trip}
              activeDay={activeDay}
              onDayChange={setActiveDay}
              onTimestampChange={handleDayTimestampChange}
              isEditing={isOwnTrip}
            />

            {/* Day Details */}
            {currentDay && (
              <div className="space-y-4 px-4 py-4">
                {currentDay.places?.map((place, idx) => (
                  <TimelinePlace key={idx} place={place} dayIndex={activeDay - 1} isEditing={isOwnTrip} />
                ))}
              </div>
            )}
          </div>

          {/* Actions Footer */}
          {isOwnTrip && (
            <div className="border-t bg-background p-4">
              <div className="flex gap-2">
                <Button
                  onClick={() => setAddToItineraryOpen(true)}
                  className="flex-1 gap-2"
                >
                  <ListPlus className="h-4 w-4" />
                  Add Place
                </Button>
                <Button
                  onClick={handleAddDay}
                  disabled={isAddingDay}
                  variant="outline"
                  className="flex-1 gap-2 bg-transparent"
                >
                  <Plus className="h-4 w-4" />
                  Add Day
                </Button>
              </div>
            </div>
          )}
        </BottomSheetContent>
      </BottomSheet>

      {/* Modals */}
      <ShareModal open={shareModalOpen} onOpenChange={setShareModalOpen} trip={trip} />
      <AddToItineraryDialog open={addToItineraryOpen} onOpenChange={setAddToItineraryOpen} tripId={tripId} dayIndex={activeDay - 1} />
      <AnchorSelector open={anchorSelectorOpen} onOpenChange={setAnchorSelectorOpen} />
      <AddPlacesOptionsDialog open={addPlacesDialogOpen} onOpenChange={setAddPlacesDialogOpen} tripId={tripId} dayIndex={activeDay - 1} />
    </div>
  );
}
