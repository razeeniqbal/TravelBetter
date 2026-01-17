import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import TripDetailPage from "./pages/TripDetailPage";
import CreatePage from "./pages/CreatePage";
import ProfilePage from "./pages/ProfilePage";
import PlaceDetailPage from "./pages/PlaceDetailPage";
import SearchPage from "./pages/SearchPage";
import ExplorePage from "./pages/ExplorePage";
import ReviewTripPage from "./pages/ReviewTripPage";
import TripsPage from "./pages/TripsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/trip/:tripId" element={<TripDetailPage />} />
          <Route path="/trip/:tripId/review" element={<ReviewTripPage />} />
          <Route path="/place/:placeId" element={<PlaceDetailPage />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/trips" element={<TripsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
