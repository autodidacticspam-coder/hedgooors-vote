import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getPoll, getUserPollVotesDetailed, getUserPollParticipation, getUserPollPersonalLeaderboard } from "@/app/actions/polls";
import { getProfile } from "@/app/actions/profile";
import Link from "next/link";
import { ArrowLeft, Vote, Eye, EyeOff } from "lucide-react";
import { MyVotesList } from "@/components/my-votes-list";
import { PersonalResultsDashboard } from "@/components/personal-results-dashboard";
import { AnonymityToggle } from "@/components/anonymity-toggle";

interface MyPollDetailPageProps {
  params: Promise<{ pollId: string }>;
}

export default async function MyPollDetailPage({ params }: MyPollDetailPageProps) {
  const { pollId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const [{ poll }, { votes }, { participation }, { leaderboard }, { profile }] = await Promise.all([
    getPoll(pollId),
    getUserPollVotesDetailed(pollId),
    getUserPollParticipation(pollId),
    getUserPollPersonalLeaderboard(pollId),
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
            <Link href="/my-polls">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to My Polls
              </Button>
            </Link>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">{poll.title}</h1>
            {poll.description && (
              <p className="text-muted-foreground">{poll.description}</p>
            )}
          </div>

          {/* Anonymity Setting */}
          {participation && (
            <Card className="mb-6">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {participation.is_anonymous ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">
                      {participation.is_anonymous
                        ? "Your votes are hidden from others"
                        : "Your votes are visible to others"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Anonymous</span>
                    <AnonymityToggle
                      pollId={pollId}
                      initialValue={participation.is_anonymous}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Personal Rankings & Distribution */}
          {leaderboard.length > 0 && (
            <div className="mb-8">
              <PersonalResultsDashboard
                leaderboard={leaderboard}
                voterName="My"
              />
            </div>
          )}

          {/* My Votes */}
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
                  <p className="text-muted-foreground mb-4">
                    You haven&apos;t voted on any comparisons yet.
                  </p>
                  <Link href={`/polls/${pollId}/vote`}>
                    <Button>Start Voting</Button>
                  </Link>
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
