"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  Poll,
  PollWithOptions,
  Option,
  LeaderboardEntry,
  PairConsensus,
  UserPollParticipation,
} from "@/lib/types/database";
import { generateAllPairs } from "@/lib/pairs";

// Get all active polls
export async function getPolls() {
  const supabase = await createClient();

  const { data: polls, error } = await supabase
    .from("polls")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching polls:", error);
    return { error: "Failed to fetch polls", polls: [] as Poll[] };
  }

  return { polls: polls || [] };
}

// Get all polls (including inactive) for admin
export async function getAllPolls() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized", polls: [] as Poll[] };
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return { error: "Unauthorized", polls: [] as Poll[] };
  }

  const { data: polls, error } = await supabase
    .from("polls")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching polls:", error);
    return { error: "Failed to fetch polls", polls: [] as Poll[] };
  }

  return { polls: polls || [] };
}

// Get a single poll with its options
export async function getPoll(pollId: string) {
  const supabase = await createClient();

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("*")
    .eq("id", pollId)
    .single();

  if (pollError || !poll) {
    console.error("Error fetching poll:", pollError);
    return { error: "Poll not found", poll: null };
  }

  // Get poll options
  const { data: pollOptions, error: optionsError } = await supabase
    .from("poll_options")
    .select("option_id")
    .eq("poll_id", pollId);

  if (optionsError) {
    console.error("Error fetching poll options:", optionsError);
    return { error: "Failed to fetch poll options", poll: null };
  }

  const optionIds = (pollOptions || []).map((po) => po.option_id);

  // Get actual option details
  const { data: options, error: optionDetailsError } = await supabase
    .from("options")
    .select("*")
    .in("id", optionIds)
    .order("name");

  if (optionDetailsError) {
    console.error("Error fetching option details:", optionDetailsError);
    return { error: "Failed to fetch options", poll: null };
  }

  // Get participant count
  const { count } = await supabase
    .from("poll_participants")
    .select("*", { count: "exact", head: true })
    .eq("poll_id", pollId);

  const pollWithOptions: PollWithOptions = {
    ...poll,
    options: options || [],
    participant_count: count || 0,
  };

  return { poll: pollWithOptions };
}

// Get polls the user hasn't completed yet
export async function getAvailablePolls() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be logged in", polls: [] as PollWithOptions[] };
  }

  // Get all active polls
  const { data: polls, error: pollsError } = await supabase
    .from("polls")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (pollsError) {
    console.error("Error fetching polls:", pollsError);
    return { error: "Failed to fetch polls", polls: [] as PollWithOptions[] };
  }

  // Get user's completed polls
  const { data: participations } = await supabase
    .from("poll_participants")
    .select("poll_id, completed_at")
    .eq("user_id", user.id)
    .not("completed_at", "is", null);

  const completedPollIds = new Set(
    (participations || []).map((p) => p.poll_id)
  );

  // Filter to polls user hasn't completed
  const availablePolls = (polls || []).filter(
    (poll) => !completedPollIds.has(poll.id)
  );

  // Get options for each poll
  const pollsWithOptions: PollWithOptions[] = await Promise.all(
    availablePolls.map(async (poll) => {
      const { data: pollOptions } = await supabase
        .from("poll_options")
        .select("option_id")
        .eq("poll_id", poll.id);

      const optionIds = (pollOptions || []).map((po) => po.option_id);

      const { data: options } = await supabase
        .from("options")
        .select("*")
        .in("id", optionIds.length > 0 ? optionIds : ["none"])
        .order("name");

      const { count } = await supabase
        .from("poll_participants")
        .select("*", { count: "exact", head: true })
        .eq("poll_id", poll.id);

      return {
        ...poll,
        options: options || [],
        participant_count: count || 0,
      };
    })
  );

  return { polls: pollsWithOptions };
}

