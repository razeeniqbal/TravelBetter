export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      day_itineraries: {
        Row: {
          day_number: number
          id: string
          notes: string | null
          title: string | null
          trip_id: string
        }
        Insert: {
          day_number: number
          id?: string
          notes?: string | null
          title?: string | null
          trip_id: string
        }
        Update: {
          day_number?: number
          id?: string
          notes?: string | null
          title?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_itineraries_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_places: {
        Row: {
          confidence: number | null
          day_itinerary_id: string
          id: string
          place_id: string
          position: number
          scheduled_time: string | null
          source: string | null
          source_note: string | null
          walking_time_from_previous: number | null
        }
        Insert: {
          confidence?: number | null
          day_itinerary_id: string
          id?: string
          place_id: string
          position: number
          scheduled_time?: string | null
          source?: string | null
          source_note?: string | null
          walking_time_from_previous?: number | null
        }
        Update: {
          confidence?: number | null
          day_itinerary_id?: string
          id?: string
          place_id?: string
          position?: number
          scheduled_time?: string | null
          source?: string | null
          source_note?: string | null
          walking_time_from_previous?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_places_day_itinerary_id_fkey"
            columns: ["day_itinerary_id"]
            isOneToOne: false
            referencedRelation: "day_itineraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itinerary_places_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      place_reviews: {
        Row: {
          created_at: string | null
          id: string
          place_id: string
          rating: number | null
          text: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          place_id: string
          rating?: number | null
          text?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          place_id?: string
          rating?: number | null
          text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_reviews_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          address: string | null
          category: string
          cost: string | null
          created_at: string | null
          description: string | null
          duration: number | null
          id: string
          image_url: string | null
          latitude: number | null
          longitude: number | null
          name: string
          name_local: string | null
          opening_hours: string | null
          rating: number | null
          tips: string[] | null
        }
        Insert: {
          address?: string | null
          category: string
          cost?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          name_local?: string | null
          opening_hours?: string | null
          rating?: number | null
          tips?: string[] | null
        }
        Update: {
          address?: string | null
          category?: string
          cost?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          name_local?: string | null
          opening_hours?: string | null
          rating?: number | null
          tips?: string[] | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          countries_visited: number | null
          created_at: string | null
          full_name: string | null
          id: string
          trips_created: number | null
          trips_remixed: number | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          countries_visited?: number | null
          created_at?: string | null
          full_name?: string | null
          id: string
          trips_created?: number | null
          trips_remixed?: number | null
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          countries_visited?: number | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          trips_created?: number | null
          trips_remixed?: number | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      saved_places: {
        Row: {
          created_at: string | null
          id: string
          place_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          place_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          place_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_places_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_places_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_trips: {
        Row: {
          created_at: string | null
          id: string
          trip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          trip_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_trips_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_trips_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_reviews: {
        Row: {
          created_at: string | null
          day_number: number | null
          id: string
          notes: string | null
          photos: string[] | null
          rating: number | null
          trip_id: string
          user_id: string
          vibes: string[] | null
        }
        Insert: {
          created_at?: string | null
          day_number?: number | null
          id?: string
          notes?: string | null
          photos?: string[] | null
          rating?: number | null
          trip_id: string
          user_id: string
          vibes?: string[] | null
        }
        Update: {
          created_at?: string | null
          day_number?: number | null
          id?: string
          notes?: string | null
          photos?: string[] | null
          rating?: number | null
          trip_id?: string
          user_id?: string
          vibes?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_reviews_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          budget: string | null
          country: string
          cover_image: string | null
          created_at: string | null
          destination: string
          duration: number
          id: string
          is_public: boolean | null
          pace: string | null
          remix_count: number | null
          remixed_from_id: string | null
          tags: string[] | null
          title: string
          travel_style: string[] | null
          updated_at: string | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          budget?: string | null
          country: string
          cover_image?: string | null
          created_at?: string | null
          destination: string
          duration?: number
          id?: string
          is_public?: boolean | null
          pace?: string | null
          remix_count?: number | null
          remixed_from_id?: string | null
          tags?: string[] | null
          title: string
          travel_style?: string[] | null
          updated_at?: string | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          budget?: string | null
          country?: string
          cover_image?: string | null
          created_at?: string | null
          destination?: string
          duration?: number
          id?: string
          is_public?: boolean | null
          pace?: string | null
          remix_count?: number | null
          remixed_from_id?: string | null
          tags?: string[] | null
          title?: string
          travel_style?: string[] | null
          updated_at?: string | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_remixed_from_id_fkey"
            columns: ["remixed_from_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
