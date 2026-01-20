import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getPoll, getPublicUserPollVotes, getUserPollPersonalLeaderboard } from "@/app/actions/polls";
import { getProfile } from "@/app/actions/profile";
import Link from "next/link";
import { ArrowLeft, Vote, User } from "lucide-react";
import { MyVotesList } from "@/components/my-votes-list";
import { PersonalResultsDashboard } from "@/components/personal-results-dashboard";

interface VoterDetailPageProps {
  params: Promise<{ pollId: string; voterId: string }>;
}

export default async function VoterDetailPage({ params }: VoterDetailPageProps) {
  const { pollId, voterId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const [{ poll }, { votes, voter }, { leaderboard }, { profile }] = await Promise.all([
    getPoll(pollId),
    getPublicUserPollVotes(pollId, voterId),
    getUserPollPersonalLeaderboard(pollId, voterId),
    getProfile(),
  ]);

  if (!poll) {
    notFound();
  }

  if (!voter) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar user={user} profile={profile} />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <Link href={`/community/${pollId}`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Poll
                </Button>
              </Link>
            </div>
            <div className="text-center py-12">
              <User className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h1 className="text-2xl font-bold mb-2">Voter Not Found</h1>
              <p className="text-muted-foreground">
                This voter is anonymous or doesn&apos;t exist.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} profile={profile} />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link href={`/community/${pollId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Poll
              </Button>
            </Link>
          </div>

          {/* Voter Info */}
          <div className="text-center mb-8">
            <Avatar className="h-20 w-20 mx-auto mb-4">
              <AvatarImage src={voter.avatar_url || undefined} />
              <AvatarFallback className="text-2xl">
                {(voter.display_name || "U")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-3xl font-bold mb-2">
              {voter.display_name || "Anonymous"}&apos;s Votes
            </h1>
            <p className="text-muted-foreground">{poll.title}</p>
          </div>

          {/* Personal Leaderboard & Distribution */}
          {leaderboard.length > 0 && (
            <div className="mb-8">
              <PersonalResultsDashboard
                leaderboard={leaderboard}
                voterName={voter.display_name || "This voter"}
              />
            </div>
          )}

          {/* Vote Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Vote className="w-5 h-5" />
                Pairwise Comparisons ({votes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {votes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No votes recorded yet.
                  </p>
                </div>
              ) : (
                <MyVotesList votes={votes} />
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
