import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { PollManager } from "@/components/admin/poll-manager";
import { getAllPolls, checkIsAdmin } from "@/app/actions/polls";
import { getProfile } from "@/app/actions/profile";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";

export default async function AdminPollsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { isAdmin } = await checkIsAdmin();

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar user={user} profile={null} />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto text-center py-12">
            <Shield className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-6">
              You don&apos;t have permission to access the admin area.
            </p>
            <Link href="/polls">
              <Button>Go to Polls</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const [{ polls }, { profile }] = await Promise.all([
    getAllPolls(),
    getProfile(),
  ]);

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

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Poll Administration</h1>
            <p className="text-muted-foreground">
              Create and manage polls for your community
            </p>
          </div>

          <PollManager polls={polls} />
        </div>
      </main>
    </div>
  );
}
