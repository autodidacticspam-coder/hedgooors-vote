import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { ResultsDashboard } from "@/components/results-dashboard";
import { getPoll, getPollLeaderboard, getPollConsensus } from "@/app/actions/polls";
import { getProfile } from "@/app/actions/profile";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface PollResultsPageProps {
  params: Promise<{ pollId: string }>;
}

export default async function PollResultsPage({ params }: PollResultsPageProps) {
  const { pollId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const [{ poll }, { leaderboard }, { consensus }, { profile }] = await Promise.all([
    getPoll(pollId),
    getPollLeaderboard(pollId),
    getPollConsensus(pollId),
    getProfile(),
  ]);

  if (!poll) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} profile={profile} />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link href="/polls">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Polls
              </Button>
            </Link>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">{poll.title} - Results</h1>
            {poll.description && (
              <p className="text-muted-foreground">{poll.description}</p>
            )}
          </div>

          <ResultsDashboard leaderboard={leaderboard} consensus={consensus} />
        </div>
      </main>
    </div>
  );
}
