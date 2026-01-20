"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ChevronRight, CheckCircle, BarChart3 } from "lucide-react";
import type { PollWithOptions } from "@/lib/types/database";

interface PollCardProps {
  poll: PollWithOptions;
  index?: number;
  isCompleted?: boolean;
  linkPrefix?: string;
}

export function PollCard({ poll, index = 0, isCompleted = false, linkPrefix = "/polls" }: PollCardProps) {
  const optionCount = poll.options?.length || 0;
  const pairCount = optionCount > 1 ? (optionCount * (optionCount - 1)) / 2 : 0;

  // Determine the link based on the prefix
  const getLink = () => {
    if (linkPrefix === "/polls") {
      return isCompleted ? `/polls/${poll.id}/results` : `/polls/${poll.id}/vote`;
    }
    // For community and my-polls, just link to the poll detail page
    return `${linkPrefix}/${poll.id}`;
  };

  const getButtonText = () => {
    if (linkPrefix === "/polls") {
      return isCompleted ? "View Results" : "Start Voting";
    }
    if (linkPrefix === "/community") {
      return "View Results";
    }
    return "View My Votes";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">{poll.title}</CardTitle>
              {poll.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {poll.description}
                </p>
              )}
            </div>
            {isCompleted && linkPrefix === "/polls" && (
              <Badge className="bg-emerald-500 text-white">
                <CheckCircle className="w-3 h-3 mr-1" />
                Completed
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <BarChart3 className="w-4 h-4" />
              <span>{optionCount} options</span>
            </div>
            <span className="text-muted-foreground/50">|</span>
            <span>{pairCount} comparisons</span>
            {poll.participant_count !== undefined && poll.participant_count > 0 && (
              <>
                <span className="text-muted-foreground/50">|</span>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{poll.participant_count} participants</span>
                </div>
              </>
            )}
          </div>

          {poll.options && poll.options.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {poll.options.slice(0, 5).map((option) => (
                <Badge key={option.id} variant="secondary" className="text-xs">
                  {option.name}
                </Badge>
              ))}
              {poll.options.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{poll.options.length - 5} more
                </Badge>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Link href={getLink()} className="flex-1">
              <Button variant={linkPrefix === "/polls" && !isCompleted ? "default" : "outline"} className="w-full">
                {getButtonText()}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
