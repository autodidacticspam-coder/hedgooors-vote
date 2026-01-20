"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Trophy, ArrowRight } from "lucide-react";

interface DetailedVote {
  id: string;
  winner_id: string;
  winner_name: string;
  loser_id: string;
  loser_name: string;
  conviction_score: number;
  created_at: string;
}

interface MyVotesListProps {
  votes: DetailedVote[];
}

export function MyVotesList({ votes }: MyVotesListProps) {
  // Sort by conviction score descending
  const sortedVotes = [...votes].sort((a, b) => b.conviction_score - a.conviction_score);

  return (
    <div className="space-y-3">
      {sortedVotes.map((vote, index) => (
        <motion.div
          key={vote.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Trophy className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium truncate">{vote.winner_name}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground truncate">{vote.loser_name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <ConvictionBadge score={vote.conviction_score} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ConvictionBadge({ score }: { score: number }) {
  const getVariant = () => {
    if (score >= 8) return "bg-emerald-500 text-white";
    if (score >= 5) return "bg-blue-500 text-white";
    if (score >= 3) return "bg-amber-500 text-white";
    return "bg-slate-400 text-white";
  };

  const getLabel = () => {
    if (score >= 8) return "Strong";
    if (score >= 5) return "Moderate";
    if (score >= 3) return "Slight";
    return "Neutral";
  };

  return (
    <Badge className={`${getVariant()} min-w-[80px] justify-center`}>
      {score}/10 {getLabel()}
    </Badge>
  );
}