// Get polls the user has participated in
export async function getUserPolls() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be logged in", participations: [] as UserPollParticipation[] };
  }

  // Get user's participations
  const { data: participations, error: partError } = await supabase
    .from("poll_participants")
    .select("poll_id, is_anonymous, completed_at")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false });

  if (partError) {
    console.error("Error fetching participations:", partError);
    return { error: "Failed to fetch participations", participations: [] as UserPollParticipation[] };
  }

  if (!participations || participations.length === 0) {
    return { participations: [] as UserPollParticipation[] };
  }

  // Get poll details and vote counts
  const result: UserPollParticipation[] = await Promise.all(
    participations.map(async (p) => {
      const { data: poll } = await supabase
        .from("polls")
        .select("*")
        .eq("id", p.poll_id)
        .single();

      // Get options for this poll to calculate total pairs
      const { data: pollOptions } = await supabase
        .from("poll_options")
        .select("option_id")
        .eq("poll_id", p.poll_id);

      const { data: options } = await supabase
        .from("options")
        .select("*")
        .in(
          "id",
          (pollOptions || []).map((po) => po.option_id)
        );

      const totalPairs = options ? generateAllPairs(options).length : 0;

      // Get user's vote count for this poll
      const { count: voteCount } = await supabase
        .from("votes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("poll_id", p.poll_id);

      return {
        poll: poll!,
        is_anonymous: p.is_anonymous,
        completed_at: p.completed_at,
        vote_count: voteCount || 0,
        total_pairs: totalPairs,
      };
    })
  );

  return { participations: result.filter((p) => p.poll !== null) };
}

// Create a new poll with randomly selected options (admin only)
export async function createPollWithRandomOptions(data: {
  title: string;
  numChoices: number;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be logged in" };
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return { error: "Only admins can create polls" };
  }

  // Get all available options
  const { data: allOptions, error: optionsError } = await supabase
    .from("options")
    .select("id");

  if (optionsError || !allOptions || allOptions.length === 0) {
    return { error: "No options available" };
  }

  if (data.numChoices > allOptions.length) {
    return { error: `Only ${allOptions.length} options available` };
  }

  if (data.numChoices < 2) {
    return { error: "Poll must have at least 2 choices" };
  }

  // Shuffle and pick random options
  const shuffled = [...allOptions].sort(() => Math.random() - 0.5);
  const selectedOptionIds = shuffled.slice(0, data.numChoices).map((o) => o.id);

  // Create the poll
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .insert({
      title: data.title,
      description: null,
      created_by: user.id,
      is_active: true,
    })
    .select()
    .single();

  if (pollError || !poll) {
    console.error("Error creating poll:", pollError);
    return { error: "Failed to create poll" };
  }

  // Add options to the poll
  const pollOptions = selectedOptionIds.map((optionId) => ({
    poll_id: poll.id,
    option_id: optionId,
  }));

  const { error: insertError } = await supabase
    .from("poll_options")
    .insert(pollOptions);

  if (insertError) {
    console.error("Error adding poll options:", insertError);
    // Clean up the poll if options failed
    await supabase.from("polls").delete().eq("id", poll.id);
    return { error: "Failed to add options to poll" };
  }

  revalidatePath("/polls");
  revalidatePath("/admin/polls");

  return { success: true, pollId: poll.id };
}

// Create a new poll (admin only)
export async function createPoll(data: {
  title: string;
  description?: string;
  optionIds: string[];
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be logged in" };
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return { error: "Only admins can create polls" };
  }

  // Create the poll
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .insert({
      title: data.title,
      description: data.description || null,
      created_by: user.id,
      is_active: true,
    })
    .select()
    .single();

  if (pollError || !poll) {
    console.error("Error creating poll:", pollError);
    return { error: "Failed to create poll" };
  }

  // Add options to the poll
  const pollOptions = data.optionIds.map((optionId) => ({
    poll_id: poll.id,
    option_id: optionId,
  }));

  const { error: optionsError } = await supabase
    .from("poll_options")
    .insert(pollOptions);

  if (optionsError) {
    console.error("Error adding poll options:", optionsError);
    // Clean up the poll if options failed
    await supabase.from("polls").delete().eq("id", poll.id);
    return { error: "Failed to add options to poll" };
  }

  revalidatePath("/polls");
  revalidatePath("/admin/polls");

  return { success: true, pollId: poll.id };
}

