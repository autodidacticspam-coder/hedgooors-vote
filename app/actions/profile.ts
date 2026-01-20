"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getProfile() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be logged in", profile: null };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return { error: "Failed to fetch profile", profile: null };
  }

  return { profile };
}

export async function updateAnonymousMode(isAnonymous: boolean) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be logged in" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_anonymous: isAnonymous })
    .eq("id", user.id);

  if (error) {
    console.error("Error updating anonymous mode:", error);
    return { error: "Failed to update anonymous mode" };
  }

  revalidatePath("/settings");
  revalidatePath("/results");

  return { success: true };
}

export async function updateDisplayName(displayName: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be logged in" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id);

  if (error) {
    console.error("Error updating display name:", error);
    return { error: "Failed to update display name" };
  }

  revalidatePath("/settings");
  revalidatePath("/results");

  return { success: true };
}

export async function getNonAnonymousVotes() {
  const supabase = await createClient();

  // This will only return votes from non-anonymous users due to RLS
  const { data: votes, error } = await supabase.from("votes").select(`
      *,
      profiles!inner(id, display_name, is_anonymous),
      winner:options!votes_winner_id_fkey(name),
      loser:options!votes_loser_id_fkey(name)
    `);

  if (error) {
    console.error("Error fetching non-anonymous votes:", error);
    return { error: "Failed to fetch votes", votes: [] };
  }

  return { votes: votes || [] };
}

export async function getPublicProfiles() {
  const supabase = await createClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_anonymous", false);

  if (error) {
    console.error("Error fetching public profiles:", error);
    return { error: "Failed to fetch profiles", profiles: [] };
  }

  return { profiles: profiles || [] };
}

export interface UserVoteSummary {
  oderId: string;
  odisplayName: string;
  ovotes: {
    odwinnerId: string;
    odwinnerName: string;
    odloserId: string;
    odloserName: string;
    odconviction: number;
  }[];
  odtotalVotes: number;
}

export async function getPublicUsersWithVotes() {
  const supabase = await createClient();

  // Get all public profiles
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("is_anonymous", false);

  if (profileError || !profiles) {
    console.error("Error fetching profiles:", profileError);
    return { users: [] };
  }

  // Get votes for each public user
  const usersWithVotes = await Promise.all(
    profiles.map(async (profile) => {
      const { data: votes } = await supabase
        .from("votes")
        .select(`
          winner_id,
          loser_id,
          conviction_score,
          winner:options!votes_winner_id_fkey(name),
          loser:options!votes_loser_id_fkey(name)
        `)
        .eq("user_id", profile.id);

      return {
        userId: profile.id,
        displayName: profile.display_name || "Anonymous User",
        votes: (votes || []).map((v: Record<string, unknown>) => ({
          winnerId: v.winner_id as string,
          winnerName: (v.winner as { name: string } | null)?.name || "Unknown",
          loserId: v.loser_id as string,
          loserName: (v.loser as { name: string } | null)?.name || "Unknown",
          conviction: v.conviction_score as number,
        })),
        totalVotes: votes?.length || 0,
      };
    })
  );

  return { users: usersWithVotes.filter(u => u.totalVotes > 0) };
}

export async function getPublicUserById(userId: string) {
  const supabase = await createClient();

  // Get the profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, is_anonymous")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return { error: "User not found", user: null };
  }

  // Check if user is public
  if (profile.is_anonymous) {
    return { error: "This user's votes are private", user: null };
  }

  // Get votes
  const { data: votes } = await supabase
    .from("votes")
    .select(`
      winner_id,
      loser_id,
      conviction_score,
      winner:options!votes_winner_id_fkey(id, name),
      loser:options!votes_loser_id_fkey(id, name)
    `)
    .eq("user_id", userId);

  // Calculate user's personal leaderboard from their votes
  const optionScores: Record<string, { name: string; winPoints: number; lossPoints: number; wins: number; losses: number }> = {};

  (votes || []).forEach((v: Record<string, unknown>) => {
    const winner = v.winner as { id: string; name: string } | null;
    const loser = v.loser as { id: string; name: string } | null;
    const conviction = v.conviction_score as number;

    if (winner) {
      if (!optionScores[winner.id]) {
        optionScores[winner.id] = { name: winner.name, winPoints: 0, lossPoints: 0, wins: 0, losses: 0 };
      }
      optionScores[winner.id].winPoints += conviction;
      optionScores[winner.id].wins += 1;
    }

    if (loser) {
      if (!optionScores[loser.id]) {
        optionScores[loser.id] = { name: loser.name, winPoints: 0, lossPoints: 0, wins: 0, losses: 0 };
      }
      optionScores[loser.id].lossPoints += conviction;
      optionScores[loser.id].losses += 1;
    }
  });

  const userLeaderboard = Object.entries(optionScores)
    .map(([id, data]) => ({
      id,
      name: data.name,
      win_points: data.winPoints,
      loss_points: data.lossPoints,
      net_score: data.winPoints - data.lossPoints,
      win_count: data.wins,
      loss_count: data.losses,
    }))
    .sort((a, b) => b.net_score - a.net_score)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  // Calculate pair results for this user
  const userPairResults = (votes || []).map((v: Record<string, unknown>) => {
    const winner = v.winner as { id: string; name: string } | null;
    const loser = v.loser as { id: string; name: string } | null;
    return {
      winner_id: winner?.id || "",
      winner_name: winner?.name || "Unknown",
      loser_id: loser?.id || "",
      loser_name: loser?.name || "Unknown",
      conviction: v.conviction_score as number,
    };
  });

  return {
    user: {
      userId: profile.id,
      displayName: profile.display_name || "User",
      totalVotes: votes?.length || 0,
      leaderboard: userLeaderboard,
      votes: userPairResults,
    },
  };
}
