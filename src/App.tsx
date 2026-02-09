import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RequireAuth } from "@/components/shared/RequireAuth";
import { AUTH_DISABLED } from "@/lib/flags";
import HomePage from "./pages/HomePage";
import TripDetailPage from "./pages/TripDetailPage";
import CreatePage from "./pages/CreatePage";
import ProfilePage from "./pages/ProfilePage";
import PlaceDetailPage from "./pages/PlaceDetailPage";
import SearchPage from "./pages/SearchPage";
import ExplorePage from "./pages/ExplorePage";
import ReviewTripPage from "./pages/ReviewTripPage";
import TripsPage from "./pages/TripsPage";
import AuthPage from "./pages/AuthPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();
const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<HomePage />} />
            {AUTH_DISABLED ? (
              <Route path="/auth" element={<Navigate to="/" replace />} />
            ) : (
              <Route path="/auth" element={<AuthPage />} />
            )}
            <Route path="/trip/:tripId" element={<TripDetailPage />} />
            <Route path="/trip/:tripId/review" element={
              <RequireAuth>
                <ReviewTripPage />
              </RequireAuth>
            } />
            <Route path="/place/:placeId" element={<PlaceDetailPage />} />
            <Route path="/create" element={
              <RequireAuth>
                <CreatePage />
              </RequireAuth>
            } />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/trips" element={
              <RequireAuth>
                <TripsPage />
              </RequireAuth>
            } />
            <Route path="/profile" element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            } />
            <Route path="/settings" element={
              <RequireAuth>
                <SettingsPage />
              </RequireAuth>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
