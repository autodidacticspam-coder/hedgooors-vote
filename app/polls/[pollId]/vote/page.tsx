import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { PairwisePoller } from "@/components/pairwise-poller";
import { getPoll, getPollOptions, getUserPollVotes } from "@/app/actions/polls";
import { getProfile } from "@/app/actions/profile";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface PollVotePageProps {
  params: Promise<{ pollId: string }>;
}

export default async function PollVotePage({ params }: PollVotePageProps) {
  const { pollId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const [{ poll }, { options }, { votes }, { profile }] = await Promise.all([
    getPoll(pollId),
    getPollOptions(pollId),
    getUserPollVotes(pollId),
    getProfile(),
  ]);

  if (!poll) {
    notFound();
  }

  if (!poll.is_active) {
    redirect(`/polls/${pollId}/results`);
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} profile={profile} />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Link href="/polls">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Polls
              </Button>
            </Link>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">{poll.title}</h1>
            {poll.description && (
              <p className="text-muted-foreground">{poll.description}</p>
            )}
          </div>

          {options.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No options available for this poll yet.
              </p>
            </div>
          ) : (
            <PairwisePoller
              options={options}
              existingVotes={votes}
              pollId={pollId}
              pollTitle={poll.title}
            />
          )}
        </div>
      </main>
    </div>
  );
}
