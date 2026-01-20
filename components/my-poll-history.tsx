"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { updatePollAnonymity } from "@/app/actions/polls";
import {
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  ChevronRight,
  Vote,
} from "lucide-react";
import type { UserPollParticipation } from "@/lib/types/database";

interface MyPollHistoryProps {
  participations: UserPollParticipation[];
}

export function MyPollHistory({ participations }: MyPollHistoryProps) {
  if (participations.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12"
      >
        <Vote className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">
          You haven&apos;t participated in any polls yet.
        </p>
        <Link href="/polls" className="inline-block mt-4">
          <Button>Browse Available Polls</Button>
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {participations.map((participation, index) => (
        <PollParticipationCard
          key={participation.poll.id}
          participation={participation}
          index={index}
        />
      ))}
    </div>
  );
}

interface PollParticipationCardProps {
  participation: UserPollParticipation;
  index: number;
}

function PollParticipationCard({ participation, index }: PollParticipationCardProps) {
  const [isAnonymous, setIsAnonymous] = useState(participation.is_anonymous);
  const [isUpdating, setIsUpdating] = useState(false);

  const isCompleted = participation.completed_at !== null;
  const progress =
    participation.total_pairs > 0
      ? (participation.vote_count / participation.total_pairs) * 100
      : 0;

  const handleAnonymityToggle = async (checked: boolean) => {
    setIsUpdating(true);
    const result = await updatePollAnonymity(participation.poll.id, checked);
    if (!result.error) {
      setIsAnonymous(checked);
    }
    setIsUpdating(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{participation.poll.title}</CardTitle>
              {participation.poll.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {participation.poll.description}
                </p>
              )}
            </div>
            {isCompleted ? (
              <Badge className="bg-emerald-500 text-white">
                <CheckCircle className="w-3 h-3 mr-1" />
                Completed
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Clock className="w-3 h-3 mr-1" />
                In Progress
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {participation.vote_count} of {participation.total_pairs} comparisons
              </span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              {isAnonymous ? (
                <EyeOff className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Eye className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-sm">
                {isAnonymous ? "Votes are hidden from others" : "Votes visible to others"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Anonymous</span>
              <Switch
                checked={isAnonymous}
                onCheckedChange={handleAnonymityToggle}
                disabled={isUpdating}
              />
            </div>
          </div>

          <div className="flex gap-2">
            {!isCompleted && (
              <Link href={`/polls/${participation.poll.id}/vote`} className="flex-1">
                <Button className="w-full">
                  Continue Voting
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            )}
            <Link
              href={`/my-polls/${participation.poll.id}`}
              className={isCompleted ? "flex-1" : ""}
            >
              <Button variant="outline" className="w-full">
                View My Votes
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
