export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      options: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          image_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          is_anonymous: boolean;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          is_anonymous?: boolean;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          is_anonymous?: boolean;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      polls: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          created_by: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          created_by?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          created_by?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "polls_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      poll_options: {
        Row: {
          poll_id: string;
          option_id: string;
        };
        Insert: {
          poll_id: string;
          option_id: string;
        };
        Update: {
          poll_id?: string;
          option_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey";
            columns: ["poll_id"];
            referencedRelation: "polls";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "poll_options_option_id_fkey";
            columns: ["option_id"];
            referencedRelation: "options";
            referencedColumns: ["id"];
          }
        ];
      };
      poll_participants: {
        Row: {
          poll_id: string;
          user_id: string;
          is_anonymous: boolean;
          completed_at: string | null;
        };
        Insert: {
          poll_id: string;
          user_id: string;
          is_anonymous?: boolean;
          completed_at?: string | null;
        };
        Update: {
          poll_id?: string;
          user_id?: string;
          is_anonymous?: boolean;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "poll_participants_poll_id_fkey";
            columns: ["poll_id"];
            referencedRelation: "polls";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "poll_participants_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      votes: {
        Row: {
          id: string;
          user_id: string;
          poll_id: string | null;
          winner_id: string;
          loser_id: string;
          conviction_score: number;
          pair_hash: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          poll_id?: string | null;
          winner_id: string;
          loser_id: string;
          conviction_score: number;
          pair_hash: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          poll_id?: string | null;
          winner_id?: string;
          loser_id?: string;
          conviction_score?: number;
          pair_hash?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "votes_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "votes_poll_id_fkey";
            columns: ["poll_id"];
            referencedRelation: "polls";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "votes_winner_id_fkey";
            columns: ["winner_id"];
            referencedRelation: "options";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "votes_loser_id_fkey";
            columns: ["loser_id"];
            referencedRelation: "options";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      leaderboard: {
        Row: {
          id: string | null;
          name: string | null;
          description: string | null;
          image_url: string | null;
          poll_id: string | null;
          win_points: number | null;
          loss_points: number | null;
          net_score: number | null;
          win_count: number | null;
          loss_count: number | null;
          rank: number | null;
        };
        Relationships: [];
      };
      pair_consensus: {
        Row: {
          poll_id: string | null;
          pair_hash: string | null;
          option_a: string | null;
          option_b: string | null;
          winner_id: string | null;
          winner_name: string | null;
          vote_count: number | null;
          avg_conviction: number | null;
          total_conviction: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      generate_pair_hash: {
        Args: {
          option_a: string;
          option_b: string;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Convenience types
export type Option = Database["public"]["Tables"]["options"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Vote = Database["public"]["Tables"]["votes"]["Row"];
export type Poll = Database["public"]["Tables"]["polls"]["Row"];
export type PollOption = Database["public"]["Tables"]["poll_options"]["Row"];
export type PollParticipant = Database["public"]["Tables"]["poll_participants"]["Row"];

// View types with non-nullable fields for convenience
export interface LeaderboardEntry {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  poll_id: string;
  win_points: number;
  loss_points: number;
  net_score: number;
  win_count: number;
  loss_count: number;
  rank: number;
}

export interface PairConsensus {
  poll_id: string;
  pair_hash: string;
  option_a: string;
  option_b: string;
  winner_id: string;
  winner_name: string;
  vote_count: number;
  avg_conviction: number;
  total_conviction: number;
  win_percentage: number;
}

// For creating votes
export type VoteInsert = Database["public"]["Tables"]["votes"]["Insert"];

// For creating polls
export type PollInsert = Database["public"]["Tables"]["polls"]["Insert"];
export type PollOptionInsert = Database["public"]["Tables"]["poll_options"]["Insert"];
export type PollParticipantInsert = Database["public"]["Tables"]["poll_participants"]["Insert"];

// Extended poll type with options
export interface PollWithOptions extends Poll {
  options: Option[];
  participant_count?: number;
}

// User's poll participation info
export interface UserPollParticipation {
  poll: Poll;
  is_anonymous: boolean;
  completed_at: string | null;
  vote_count: number;
  total_pairs: number;
}
