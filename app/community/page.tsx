import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { PollList } from "@/components/poll-list";
import { getAllPollsWithOptions } from "@/app/actions/polls";
import { getProfile } from "@/app/actions/profile";

export default async function CommunityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const [{ polls }, { profile }] = await Promise.all([
    getAllPollsWithOptions(),
    getProfile(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} profile={profile} />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Community</h1>
            <p className="text-muted-foreground">
              View poll results and see how others voted
            </p>
          </div>

          <PollList
            polls={polls}
            linkPrefix="/community"
            emptyMessage="No polls available yet."
          />
        </div>
      </main>
    </div>
  );
}
