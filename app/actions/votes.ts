"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { VoteInsert, LeaderboardEntry, PairConsensus } from "@/lib/types/database";

export async function submitVote(
  winnerId: string,
  loserId: string,
  convictionScore: number,
  pairHash: string,
  pollId?: string
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be logged in to vote" };
  }

  const vote: VoteInsert = {
    user_id: user.id,
    winner_id: winnerId,
    loser_id: loserId,
    conviction_score: convictionScore,
    pair_hash: pairHash,
    poll_id: pollId || null,
  };

  const { error } = await supabase.from("votes").upsert(vote, {
    onConflict: "user_id,poll_id,pair_hash",
  });

  if (error) {
    console.error("Vote submission error:", error);
    return { error: "Failed to submit vote" };
  }

  // Ensure user has a participation record
  if (pollId) {
    const { data: existing } = await supabase
      .from("poll_participants")
      .select("poll_id")
      .eq("poll_id", pollId)
      .eq("user_id", user.id)
      .single();

    if (!existing) {
      await supabase.from("poll_participants").insert({
        poll_id: pollId,
        user_id: user.id,
        is_anonymous: false,
      });
    }
  }

  revalidatePath("/vote");
  revalidatePath("/results");
  if (pollId) {
    revalidatePath(`/polls/${pollId}/vote`);
    revalidatePath(`/polls/${pollId}/results`);
  }

  return { success: true };
}

// Mark a poll as completed for the user
export async function markPollCompleted(pollId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be logged in" };
  }

  const { error } = await supabase
    .from("poll_participants")
    .upsert(
      {
        poll_id: pollId,
        user_id: user.id,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "poll_id,user_id" }
    );

  if (error) {
    console.error("Error marking poll completed:", error);
    return { error: "Failed to mark poll as completed" };
  }

  revalidatePath("/polls");
  revalidatePath("/my-polls");

  return { success: true };
}

export async function getUserVotes() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be logged in", votes: [] };
  }

  const { data: votes, error } = await supabase
    .from("votes")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    console.error("Error fetching votes:", error);
    return { error: "Failed to fetch votes", votes: [] };
  }

  return { votes: votes || [] };
}

export async function getOptions() {
  const supabase = await createClient();

  const { data: options, error } = await supabase
    .from("options")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching options:", error);
    return { error: "Failed to fetch options", options: [] };
  }

  return { options: options || [] };
}

export async function getLeaderboard() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leaderboard")
    .select("*")
    .order("rank");

  if (error) {
    console.error("Error fetching leaderboard:", error);
    return { error: "Failed to fetch leaderboard", leaderboard: [] as LeaderboardEntry[] };
  }

  // Filter out any entries with null required fields and cast to expected type
  const leaderboard: LeaderboardEntry[] = (data || [])
    .filter((entry): entry is NonNullable<typeof entry> & { id: string; name: string } =>
      entry.id !== null && entry.name !== null
    )
    .map(entry => ({
      id: entry.id!,
      name: entry.name!,
      description: entry.description,
      image_url: entry.image_url,
      poll_id: entry.poll_id ?? "",
      win_points: entry.win_points ?? 0,
      loss_points: entry.loss_points ?? 0,
      net_score: entry.net_score ?? 0,
      win_count: entry.win_count ?? 0,
      loss_count: entry.loss_count ?? 0,
      rank: entry.rank ?? 0,
    }));

  return { leaderboard };
}

export async function getPairConsensus() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pair_consensus")
    .select("*")
    .order("win_percentage", { ascending: false });

  if (error) {
    console.error("Error fetching consensus:", error);
    return { error: "Failed to fetch consensus", consensus: [] as PairConsensus[] };
  }

  // Filter and cast to expected type
  const consensus: PairConsensus[] = (data || [])
    .filter((entry): entry is NonNullable<typeof entry> & { pair_hash: string } =>
      entry.pair_hash !== null
    )
    .map(entry => ({
      poll_id: entry.poll_id ?? "",
      pair_hash: entry.pair_hash!,
      option_a: entry.option_a ?? "",
      option_b: entry.option_b ?? "",
      winner_id: entry.winner_id ?? "",
      winner_name: entry.winner_name ?? "",
      vote_count: entry.vote_count ?? 0,
      avg_conviction: entry.avg_conviction ?? 0,
      total_conviction: entry.total_conviction ?? 0,
      win_percentage: (entry as { win_percentage?: number }).win_percentage ?? 0,
    }));

  return { consensus };
}
