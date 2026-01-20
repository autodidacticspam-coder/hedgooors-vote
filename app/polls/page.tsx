import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { PollList } from "@/components/poll-list";
import { getAvailablePolls, getUserPolls } from "@/app/actions/polls";
import { getProfile } from "@/app/actions/profile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PollWithOptions } from "@/lib/types/database";

export default async function PollsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const [{ polls: availablePolls }, { participations }, { profile }] = await Promise.all([
    getAvailablePolls(),
    getUserPolls(),
    getProfile(),
  ]);

  // Convert participations to PollWithOptions format for completed polls
  const completedPolls: PollWithOptions[] = participations
    .filter((p) => p.completed_at)
    .map((p) => ({
      ...p.poll,
      options: [],
      participant_count: undefined,
    }));

  const completedPollIds = new Set(completedPolls.map((p) => p.id));

  // In-progress polls (started but not completed)
  const inProgressPolls: PollWithOptions[] = participations
    .filter((p) => !p.completed_at && p.vote_count > 0)
    .map((p) => ({
      ...p.poll,
      options: [],
      participant_count: undefined,
    }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} profile={profile} />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Polls</h1>
            <p className="text-muted-foreground">
              Browse and participate in conviction-based polls
            </p>
          </div>

          <Tabs defaultValue="available" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
              <TabsTrigger value="available">
                Available ({availablePolls.length})
              </TabsTrigger>
              <TabsTrigger value="in-progress">
                In Progress ({inProgressPolls.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({completedPolls.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="available">
              <PollList
                polls={availablePolls}
                emptyMessage="You've completed all available polls. Check back later for new ones!"
              />
            </TabsContent>

            <TabsContent value="in-progress">
              <PollList
                polls={inProgressPolls}
                emptyMessage="No polls in progress. Start voting on an available poll!"
              />
            </TabsContent>

            <TabsContent value="completed">
              <PollList
                polls={completedPolls}
                completedPollIds={completedPollIds}
                emptyMessage="You haven't completed any polls yet."
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
