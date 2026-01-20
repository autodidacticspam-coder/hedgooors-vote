import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { MyPollHistory } from "@/components/my-poll-history";
import { getUserPolls } from "@/app/actions/polls";
import { getProfile } from "@/app/actions/profile";

export default async function MyPollsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const [{ participations }, { profile }] = await Promise.all([
    getUserPolls(),
    getProfile(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} profile={profile} />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">My Polls</h1>
            <p className="text-muted-foreground">
              View your poll history and manage anonymity settings
            </p>
          </div>

          <MyPollHistory participations={participations} />
        </div>
      </main>
    </div>
  );
}
