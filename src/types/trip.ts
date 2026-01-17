export type PlaceCategory = 'food' | 'culture' | 'nature' | 'shop' | 'night' | 'photo' | 'accommodation' | 'transport';

export type PlaceSource = 'user' | 'ai';

export interface Place {
  id: string;
  name: string;
  nameLocal?: string;
  category: PlaceCategory;
  source: PlaceSource;
  sourceNote?: string;
  description?: string;
  imageUrl?: string;
  duration?: number; // in minutes
  cost?: string;
  rating?: number;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  walkingTimeFromPrevious?: number; // in minutes
  tips?: string[];
  openingHours?: string;
  isAnchor?: boolean;
  confidence?: number; // 0-100 for AI-detected places
}

export interface DayItinerary {
  day: number;
  date?: string;
  title?: string;
  places: Place[];
  notes?: string;
}

export interface TripAuthor {
  id: string;
  name: string;
  avatar?: string;
  username: string;
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  country: string;
  coverImage: string;
  duration: number; // in days
  itinerary: DayItinerary[];
  author: TripAuthor;
  tags: string[];
  remixCount: number;
  viewCount: number;
  createdAt: string;
  remixedFrom?: {
    tripId: string;
    authorName: string;
  };
  travelStyle?: string[];
  budget?: 'budget' | 'moderate' | 'luxury';
  pace?: 'relaxed' | 'moderate' | 'packed';
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  bio?: string;
  tripsCreated: number;
  tripsRemixed: number;
  countriesVisited: number;
  joinedAt: string;
}

export type ImportSource = 'screenshot' | 'text' | 'youtube' | 'instagram' | 'rednote' | 'remix';

export interface ImportSession {
  source: ImportSource;
  status: 'uploading' | 'analyzing' | 'extracting' | 'ready' | 'error';
  progress: number;
  extractedPlaces?: Place[];
  rawContent?: string;
  sourceUrl?: string;
}

export interface PersonalizationOption {
  id: string;
  label: string;
  icon: string;
  selected: boolean;
}

export interface PersonalizationState {
  travelPurpose: string[];
  travelers: string;
  budget: string;
  pace: string;
  customPrompt: string;
}
