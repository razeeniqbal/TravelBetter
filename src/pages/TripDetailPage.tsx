import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { DraggableTimeline } from '@/components/trip/DraggableTimeline';
import { MapPlaceholder } from '@/components/trip/MapPlaceholder';
import { ShareModal } from '@/components/shared/ShareModal';
import { AddToItineraryDialog } from '@/components/trip/AddToItineraryDialog';
import { AnchorSelector } from '@/components/trip/AnchorSelector';
import { AddPlacesOptionsDialog } from '@/components/trip/AddPlacesOptionsDialog';
import { DayPlaceSearchDialog } from '@/components/trip/DayPlaceSearchDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BottomSheet, BottomSheetContent, BottomSheetDescription, BottomSheetTitle } from '@/components/ui/bottom-sheet';
import { TimelinePlace } from '@/components/trip/TimelinePlace';
import { ArrowLeft, MoreHorizontal, Plus, Share2, ListPlus, GitFork, Home, User, Sparkles, Pencil, Save, X, Loader2, ChevronUp, ClipboardCheck, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getGoogleMapsPlaceUrl, getGoogleMapsRouteUrl } from '@/lib/googleMaps';
import { buildDisplayTimes } from '@/lib/placeTiming';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useTripDetail } from '@/hooks/useTripDetail';
import { useTripEdit } from '@/hooks/useTripEdit';
import { useRemixTrip } from '@/hooks/useRemixTrip';
import { useAddPlaceToItinerary, useCreateDayItinerary, useTripDays } from '@/hooks/useUserTrips';
import { useDeleteTrip } from '@/hooks/useTripMutations';
import { supabase } from '@/integrations/supabase/client';
import { AUTH_DISABLED } from '@/lib/flags';
import { api } from '@/lib/api';
import type { Place } from '@/types/trip';
import type { PlaceSearchResult } from '@/types/itinerary';
import {
  TRIP_DETAIL_SHEET_STATE,
  TRIP_DETAIL_SNAP_POINTS,
  resolveTripDetailSheetState,
} from '@/pages/tripDetailSheetState';

