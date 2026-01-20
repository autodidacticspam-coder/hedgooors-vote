import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { ResultsDashboard } from "@/components/results-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPoll, getPollLeaderboard, getPollConsensus, getPollPublicVoters } from "@/app/actions/polls";
import { getProfile } from "@/app/actions/profile";
import Link from "next/link";
import { ArrowLeft, Users, CheckCircle, Clock } from "lucide-react";

interface CommunityPollPageProps {
  params: Promise<{ pollId: string }>;
}

export default async function CommunityPollPage({ params }: CommunityPollPageProps) {
  const { pollId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const [{ poll }, { leaderboard }, { consensus }, { voters }, { profile }] = await Promise.all([
    getPoll(pollId),
    getPollLeaderboard(pollId),
    getPollConsensus(pollId),
    getPollPublicVoters(pollId),
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
            <Link href="/community">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Community
              </Button>
            </Link>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">{poll.title}</h1>
            {poll.description && (
              <p className="text-muted-foreground">{poll.description}</p>
            )}
          </div>

          {/* Public Voters */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Public Voters ({voters.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {voters.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No public voters yet. Users can make their votes public in My Polls.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {voters.map((voter) => (
                    <Link
                      key={voter.id}
                      href={`/community/${pollId}/voter/${voter.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={voter.avatar_url || undefined} />
                        <AvatarFallback>
                          {(voter.display_name || "U")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {voter.display_name || "Anonymous"}
                        </p>
                        {voter.completed_at ? (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Completed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            In Progress
                          </Badge>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          <ResultsDashboard leaderboard={leaderboard} consensus={consensus} />
        </div>
      </main>
    </div>
  );
}