// Create a new poll with custom option names (admin only)
export async function createPollWithCustomOptions(data: {
  title: string;
  optionNames: string[];
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be logged in" };
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return { error: "Only admins can create polls" };
  }

  if (data.optionNames.length < 2) {
    return { error: "Poll must have at least 2 options" };
  }

  // Create the options first
  const optionsToInsert = data.optionNames.map((name) => ({
    name: name.trim(),
    description: null,
    image_url: null,
  }));

  const { data: createdOptions, error: optionsCreateError } = await supabase
    .from("options")
    .insert(optionsToInsert)
    .select();

  if (optionsCreateError || !createdOptions) {
    console.error("Error creating options:", optionsCreateError);
    return { error: "Failed to create options" };
  }

  // Create the poll
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .insert({
      title: data.title,
      description: null,
      created_by: user.id,
      is_active: true,
    })
    .select()
    .single();

  if (pollError || !poll) {
    console.error("Error creating poll:", pollError);
    // Clean up created options
    await supabase.from("options").delete().in("id", createdOptions.map((o) => o.id));
    return { error: "Failed to create poll" };
  }

  // Add options to the poll
  const pollOptions = createdOptions.map((option) => ({
    poll_id: poll.id,
    option_id: option.id,
  }));

  const { error: insertError } = await supabase
    .from("poll_options")
    .insert(pollOptions);

  if (insertError) {
    console.error("Error adding poll options:", insertError);
    // Clean up
    await supabase.from("polls").delete().eq("id", poll.id);
    await supabase.from("options").delete().in("id", createdOptions.map((o) => o.id));
    return { error: "Failed to add options to poll" };
  }

  revalidatePath("/polls");
  revalidatePath("/admin/polls");

  return { success: true, pollId: poll.id };
}

// Delete a poll (admin only)
export async function deletePoll(pollId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be logged in" };
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return { error: "Only admins can delete polls" };
  }

  // Delete votes for this poll first (due to FK constraints)
  await supabase.from("votes").delete().eq("poll_id", pollId);

  // Delete poll participants
  await supabase.from("poll_participants").delete().eq("poll_id", pollId);

  // Delete poll options
  await supabase.from("poll_options").delete().eq("poll_id", pollId);

  // Delete the poll
  const { error } = await supabase.from("polls").delete().eq("id", pollId);

  if (error) {
    console.error("Error deleting poll:", error);
    return { error: "Failed to delete poll" };
  }

  revalidatePath("/polls");
  revalidatePath("/admin/polls");

  return { success: true };
}

// Toggle poll active status (admin only)
export async function togglePollActive(pollId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be logged in" };
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return { error: "Only admins can modify polls" };
  }

  // Get current status
  const { data: poll } = await supabase
    .from("polls")
    .select("is_active")
    .eq("id", pollId)
    .single();

  if (!poll) {
    return { error: "Poll not found" };
  }

  // Toggle status
  const { error } = await supabase
    .from("polls")
    .update({ is_active: !poll.is_active })
    .eq("id", pollId);

  if (error) {
    console.error("Error toggling poll status:", error);
    return { error: "Failed to update poll" };
  }

  revalidatePath("/polls");
  revalidatePath("/admin/polls");

  return { success: true, is_active: !poll.is_active };
}

