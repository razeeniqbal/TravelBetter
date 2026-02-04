"use client";

import TripDetailPageContent from "@/components/pages/TripDetailPage";
import ReviewTripPageContent from "@/components/pages/ReviewTripPage";
import { useParams } from "next/navigation";

export default function ReviewTripPage() {
  const params = useParams();
  const tripId = params.tripId as string;
  return <ReviewTripPageContent tripId={tripId} />;
}
