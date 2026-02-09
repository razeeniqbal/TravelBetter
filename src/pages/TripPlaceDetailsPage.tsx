import { useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlaceDetails } from '@/hooks/usePlaces';

function parseNumber(value: string | null): number | null {
  if (!value) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export default function TripPlaceDetailsPage() {
  const navigate = useNavigate();
  const { tripId, placeId } = useParams();
  const [searchParams] = useSearchParams();

  const providerPlaceId = searchParams.get('providerPlaceId');
  const displayName = searchParams.get('displayName');
  const queryText = searchParams.get('queryText') || displayName;
  const destinationContext = searchParams.get('destinationContext');
  const lat = parseNumber(searchParams.get('lat'));
  const lng = parseNumber(searchParams.get('lng'));

  const request = useMemo(() => ({
    providerPlaceId,
    queryText,
    destinationContext,
    lat,
    lng,
    reviewLimit: 5,
  }), [providerPlaceId, queryText, destinationContext, lat, lng]);

  const hasLookupInput = Boolean(providerPlaceId || queryText);
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = usePlaceDetails(hasLookupInput ? request : null);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Trip place details</p>
            <h1 className="text-sm font-semibold">{displayName || queryText || 'Selected place'}</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-5 pb-20">
        {!hasLookupInput ? (
          <div className="rounded-2xl border border-dashed bg-muted/30 p-5">
            <p className="text-sm font-medium">Place details unavailable</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The selected place does not include enough information to fetch details.
            </p>
            <Button className="mt-4" variant="outline" onClick={() => navigate(-1)}>
              Back to itinerary
            </Button>
          </div>
        ) : isLoading ? (
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-sm text-muted-foreground" role="status">Loading place details...</p>
          </div>
        ) : isError ? (
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-sm font-medium">Unable to load place details</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Please try again.'}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Button onClick={() => refetch()} disabled={isFetching}>Retry</Button>
              <Button variant="outline" onClick={() => navigate(`/trip/${tripId || ''}`)}>Back to trip</Button>
            </div>
          </div>
        ) : data ? (
          <>
            <section className="rounded-2xl border bg-card p-5">
              <h2 className="text-xl font-semibold">{data.details.canonicalName}</h2>
              <div className="mt-3 inline-flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{data.details.formattedAddress || 'Address unavailable'}</span>
              </div>
              {typeof data.details.rating === 'number' ? (
                <p className="mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {data.details.rating.toFixed(1)}
                  {typeof data.details.userRatingCount === 'number' ? ` (${data.details.userRatingCount} ratings)` : ''}
                </p>
              ) : null}
            </section>

            <section className="rounded-2xl border bg-card p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Reviews</h3>
              {data.reviews.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No reviews available</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {data.reviews.map((review) => (
                    <article key={review.reviewId} className="rounded-xl border border-border/70 p-3">
                      <div className="flex items-center gap-2 text-sm">
                        <p className="font-medium">{review.authorName}</p>
                        <span className="text-muted-foreground">{review.rating.toFixed(1)}</span>
                        {review.relativeTimeText ? (
                          <span className="text-xs text-muted-foreground">{review.relativeTimeText}</span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{review.text}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Place details unavailable.</p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">Trip: {tripId || 'unknown'} • Place: {placeId || 'unknown'}</p>
      </main>
    </div>
  );
}