// Update per-poll anonymity setting
export async function updatePollAnonymity(pollId: string, isAnonymous: boolean) {
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
    .update({ is_anonymous: isAnonymous })
    .eq("poll_id", pollId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating anonymity:", error);
    return { error: "Failed to update anonymity setting" };
  }

  revalidatePath("/my-polls");

  return { success: true };
}

// Get leaderboard for a specific poll
export async function getPollLeaderboard(pollId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leaderboard")
    .select("*")
    .eq("poll_id", pollId)
    .order("rank");

  if (error) {
    console.error("Error fetching leaderboard:", error);
    return { error: "Failed to fetch leaderboard", leaderboard: [] as LeaderboardEntry[] };
  }

  const leaderboard: LeaderboardEntry[] = (data || [])
    .filter(
      (entry): entry is NonNullable<typeof entry> & { id: string; name: string } =>
        entry.id !== null && entry.name !== null
    )
    .map((entry) => ({
      id: entry.id!,
      name: entry.name!,
      description: entry.description,
      image_url: entry.image_url,
      poll_id: entry.poll_id!,
      win_points: entry.win_points ?? 0,
      loss_points: entry.loss_points ?? 0,
      net_score: entry.net_score ?? 0,
      win_count: entry.win_count ?? 0,
      loss_count: entry.loss_count ?? 0,
      rank: entry.rank ?? 0,
    }));

  return { leaderboard };
}

