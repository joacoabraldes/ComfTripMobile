/**
 * Type definitions for ComfTrip Mobile App
 */

export type TripStatus = 'upcoming' | 'current' | 'past';

export interface Trip {
  id: number;
  user_id: number;
  destination: string;
  start_date: string; // ISO date string
  end_date: string; // ISO date string
  flag_url?: string | null;
  notes?: string | null;
  budget?: number | null;
  created_at?: string | null;
  places?: TripPlace[];
  share?: TripShare | null;
  review?: TripReview | null;
}

export interface TripPlace {
  id: number;
  fk_location?: number;
  fk_locations?: number;
  fk_trips?: number;
  date?: string | null;
  start_hour?: string | null;
  end_hour?: string | null;
  notes?: string | null;
  location?: {
    id?: number;
    titulo?: string;
    imagenes?: string[];
  };
}

export interface TripShare {
  id: number;
  shared_by: number;
  shared_with?: number | null;
  mode: 'viewer' | 'editor';
  public: boolean;
  share_uuid?: string | null;
  expires_at?: string | null;
}

export interface TripReview {
  id: number;
  trip_id: number;
  user_id: number;
  rating?: number | null; // 1-5
  title?: string | null;
  comment?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Activity {
  key: string;
  title: string;
  img?: string | null;
  dateStr: string;
  sortTs?: number;
  place?: any; // Raw place object from backend (for image extraction in ActivityCard)
}

export interface Friend {
  id: number;
  name?: string;
  email?: string;
}

export interface FriendRequest {
  id: number;
  requester_id?: number;
  requester_name?: string;
  requester_email?: string;
  addressee_id?: number;
  addressee_name?: string;
  addressee_email?: string;
  status?: string;
}

