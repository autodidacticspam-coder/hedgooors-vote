"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Convert username to internal email format
function usernameToEmail(username: string): string {
  return `${username.toLowerCase().trim()}@hedgooor.local`;
}

export async function signIn(username: string, password: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });

  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      return { error: "Invalid username or password" };
    }
    return { error: error.message };
  }

  redirect("/vote");
}

export async function signUp(username: string, password: string) {
  const supabase = await createClient();

  // Validate username
  const trimmedUsername = username.trim();
  if (trimmedUsername.length < 3) {
    return { error: "Username must be at least 3 characters" };
  }
  if (trimmedUsername.length > 20) {
    return { error: "Username must be at most 20 characters" };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
    return { error: "Username can only contain letters, numbers, and underscores" };
  }

  const email = usernameToEmail(trimmedUsername);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: trimmedUsername,
        display_name: trimmedUsername,
      },
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { error: "Username already taken" };
    }
    return { error: error.message };
  }

  // If we got a user but no session, email confirmation might be required
  // Try to sign in directly
  if (data.user && !data.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // Email confirmation is likely required - this shouldn't happen if configured correctly
      return { error: "Account created but unable to sign in. Please try signing in manually." };
    }
  }

  redirect("/vote");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function deleteAccount() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  // Delete user's votes first (cascade should handle this, but being explicit)
  await supabase.from("votes").delete().eq("user_id", user.id);

  // Delete user's profile
  await supabase.from("profiles").delete().eq("id", user.id);

  // Delete the auth user using admin API
  const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

  if (deleteError) {
    // If admin delete fails, try signing out and let them know
    await supabase.auth.signOut();
    return { error: "Account data deleted. Please contact support to fully remove your account." };
  }

  redirect("/");
}
