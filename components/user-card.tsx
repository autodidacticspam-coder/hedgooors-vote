"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Trophy, ChevronRight } from "lucide-react";
import Link from "next/link";

interface UserVote {
  winnerId: string;
  winnerName: string;
  loserId: string;
  loserName: string;
  conviction: number;
}

interface UserCardProps {
  userId: string;
  displayName: string;
  votes: UserVote[];
  totalVotes: number;
  index: number;
}

export function UserCard({
  userId,
  displayName,
  votes,
  totalVotes,
  index,
}: UserCardProps) {
  // Calculate user's top pick (most wins with highest conviction)
  const winCounts = votes.reduce(
    (acc, vote) => {
      acc[vote.winnerName] = (acc[vote.winnerName] || 0) + vote.conviction;
      return acc;
    },
    {} as Record<string, number>
  );

  const topPick = Object.entries(winCounts).sort((a, b) => b[1] - a[1])[0];

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/community/${userId}`}>
        <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-primary/10 text-primary">
                  {initials || <User className="w-4 h-4" />}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{displayName}</p>
                <p className="text-sm text-muted-foreground">
                  {totalVotes} votes
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {topPick && (
                <Badge variant="secondary" className="gap-1">
                  <Trophy className="w-3 h-3 text-amber-500" />
                  {topPick[0]}
                </Badge>
              )}
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