// Get pair consensus for a specific poll
export async function getPollConsensus(pollId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pair_consensus")
    .select("*")
    .eq("poll_id", pollId)
    .order("win_percentage", { ascending: false });

  if (error) {
    console.error("Error fetching consensus:", error);
    return { error: "Failed to fetch consensus", consensus: [] as PairConsensus[] };
  }

  const consensus: PairConsensus[] = (data || [])
    .filter(
      (entry): entry is NonNullable<typeof entry> & { pair_hash: string } =>
        entry.pair_hash !== null
    )
    .map((entry) => ({
      poll_id: entry.poll_id!,
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

// Get user votes for a specific poll
export async function getUserPollVotes(pollId: string) {
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
    .eq("user_id", user.id)
    .eq("poll_id", pollId);

  if (error) {
    console.error("Error fetching votes:", error);
    return { error: "Failed to fetch votes", votes: [] };
  }

  return { votes: votes || [] };
}

// Check if user is admin
export async function checkIsAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { isAdmin: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return { isAdmin: profile?.is_admin || false };
}

// Get poll options for a specific poll
export async function getPollOptions(pollId: string) {
  const supabase = await createClient();

  const { data: pollOptions, error: pollOptionsError } = await supabase
    .from("poll_options")
    .select("option_id")
    .eq("poll_id", pollId);

  if (pollOptionsError) {
    console.error("Error fetching poll options:", pollOptionsError);
    return { error: "Failed to fetch poll options", options: [] as Option[] };
  }

  const optionIds = (pollOptions || []).map((po) => po.option_id);

  if (optionIds.length === 0) {
    return { options: [] as Option[] };
  }

  const { data: options, error: optionsError } = await supabase
    .from("options")
    .select("*")
    .in("id", optionIds)
    .order("name");

  if (optionsError) {
    console.error("Error fetching options:", optionsError);
    return { error: "Failed to fetch options", options: [] as Option[] };
  }

  return { options: options || [] };
}

// Get public voters for a poll (non-anonymous participants)
export async function getPollPublicVoters(pollId: string) {
  const supabase = await createClient();

  const { data: participants, error } = await supabase
    .from("poll_participants")
    .select("user_id, completed_at")
    .eq("poll_id", pollId)
    .eq("is_anonymous", false);

  if (error) {
    console.error("Error fetching participants:", error);
    return { error: "Failed to fetch participants", voters: [] };
  }

  if (!participants || participants.length === 0) {
    return { voters: [] };
  }

  // Get profile details for each participant
  const userIds = participants.map((p) => p.user_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", userIds);

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
    return { error: "Failed to fetch profiles", voters: [] };
  }

  const voters = (profiles || []).map((profile) => {
    const participation = participants.find((p) => p.user_id === profile.id);
    return {
      id: profile.id,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      completed_at: participation?.completed_at,
    };
  });

  return { voters };
}

// Get user's detailed votes with option names for a poll
export async function getUserPollVotesDetailed(pollId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be logged in", votes: [] };
  }

  // Get votes
  const { data: votes, error: votesError } = await supabase
    .from("votes")
    .select("*")
    .eq("user_id", user.id)
    .eq("poll_id", pollId);

  if (votesError) {
    console.error("Error fetching votes:", votesError);
    return { error: "Failed to fetch votes", votes: [] };
  }

  if (!votes || votes.length === 0) {
    return { votes: [] };
  }

  // Get all option IDs from votes
  const optionIds = new Set<string>();
  votes.forEach((v) => {
    optionIds.add(v.winner_id);
    optionIds.add(v.loser_id);
  });

  // Get option details
  const { data: options, error: optionsError } = await supabase
    .from("options")
    .select("id, name")
    .in("id", Array.from(optionIds));

  if (optionsError) {
    console.error("Error fetching options:", optionsError);
    return { error: "Failed to fetch options", votes: [] };
  }

  const optionMap = new Map(options?.map((o) => [o.id, o.name]) || []);

  // Build detailed votes
  const detailedVotes = votes.map((v) => ({
    id: v.id,
    winner_id: v.winner_id,
    winner_name: optionMap.get(v.winner_id) || "Unknown",
    loser_id: v.loser_id,
    loser_name: optionMap.get(v.loser_id) || "Unknown",
    conviction_score: v.conviction_score,
    created_at: v.created_at,
  }));

  return { votes: detailedVotes };
}

// Get user's participation info for a specific poll
export async function getUserPollParticipation(pollId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be logged in", participation: null };
  }

  const { data: participation, error } = await supabase
    .from("poll_participants")
    .select("*")
    .eq("poll_id", pollId)
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching participation:", error);
    return { error: "Failed to fetch participation", participation: null };
  }

  return { participation: participation || null };
}

// Get a specific user's votes for a poll (public viewing)
export async function getPublicUserPollVotes(pollId: string, oderId: string) {
  const supabase = await createClient();

  // Check if voter is public (not anonymous) for this poll
  const { data: participation } = await supabase
    .from("poll_participants")
    .select("is_anonymous")
    .eq("poll_id", pollId)
    .eq("user_id", oderId)
    .single();

  if (!participation || participation.is_anonymous) {
    return { error: "Voter is anonymous", votes: [], voter: null };
  }

  // Get voter profile
  const { data: voter } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", oderId)
    .single();

  if (!voter) {
    return { error: "Voter not found", votes: [], voter: null };
  }

  // Get votes
  const { data: votes, error: votesError } = await supabase
    .from("votes")
    .select("*")
    .eq("user_id", oderId)
    .eq("poll_id", pollId);

  if (votesError) {
    console.error("Error fetching votes:", votesError);
    return { error: "Failed to fetch votes", votes: [], voter: null };
  }

  if (!votes || votes.length === 0) {
    return { votes: [], voter };
  }

  // Get all option IDs from votes
  const optionIds = new Set<string>();
  votes.forEach((v) => {
    optionIds.add(v.winner_id);
    optionIds.add(v.loser_id);
  });

  // Get option details
  const { data: options } = await supabase
    .from("options")
    .select("id, name")
    .in("id", Array.from(optionIds));

  const optionMap = new Map(options?.map((o) => [o.id, o.name]) || []);

  // Build detailed votes
  const detailedVotes = votes.map((v) => ({
    id: v.id,
    winner_id: v.winner_id,
    winner_name: optionMap.get(v.winner_id) || "Unknown",
    loser_id: v.loser_id,
    loser_name: optionMap.get(v.loser_id) || "Unknown",
    conviction_score: v.conviction_score,
    created_at: v.created_at,
  }));

  return { votes: detailedVotes, voter };
}

// Compute personal leaderboard from a user's votes
export async function getUserPollPersonalLeaderboard(pollId: string, userId?: string) {
  const supabase = await createClient();

  // If no userId provided, use current user
  let targetUserId = userId;
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated", leaderboard: [] };
    }
    targetUserId = user.id;
  }

  // Get user's votes for this poll
  const { data: votes, error: votesError } = await supabase
    .from("votes")
    .select("*")
    .eq("user_id", targetUserId)
    .eq("poll_id", pollId);

  if (votesError) {
    console.error("Error fetching votes:", votesError);
    return { error: "Failed to fetch votes", leaderboard: [] };
  }

  if (!votes || votes.length === 0) {
    return { leaderboard: [] };
  }

  // Get all option IDs from votes
  const optionIds = new Set<string>();
  votes.forEach((v) => {
    optionIds.add(v.winner_id);
    optionIds.add(v.loser_id);
  });

  // Get option details
  const { data: options } = await supabase
    .from("options")
    .select("*")
    .in("id", Array.from(optionIds));

  if (!options) {
    return { leaderboard: [] };
  }

  // Calculate scores for each option based on user's votes
  const scores = new Map<string, { winPoints: number; lossPoints: number; winCount: number; lossCount: number }>();

  options.forEach((o) => {
    scores.set(o.id, { winPoints: 0, lossPoints: 0, winCount: 0, lossCount: 0 });
  });

  votes.forEach((v) => {
    const winnerScore = scores.get(v.winner_id);
    const loserScore = scores.get(v.loser_id);
    if (winnerScore) {
      winnerScore.winPoints += v.conviction_score;
      winnerScore.winCount += 1;
    }
    if (loserScore) {
      loserScore.lossPoints += v.conviction_score;
      loserScore.lossCount += 1;
    }
  });

  // Build leaderboard
  const leaderboard: LeaderboardEntry[] = options.map((o) => {
    const score = scores.get(o.id) || { winPoints: 0, lossPoints: 0, winCount: 0, lossCount: 0 };
    return {
      id: o.id,
      name: o.name,
      description: o.description,
      image_url: o.image_url,
      poll_id: pollId,
      win_points: score.winPoints,
      loss_points: score.lossPoints,
      net_score: score.winPoints - score.lossPoints,
      win_count: score.winCount,
      loss_count: score.lossCount,
      rank: 0, // Will be set after sorting
    };
  });

  // Sort by net score and assign ranks
  leaderboard.sort((a, b) => b.net_score - a.net_score);
  leaderboard.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return { leaderboard };
}

// Get all polls with options for community view
export async function getAllPollsWithOptions() {
  const supabase = await createClient();

  const { data: polls, error: pollsError } = await supabase
    .from("polls")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (pollsError) {
    console.error("Error fetching polls:", pollsError);
    return { error: "Failed to fetch polls", polls: [] as PollWithOptions[] };
  }

  // Get options and participant count for each poll
  const pollsWithOptions: PollWithOptions[] = await Promise.all(
    (polls || []).map(async (poll) => {
      const { data: pollOptions } = await supabase
        .from("poll_options")
        .select("option_id")
        .eq("poll_id", poll.id);

      const optionIds = (pollOptions || []).map((po) => po.option_id);

      const { data: options } = await supabase
        .from("options")
        .select("*")
        .in("id", optionIds.length > 0 ? optionIds : ["none"])
        .order("name");

      const { count } = await supabase
        .from("poll_participants")
        .select("*", { count: "exact", head: true })
        .eq("poll_id", poll.id);

      return {
        ...poll,
        options: options || [],
        participant_count: count || 0,
      };
    })
  );

  return { polls: pollsWithOptions };
}
