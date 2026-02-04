"use client";

import PlaceDetailPage from "@/pages/PlaceDetailPage";
import { useParams } from "next/navigation";

export default function PlaceDetailPageRoute() {
  const params = useParams();
  const placeId = params.placeId as string;
  return <PlaceDetailPage placeId={placeId} />;
}
