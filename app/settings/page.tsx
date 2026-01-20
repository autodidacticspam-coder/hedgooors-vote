import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { AnonymousToggle } from "@/components/anonymous-toggle";
import { DeleteAccountButton } from "@/components/delete-account-button";
import { getProfile } from "@/app/actions/profile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Calendar } from "lucide-react";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { profile } = await getProfile();

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} profile={profile} />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-muted-foreground">
              Manage your profile and privacy preferences
            </p>
          </div>

          {/* Profile Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Your account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Display Name</span>
                </div>
                <span className="font-medium">
                  {profile?.display_name || "Not set"}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Member Since</span>
                </div>
                <span className="font-medium">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <AnonymousToggle initialValue={profile?.is_anonymous ?? false} />

          {/* Info */}
          <Card>
            <CardHeader>
              <CardTitle>About Privacy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <Badge variant="outline">Global Totals</Badge>
                <p>
                  Your votes always count toward the global leaderboard totals,
                  regardless of your privacy setting.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline">Individual View</Badge>
                <p>
                  When anonymous mode is OFF, other users can see your specific
                  votes and conviction levels in the individual rankings.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline">RLS Enforced</Badge>
                <p>
                  Privacy is enforced at the database level using Row Level
                  Security, ensuring your choices are respected server-side.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <DeleteAccountButton />
        </div>
      </main>
    </div>
  );
}
