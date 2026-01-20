import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { Sparkles, Vote, BarChart3, EyeOff } from "lucide-react";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/vote");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-primary/10">
                <Sparkles className="w-12 h-12 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Hedgooor Vote
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Express not just <em>what</em> you prefer, but <em>how strongly</em> you
              prefer it. Our conviction-based system captures the intensity of
              your preferences.
            </p>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="p-6 rounded-xl bg-card border">
              <Vote className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Pairwise Comparison</h3>
              <p className="text-muted-foreground">
                Compare options two at a time for more nuanced and accurate
                preference data.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-card border">
              <BarChart3 className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Conviction Scoring</h3>
              <p className="text-muted-foreground">
                Rate your conviction from 0-10 to indicate the strength of your
                preference.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-card border">
              <EyeOff className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Privacy Controls</h3>
              <p className="text-muted-foreground">
                Toggle anonymous mode to hide your individual votes while still
                contributing to totals.
              </p>
            </div>
          </div>

          {/* Auth */}
          <AuthForm />
        </div>
      </div>
    </div>
  );
}
