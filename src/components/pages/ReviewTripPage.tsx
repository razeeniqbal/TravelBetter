"use client";

import ReviewTripPageContent from '@/pages/ReviewTripPage';

interface ReviewTripPageProps {
  tripId: string;
}

export default function ReviewTripPageWrapper({ tripId }: ReviewTripPageProps) {
  return <ReviewTripPageContent tripId={tripId} />;
}