export default function TripDetailPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeDay, setActiveDay] = useState(1);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [addToItineraryOpen, setAddToItineraryOpen] = useState(false);
  const [anchorSelectorOpen, setAnchorSelectorOpen] = useState(false);
  const [addPlacesDialogOpen, setAddPlacesDialogOpen] = useState(false);
  const [dayPlaceSearchOpen, setDayPlaceSearchOpen] = useState(false);
  const [isAddingSelectedPlace, setIsAddingSelectedPlace] = useState(false);
  const [isAddingDay, setIsAddingDay] = useState(false);
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
  const [focusedPlaceId, setFocusedPlaceId] = useState<string | null>(null);
  const [timingOverrides, setTimingOverrides] = useState<Record<string, {
    arrivalTime?: string;
    stayDurationMinutes: number;
    commuteDurationMinutes?: number;
    commuteDistanceMeters?: number;
  }>>({});
  const [shareRestoreSnapPoint, setShareRestoreSnapPoint] = useState<number | string | null>(null);
  const snapPoints = [...TRIP_DETAIL_SNAP_POINTS];
  const [activeSnapPoint, setActiveSnapPoint] = useState<number | string | null>(snapPoints[0]);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const [markerPreviewActive, setMarkerPreviewActive] = useState(false);
  const latestMarkerSelectionRef = useRef(0);
  const itineraryListContainerRef = useRef<HTMLDivElement | null>(null);
  const [selectionScrollTick, setSelectionScrollTick] = useState(0);
  const [showDeleteTripDialog, setShowDeleteTripDialog] = useState(false);

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
  const { data: tripDays = [] } = useTripDays(tripId || null);

  // Must call all hooks before any early returns
  const remixMutation = useRemixTrip();
  const deleteTripMutation = useDeleteTrip();
  const createDayItinerary = useCreateDayItinerary();
  const addPlaceToItinerary = useAddPlaceToItinerary();

  const isOwner = user?.id === trip?.author.id;

  const {
    isEditMode,
    hasUnsavedChanges,
    toggleEditMode,
    itinerary,
    reorderPlaces,
    movePlaceBetweenDays,
    removePlace,
    removeDay,
    anchorPlaceId,
    setAsAnchor,
    saveChanges,
    discardChanges,
    isSaving,
  } = useTripEdit({
    tripId: tripId || '',
    initialItinerary: trip?.itinerary || [],
    isOwner,
  });

  // Reset itinerary when trip changes
  useEffect(() => {
    if (trip) {
      discardChanges();
    }
  }, [discardChanges, trip]);

  // useEffect(() => {
  //   if (!showSwipeHint) return;
  //   const timeout = setTimeout(() => setShowSwipeHint(false), 2500);
  //   return () => clearTimeout(timeout);
  // }, [showSwipeHint]);

  useEffect(() => {
    if (!isEditMode || !hasUnsavedChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, isEditMode]);

  useEffect(() => {
    setFocusedPlaceId(null);
    setMarkerPreviewActive(false);
  }, [activeDay, isEditMode]);

  const sheetState = resolveTripDetailSheetState(activeSnapPoint, snapPoints);
  const isCollapsed = sheetState === TRIP_DETAIL_SHEET_STATE.minimized;
  const isExpanded = sheetState === TRIP_DETAIL_SHEET_STATE.expanded;

  useEffect(() => {
    if (!focusedPlaceId) return;

    const container = itineraryListContainerRef.current;
    if (!container) return;

    const syncSelectionIntoView = () => {
      const nextContainer = itineraryListContainerRef.current;
      if (!nextContainer) return;

      const target = nextContainer.querySelector<HTMLElement>(`[data-place-id="${focusedPlaceId}"]`);
      if (!target) return;

      const containerRect = nextContainer.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const nextTop = nextContainer.scrollTop + (targetRect.top - containerRect.top) - 8;

      nextContainer.scrollTo({
        top: Math.max(0, nextTop),
        behavior: 'smooth',
      });
    };

    let frameTwo = 0;
    const frameOne = requestAnimationFrame(() => {
      frameTwo = requestAnimationFrame(syncSelectionIntoView);
    });

    return () => {
      cancelAnimationFrame(frameOne);
      if (frameTwo) cancelAnimationFrame(frameTwo);
    };
  }, [focusedPlaceId, activeDay, activeSnapPoint, isEditMode, selectionScrollTick]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground" role="status">Loading trip...</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium">Trip not found</p>
          <Button variant="link" onClick={() => navigate('/')}>Go back home</Button>
        </div>
      </div>
    );
  }

  const currentDayItineraryRaw = itinerary.find(d => d.day === activeDay);
  const totalPlaces = itinerary.reduce((acc, day) => acc + day.places.length, 0);
  const totalWalking = currentDayItineraryRaw?.places.reduce((acc, p) => acc + (p.walkingTimeFromPrevious || 0), 0) || 0;
  const totalWalkingKm = (totalWalking * 0.08).toFixed(1);
  const applyTimingOverride = (place: Place): Place => {
    const override = timingOverrides[place.id];
    if (!override) return place;

    return {
      ...place,
      arrivalTime: override.arrivalTime,
      stayDurationMinutes: override.stayDurationMinutes,
      commuteDurationMinutes: override.commuteDurationMinutes ?? place.commuteDurationMinutes,
      commuteDistanceMeters: override.commuteDistanceMeters ?? place.commuteDistanceMeters,
    };
  };

  const itineraryWithTimingOverrides = itinerary.map((day) => ({
    ...day,
    places: day.places.map(applyTimingOverride),
  }));

  const currentDayItinerary = itineraryWithTimingOverrides.find((day) => day.day === activeDay);
  const previewPlaces = (currentDayItinerary?.places || []).slice(0, 3);
  const mapPlaces = currentDayItinerary?.places || [];
  const markerPreviewPlaces = mapPlaces;
  const selectedPlaceForActions = mapPlaces.find((place) => place.id === focusedPlaceId) || mapPlaces[0];

  const markerPreviewDisplayTimes = buildDisplayTimes(markerPreviewPlaces);
  // Get all places for anchor selection
  const allPlaces = itinerary.flatMap(day => day.places);

  // Count sources for legend
  const userPlacesCount = allPlaces.filter(p => p.source === 'user').length;
  const aiPlacesCount = allPlaces.filter(p => p.source === 'ai').length;

  const handleShare = () => {
    if (isEditMode && hasUnsavedChanges) {
      const shouldContinue = window.confirm(
        'You have unsaved edits. Share without saving your itinerary changes?'
      );
      if (!shouldContinue) return;
    }

    setShareRestoreSnapPoint(activeSnapPoint);
    handleSnapPointChange(snapPoints[0]);
    setShareModalOpen(true);
  };

  const handleShareOpenChange = (open: boolean) => {
    setShareModalOpen(open);

    if (open) return;

    if (shareRestoreSnapPoint !== null) {
      handleSnapPointChange(shareRestoreSnapPoint);
      setShareRestoreSnapPoint(null);
      return;
    }

    if (isEditMode) {
      handleSnapPointChange(snapPoints[2]);
    }
  };

  const handleNavigateBack = () => {
    if (isEditMode && hasUnsavedChanges) {
      const shouldLeave = window.confirm('You have unsaved changes. Discard them and leave this page?');
      if (!shouldLeave) return;
    }

    navigate(-1);
  };

  const handleDiscardChanges = () => {
    if (hasUnsavedChanges) {
      const shouldDiscard = window.confirm('Discard your unsaved itinerary changes?');
      if (!shouldDiscard) return;
    }

    discardChanges();
  };

  const handleAddToItinerary = () => {
    if (!user) {
      toast.info('Please sign in to add to your itinerary');
      navigate('/auth');
      return;
    }

    // Auto-minimize dropdown to reveal map/content behind it
    setMarkerPreviewActive(false);
    handleSnapPointChange(snapPoints[0]);
    setAddToItineraryOpen(true);
  };

  const getSelectedDayItineraryId = () => {
    const selectedDay = tripDays.find((day) => day.day_number === activeDay);
    return selectedDay?.id || null;
  };

  const handleOpenManualPlaceSearch = () => {
    if (!tripId || !isOwner) {
      toast.error('You can only add places to your own trip days');
      return;
    }

    if (isEditMode && hasUnsavedChanges) {
      toast.info('Save or discard your unsaved edits before adding a new place.');
      return;
    }

    const selectedDayItineraryId = getSelectedDayItineraryId();
    if (!selectedDayItineraryId) {
      toast.error('Please select a valid day before adding a place.');
      return;
    }

    setMarkerPreviewActive(false);
    handleSnapPointChange(snapPoints[0]);
    setDayPlaceSearchOpen(true);
  };

  const handleAddSelectedPlace = async (result: PlaceSearchResult) => {
    const selectedDayItineraryId = getSelectedDayItineraryId();
    if (!selectedDayItineraryId || !trip) {
      toast.error('Unable to determine the selected day. Please try again.');
      return;
    }

    const displayName = result.displayName?.trim() || result.formattedAddress?.trim() || 'Selected place';
    const fallbackPlaceId = `manual-place-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const lat = result.coordinates?.lat;
    const lng = result.coordinates?.lng;

    setIsAddingSelectedPlace(true);
    try {
      await addPlaceToItinerary.mutateAsync({
        dayItineraryId: selectedDayItineraryId,
        placeId: result.providerPlaceId || fallbackPlaceId,
        placeName: displayName,
        displayName,
        providerPlaceId: result.providerPlaceId || null,
        formattedAddress: result.formattedAddress || result.secondaryText || null,
        destination: trip.destination,
        coordinates: typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : undefined,
      });
    } finally {
      setIsAddingSelectedPlace(false);
    }
  };

  const handlePrimaryAction = () => {
    setMarkerPreviewActive(false);

    if (isOwner) {
      if (!isEditMode) {
        toggleEditMode();
      }
      handleSnapPointChange(snapPoints[2]);
      return;
    }
    handleAddToItinerary();
  };

  const handleAddDay = async () => {
    if (!user) {
      toast.info('Please sign in to add days');
      navigate('/auth');
      return;
    }

    if (!tripId || !isOwner) {
      toast.error('You can only add days to your own trips');
      return;
    }

    setIsAddingDay(true);
    try {
      const nextDayNumber = itinerary.length + 1;

      // Create the new day
      await createDayItinerary.mutateAsync({
        tripId,
        dayNumber: nextDayNumber
      });

      if (!AUTH_DISABLED) {
        // Update trip duration
        await supabase
          .from('trips')
          .update({ duration: nextDayNumber })
          .eq('id', tripId);
      }

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ['trip-detail', tripId] });

      setActiveDay(nextDayNumber);
      setMarkerPreviewActive(false);
      toast.success(`Day ${nextDayNumber} added!`);
    } catch (error) {
      console.error('Error adding day:', error);
      toast.error('Failed to add day');
    } finally {
      setIsAddingDay(false);
    }
  };

  const handleRemoveDay = (dayNumber: number) => {
    if (itinerary.length <= 1) {
      toast.info('At least one day is required');
      return;
    }

    const dayToRemove = itinerary.find((day) => day.day === dayNumber);
    if (!dayToRemove) return;

    const hasPlaces = dayToRemove.places.length > 0;
    const shouldDelete = window.confirm(
      hasPlaces
        ? `Delete Day ${dayNumber} and its ${dayToRemove.places.length} place${dayToRemove.places.length > 1 ? 's' : ''}?`
        : `Delete Day ${dayNumber}?`
    );

    if (!shouldDelete) return;

    setMarkerPreviewActive(false);
    setFocusedPlaceId(null);
    removeDay(dayNumber);
    setActiveDay((currentDay) => {
      if (currentDay > dayNumber) return currentDay - 1;
      if (currentDay === dayNumber) {
        return Math.max(1, Math.min(dayNumber, itinerary.length - 1));
      }
      return currentDay;
    });
  };


  const handleCopyTrip = async () => {
    if (!user) {
      toast.info('Please sign in to remix trips');
      navigate('/auth');
      return;
    }
    if (trip) {
      const newTripId = await remixMutation.mutateAsync(trip);
      navigate(`/trip/${newTripId}`);
    }
  };

  const handleReview = () => {
    if (!user) {
      toast.info('Please sign in to review trips');
      navigate('/auth');
      return;
    }
    navigate(`/trip/${tripId}/review?day=${activeDay}`);
  };

  const handleDeleteTrip = async () => {
    if (!tripId || !isOwner) return;

    try {
      await deleteTripMutation.mutateAsync(tripId);
      navigate('/trips');
    } catch {
      // Mutation handles toast feedback
    } finally {
      setShowDeleteTripDialog(false);
    }
  };

  const handleOpenPlaceDetails = (place: Place) => {
    if (!tripId) return;

    const query = new URLSearchParams();
    if (place.placeId) query.set('providerPlaceId', place.placeId);

    const displayName = place.displayName || place.name;
    if (displayName) {
      query.set('displayName', displayName);
      query.set('queryText', displayName);
    }

    if (trip.destination) {
      query.set('destinationContext', trip.destination);
    }

    if (typeof place.coordinates?.lat === 'number') {
      query.set('lat', String(place.coordinates.lat));
    }

    if (typeof place.coordinates?.lng === 'number') {
      query.set('lng', String(place.coordinates.lng));
    }

    const queryString = query.toString();
    navigate(`/trip/${tripId}/place/${place.id}${queryString ? `?${queryString}` : ''}`);
  };

  const handleExpandPlaceTiming = (place: Place) => {
    setFocusedPlaceId(place.id);
    setMarkerPreviewActive(true);
    setSelectionScrollTick((tick) => tick + 1);
    handleSnapPointChange(snapPoints[2]);
  };

  const handleClosePlaceTiming = () => {
    setMarkerPreviewActive(false);
    setFocusedPlaceId(null);
  };

  const handleViewOnMap = (place: Place) => {
    setFocusedPlaceId(place.id);
    const mapUrl = getGoogleMapsPlaceUrl({
      placeId: place.placeId,
      displayName: place.displayName,
      name: place.name,
      lat: place.coordinates?.lat,
      lng: place.coordinates?.lng,
    });
    window.open(mapUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenRoute = () => {
    if (mapPlaces.length < 2) {
      toast.info('Add at least two stops to open a route');
      return;
    }

    const route = getGoogleMapsRouteUrl(
      mapPlaces.map((place) => ({
        label: place.displayName || place.name,
        placeId: place.placeId,
        lat: place.coordinates?.lat,
        lng: place.coordinates?.lng,
      })),
      'walk'
    );

    window.open(route.url, '_blank', 'noopener,noreferrer');
  };

  const handleMapMarkerTap = (place: Place) => {
    latestMarkerSelectionRef.current += 1;
    const selectionId = latestMarkerSelectionRef.current;
    const placeIndex = mapPlaces.findIndex((candidate) => candidate.id === place.id);
    const shouldExpandToRevealSelection = placeIndex >= previewPlaces.length;

    setFocusedPlaceId((current) => {
      if (selectionId !== latestMarkerSelectionRef.current) {
        return current;
      }

      return place.id;
    });
    setMarkerPreviewActive(true);
    setSelectionScrollTick((tick) => tick + 1);

    handleSnapPointChange(shouldExpandToRevealSelection ? snapPoints[2] : snapPoints[1]);
  };

  const handleTimingChange = async (
    placeId: string,
    value: { arrivalTime?: string; stayDurationMinutes: number }
  ) => {
    const existingPlace = currentDayItineraryRaw?.places.find(place => place.id === placeId);
    if (!existingPlace || !tripId) return;

    setTimingOverrides(prev => ({
      ...prev,
      [placeId]: {
        arrivalTime: value.arrivalTime,
        stayDurationMinutes: value.stayDurationMinutes,
        commuteDurationMinutes: prev[placeId]?.commuteDurationMinutes ?? existingPlace.commuteDurationMinutes,
        commuteDistanceMeters: prev[placeId]?.commuteDistanceMeters ?? existingPlace.commuteDistanceMeters,
      },
    }));

    const { data, error } = await api.updateStopTiming(tripId, placeId, {
      arrivalTime: value.arrivalTime ?? null,
      stayDurationMinutes: value.stayDurationMinutes,
    });

    if (error || !data) {
      toast.error(error?.message || 'Unable to update stop timing');
      return;
    }

    setTimingOverrides(prev => ({
      ...prev,
      [placeId]: {
        arrivalTime: data.arrivalTime || undefined,
        stayDurationMinutes: data.stayDurationMinutes,
        commuteDurationMinutes: data.commuteFromPrevious?.durationMinutes ?? undefined,
        commuteDistanceMeters: data.commuteFromPrevious?.distanceMeters ?? undefined,
      },
    }));
  };

  const shareUrl = `${window.location.origin}/trip/${tripId}`;

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background">
      <div
        className={cn(
          'absolute inset-0 z-0',
          isExpanded || isDraggingTimeline ? 'pointer-events-none' : 'pointer-events-auto'
        )}
      >
        <MapPlaceholder
          destination={trip.destination}
          placesCount={mapPlaces.length}
          places={mapPlaces}
          onMarkerClick={handleMapMarkerTap}
          className="h-full w-full rounded-none"
          showOverlays={false}
          controlsPosition="bottom-right"
        />
      </div>

      <header className="pointer-events-auto absolute left-0 right-0 top-0 z-50 px-4 pt-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-background/90 px-3 py-2 shadow-lg backdrop-blur">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNavigateBack}
              className="rounded-full"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Trip</p>
              <h1 className="text-sm font-semibold">{trip.title}</h1>
              <p className="text-[11px] text-muted-foreground">
                {trip.duration} days • {totalPlaces} stops
              </p>
            </div>
          </div>
          {!isEditMode && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={handleReview}
                aria-label="Review selected day"
              >
                <ClipboardCheck className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={handleCopyTrip}
                disabled={remixMutation.isPending}
                aria-label="Remix trip"
              >
                <GitFork className="h-5 w-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    aria-label="Trip options"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
                  <DropdownMenuItem onClick={handleReview}>
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    Review day {activeDay}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShare}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share trip
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyTrip} disabled={remixMutation.isPending}>
                    <GitFork className="mr-2 h-4 w-4" />
                    {remixMutation.isPending ? 'Remixing...' : 'Remix trip'}
                  </DropdownMenuItem>
                  {isOwner && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setShowDeleteTripDialog(true)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete trip
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </header>

      <BottomSheet
        defaultOpen
        modal={false}
        dismissible={false}
        snapPoints={snapPoints}
        activeSnapPoint={activeSnapPoint}
        setActiveSnapPoint={handleSnapPointChange}
        shouldScaleBackground={false}
      >
        <BottomSheetContent
          showOverlay
          aria-label="Trip itinerary sheet"
          aria-describedby={undefined}
          className={dayPlaceSearchOpen ? 'pointer-events-none touch-none select-none' : undefined}
        >
          <BottomSheetTitle className="sr-only">Trip itinerary sheet</BottomSheetTitle>
          <BottomSheetDescription className="sr-only">
            View and manage the daily itinerary for this trip.
          </BottomSheetDescription>
          <div
            className="relative flex min-h-0 flex-1 flex-col"
            data-testid="trip-itinerary-sheet"
            data-sheet-state={sheetState}
          >
            {showSwipeHint && isCollapsed && (
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 -top-20 z-10 flex -translate-x-1/2 flex-col items-center gap-1 rounded-full bg-background/90 px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-lg shadow-black/10 ring-1 ring-border/60 backdrop-blur animate-fade-in"
              >
                <ChevronUp className="h-4 w-4 animate-bounce text-muted-foreground/70" />
                <span>Swipe up to view itinerary</span>
              </div>
            )}
            <div className="sticky top-0 z-20 border-b border-border/60 bg-background/95 px-4 pb-4 pt-2 backdrop-blur supports-[backdrop-filter]:bg-background/90">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Itinerary</p>
                  <h2 className="text-base font-semibold text-foreground">
                    Day {activeDay} • {trip.destination}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {currentDayItinerary?.places.length || 0} stops • {totalWalkingKm} km total walking
                  </p>
                </div>
                {currentDayItinerary?.title && (
                  <Badge variant="secondary" className="text-xs">
                    {currentDayItinerary.title}
                  </Badge>
                )}
              </div>

              {isEditMode && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                    Edit mode active
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAnchorSelectorOpen(true)}
                    className={cn(
                      'gap-2',
                      anchorPlaceId
                        ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                        : 'border-dashed'
                    )}
                  >
                    <Home className="h-4 w-4" />
                    {anchorPlaceId ? 'Anchor set' : 'Set anchor'}
                  </Button>
                </div>
              )}

              <div data-testid="itinerary-primary-actions">
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    onClick={isEditMode ? saveChanges : handlePrimaryAction}
                    className={cn(
                      'flex-1 gap-2 rounded-xl',
                      isOwner && !isEditMode && 'bg-violet-600 hover:bg-violet-700',
                      !isOwner && 'bg-violet-600 hover:bg-violet-700',
                      isEditMode && 'bg-green-600 hover:bg-green-700'
                    )}
                    variant="default"
                    disabled={isEditMode && isSaving}
                  >
                    {isEditMode ? (
                      <>
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Changes
                      </>
                    ) : (
                      <>
                        {isOwner ? <Pencil className="h-4 w-4" /> : <ListPlus className="h-4 w-4" />}
                        {isOwner ? 'Modify itinerary' : 'Add to itinerary'}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-xl"
                    onClick={handleShare}
                    aria-label="Share trip"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 rounded-full"
                    onClick={() => {
                      if (!selectedPlaceForActions) {
                        toast.info('No place selected for map details');
                        return;
                      }
                      handleViewOnMap(selectedPlaceForActions);
                    }}
                  >
                    View on map
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 rounded-full"
                    onClick={handleOpenRoute}
                  >
                    <Sparkles className="h-4 w-4" />
                    Open Route
                  </Button>
                </div>
              </div>
            </div>

            {!isCollapsed && (
              <div className="flex min-h-0 flex-1 flex-col border-t border-border/60">
                <div className="px-4 pt-3">
                  <div className="flex items-center gap-2 pb-2">
                    <div className="relative min-w-0 flex-1 max-w-[17.5rem]">
                      <div
                        className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                        data-vaul-no-drag
                      >
                        {itinerary.map((day) => (
                          <button
                            key={day.day}
                            onClick={() => {
                              setActiveDay(day.day);
                              setMarkerPreviewActive(false);
                            }}
                            className={cn(
                              'flex h-9 min-w-[5.5rem] shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-all',
                              activeDay === day.day
                                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                : 'border-border bg-card text-muted-foreground hover:bg-muted'
                            )}
                          >
                            Day {day.day}
                          </button>
                        ))}
                      </div>
                      {itinerary.length > 3 && (
                        <div
                          aria-hidden
                          className="pointer-events-none absolute inset-y-0 -right-1 w-10 bg-gradient-to-l from-[#F1F0EE] via-[#F1F0EE] to-transparent"
                        />
                      )}
                    </div>
                    {isOwner && (
                      <button
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground/30 text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground',
                          isAddingDay && 'pointer-events-none opacity-50'
                        )}
                        onClick={handleAddDay}
                        disabled={isAddingDay}
                      >
                        {isAddingDay ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    {markerPreviewActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 shrink-0 rounded-full px-4 text-sm font-semibold"
                        onClick={handleClosePlaceTiming}
                      >
                        Done
                      </Button>
                    )}
                  </div>
                </div>

                {isOwner && (
                  <div className="px-4 pb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-11 w-full gap-2 rounded-2xl border-border/70 bg-card text-sm font-semibold shadow-sm"
                      onClick={handleOpenManualPlaceSearch}
                      disabled={isAddingSelectedPlace}
                    >
                      {isAddingSelectedPlace ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Add new place
                    </Button>
                  </div>
                )}

                {(userPlacesCount > 0 || aiPlacesCount > 0 || anchorPlaceId) && (
                  <div className="px-4 pb-2">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {userPlacesCount > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            <User className="h-3 w-3" />
                          </span>
                          {userPlacesCount} imported
                        </span>
                      )}
                      {aiPlacesCount > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                            <Sparkles className="h-3 w-3" />
                          </span>
                          {aiPlacesCount} AI suggested
                        </span>
                      )}
                      {anchorPlaceId && (
                        <span className="flex items-center gap-1">
                          <span className="flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            <Home className="h-3 w-3" />
                          </span>
                          Anchor set
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div
                  ref={itineraryListContainerRef}
                  className="flex-1 overflow-y-auto px-4 pb-24 pt-2"
                  data-vaul-no-drag
                >
                  {markerPreviewActive && markerPreviewPlaces.length > 0 ? (
                    <div className="space-y-3">
                      {markerPreviewPlaces.map((place, index) => (
                        <TimelinePlace
                          key={place.id}
                          place={place}
                          index={index + 1}
                          time={markerPreviewDisplayTimes[index]}
                          isLast={index === markerPreviewPlaces.length - 1}
                          isHighlighted={place.id === focusedPlaceId}
                          isTimingEditable={isOwner}
                          onTimingChange={handleTimingChange}
                          onInfoClick={handleExpandPlaceTiming}
                          onViewMap={handleViewOnMap}
                        />
                      ))}
                    </div>
                  ) : isEditMode || (currentDayItinerary && currentDayItinerary.places.length > 0) ? (
                    <DraggableTimeline
                      days={itineraryWithTimingOverrides}
                      activeDay={activeDay}
                      isEditMode={isEditMode}
                      anchorPlaceId={anchorPlaceId}
                      highlightedPlaceId={focusedPlaceId}
                      onReorder={reorderPlaces}
                      onMoveBetweenDays={movePlaceBetweenDays}
                      onRemove={removePlace}
                      onSetAnchor={setAsAnchor}
                      onPlaceClick={handleOpenPlaceDetails}
                      onPlaceInfoClick={handleExpandPlaceTiming}
                      onRemoveDay={handleRemoveDay}
                      onDragStateChange={setIsDraggingTimeline}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <Plus className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">No places for this day</p>
                      <Button
                        variant="link"
                        className="mt-2"
                        onClick={() => setAddPlacesDialogOpen(true)}
                      >
                        Add places
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isEditMode && (
              <div className="shrink-0 border-t bg-background/95 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 rounded-xl"
                    onClick={handleDiscardChanges}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 gap-2 rounded-xl bg-green-600 hover:bg-green-700"
                    onClick={saveChanges}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </div>
        </BottomSheetContent>
      </BottomSheet>

      <ShareModal
        open={shareModalOpen}
        onOpenChange={handleShareOpenChange}
        title={trip.title}
        url={shareUrl}
      />

      <AddToItineraryDialog
        open={addToItineraryOpen}
        onOpenChange={setAddToItineraryOpen}
        places={allPlaces}
        destination={trip.destination}
      />

      <AnchorSelector
        open={anchorSelectorOpen}
        onOpenChange={setAnchorSelectorOpen}
        places={allPlaces}
        currentAnchorId={anchorPlaceId}
        onSelectAnchor={setAsAnchor}
      />

      <AddPlacesOptionsDialog
        open={addPlacesDialogOpen}
        onOpenChange={setAddPlacesDialogOpen}
        destination={trip.destination}
        dayNumber={activeDay}
        onAddManually={handleOpenManualPlaceSearch}
      />

      <DayPlaceSearchDialog
        open={dayPlaceSearchOpen}
        onOpenChange={setDayPlaceSearchOpen}
        dayNumber={activeDay}
        destination={trip.destination}
        onAddPlace={handleAddSelectedPlace}
        isSubmitting={isAddingSelectedPlace}
      />

      <AlertDialog open={showDeleteTripDialog} onOpenChange={setShowDeleteTripDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this trip?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{trip.title}" and all itinerary data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTripMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTrip}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteTripMutation.isPending}
            >
              {deleteTripMutation.isPending ? 'Deleting...' : 'Delete trip'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
