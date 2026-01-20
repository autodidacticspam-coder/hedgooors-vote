"use client";

import { motion } from "framer-motion";
import { PollCard } from "@/components/poll-card";
import { Vote } from "lucide-react";
import type { PollWithOptions } from "@/lib/types/database";

interface PollListProps {
  polls: PollWithOptions[];
  completedPollIds?: Set<string>;
  emptyMessage?: string;
  linkPrefix?: string;
}

export function PollList({
  polls,
  completedPollIds = new Set(),
  emptyMessage = "No polls available yet.",
  linkPrefix = "/polls"
}: PollListProps) {
  if (polls.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12"
      >
        <Vote className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </motion.div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {polls.map((poll, index) => (
        <PollCard
          key={poll.id}
          poll={poll}
          index={index}
          isCompleted={completedPollIds.has(poll.id)}
          linkPrefix={linkPrefix}
        />
      ))}
    </div>
  );
}
