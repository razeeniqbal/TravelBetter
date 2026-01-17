-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  countries_visited INTEGER DEFAULT 0,
  trips_created INTEGER DEFAULT 0,
  trips_remixed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create trips table
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  country TEXT NOT NULL,
  cover_image TEXT,
  duration INTEGER NOT NULL DEFAULT 1,
  tags TEXT[] DEFAULT '{}',
  travel_style TEXT[] DEFAULT '{}',
  budget TEXT CHECK (budget IN ('budget', 'moderate', 'luxury')),
  pace TEXT CHECK (pace IN ('relaxed', 'moderate', 'packed')),
  is_public BOOLEAN DEFAULT true,
  remix_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  remixed_from_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on trips
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Trips policies
CREATE POLICY "Anyone can view public trips"
  ON public.trips FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create own trips"
  ON public.trips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips"
  ON public.trips FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips"
  ON public.trips FOR DELETE
  USING (auth.uid() = user_id);

-- Create places table
CREATE TABLE public.places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_local TEXT,
  category TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  duration INTEGER,
  cost TEXT,
  rating DECIMAL(2,1),
  address TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  opening_hours TEXT,
  tips TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on places
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

-- Places policies
CREATE POLICY "Anyone can view places"
  ON public.places FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create places"
  ON public.places FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create day_itineraries table
CREATE TABLE public.day_itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  day_number INTEGER NOT NULL,
  title TEXT,
  notes TEXT,
  UNIQUE(trip_id, day_number)
);

-- Enable RLS on day_itineraries
ALTER TABLE public.day_itineraries ENABLE ROW LEVEL SECURITY;

-- Day itineraries policies
CREATE POLICY "Anyone can view day itineraries of public trips"
  ON public.day_itineraries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE trips.id = day_itineraries.trip_id 
      AND (trips.is_public = true OR trips.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage own trip itineraries"
  ON public.day_itineraries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE trips.id = day_itineraries.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

-- Create itinerary_places junction table
CREATE TABLE public.itinerary_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_itinerary_id UUID REFERENCES public.day_itineraries(id) ON DELETE CASCADE NOT NULL,
  place_id UUID REFERENCES public.places(id) NOT NULL,
  source TEXT CHECK (source IN ('user', 'ai')) DEFAULT 'user',
  source_note TEXT,
  confidence INTEGER,
  position INTEGER NOT NULL,
  scheduled_time TIME,
  walking_time_from_previous INTEGER
);

-- Enable RLS on itinerary_places
ALTER TABLE public.itinerary_places ENABLE ROW LEVEL SECURITY;

-- Itinerary places policies
CREATE POLICY "Anyone can view itinerary places of public trips"
  ON public.itinerary_places FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.day_itineraries di
      JOIN public.trips t ON t.id = di.trip_id
      WHERE di.id = itinerary_places.day_itinerary_id
      AND (t.is_public = true OR t.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage own itinerary places"
  ON public.itinerary_places FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.day_itineraries di
      JOIN public.trips t ON t.id = di.trip_id
      WHERE di.id = itinerary_places.day_itinerary_id
      AND t.user_id = auth.uid()
    )
  );

-- Create saved_places table
CREATE TABLE public.saved_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  place_id UUID REFERENCES public.places(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, place_id)
);

-- Enable RLS on saved_places
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;

-- Saved places policies
CREATE POLICY "Users can view own saved places"
  ON public.saved_places FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save places"
  ON public.saved_places FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave places"
  ON public.saved_places FOR DELETE
  USING (auth.uid() = user_id);

-- Create saved_trips table
CREATE TABLE public.saved_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, trip_id)
);

-- Enable RLS on saved_trips
ALTER TABLE public.saved_trips ENABLE ROW LEVEL SECURITY;

-- Saved trips policies
CREATE POLICY "Users can view own saved trips"
  ON public.saved_trips FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save trips"
  ON public.saved_trips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave trips"
  ON public.saved_trips FOR DELETE
  USING (auth.uid() = user_id);

-- Create trip_reviews table
CREATE TABLE public.trip_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  day_number INTEGER,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  vibes TEXT[] DEFAULT '{}',
  notes TEXT,
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on trip_reviews
ALTER TABLE public.trip_reviews ENABLE ROW LEVEL SECURITY;

-- Trip reviews policies
CREATE POLICY "Anyone can view trip reviews"
  ON public.trip_reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create reviews"
  ON public.trip_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
  ON public.trip_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews"
  ON public.trip_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Create place_reviews table
CREATE TABLE public.place_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID REFERENCES public.places(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on place_reviews
ALTER TABLE public.place_reviews ENABLE ROW LEVEL SECURITY;

-- Place reviews policies
CREATE POLICY "Anyone can view place reviews"
  ON public.place_reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create place reviews"
  ON public.place_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own place reviews"
  ON public.place_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own place reviews"
  ON public.place_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();