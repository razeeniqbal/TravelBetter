"use client";

import { useParams } from "next/navigation";
import TripDetailPageContent from "@/components/pages/TripDetailPage";

export default function TripDetailPage() {
  const params = useParams();
  const tripId = params.tripId as string;
  return <TripDetailPageContent tripId={tripId} />;
}
