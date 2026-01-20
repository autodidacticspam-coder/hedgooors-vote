"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { togglePollActive, deletePoll } from "@/app/actions/polls";
import {
  Plus,
  BarChart3,
  CheckCircle,
  XCircle,
  Trash2,
  Loader2,
} from "lucide-react";
import type { Poll } from "@/lib/types/database";

interface PollManagerProps {
  polls: Poll[];
}

export function PollManager({ polls }: PollManagerProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">All Polls</h2>
        <Link href="/admin/polls/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Poll
          </Button>
        </Link>
      </div>

      {polls.length === 0 ? (
        <div className="text-center py-12">
          <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-4">No polls created yet.</p>
          <Link href="/admin/polls/new">
            <Button>Create Your First Poll</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {polls.map((poll, index) => (
            <PollManagerCard key={poll.id} poll={poll} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}

interface PollManagerCardProps {
  poll: Poll;
  index: number;
}

function PollManagerCard({ poll, index }: PollManagerCardProps) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(poll.is_active);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleActiveToggle = async () => {
    setIsUpdating(true);
    const result = await togglePollActive(poll.id);
    if (!result.error && result.is_active !== undefined) {
      setIsActive(result.is_active);
    }
    setIsUpdating(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deletePoll(poll.id);
    if (!result.error) {
      router.refresh();
    }
    setIsDeleting(false);
    setShowDeleteConfirm(false);
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
              <CardTitle className="text-lg">{poll.title}</CardTitle>
              {poll.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {poll.description}
                </p>
              )}
            </div>
            {isActive ? (
              <Badge className="bg-emerald-500 text-white">
                <CheckCircle className="w-3 h-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge variant="secondary">
                <XCircle className="w-3 h-3 mr-1" />
                Inactive
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                Created: {new Date(poll.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Active</span>
                <Switch
                  checked={isActive}
                  onCheckedChange={handleActiveToggle}
                  disabled={isUpdating}
                />
              </div>
              <Link href={`/polls/${poll.id}/results`}>
                <Button variant="outline" size="sm">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Results
                </Button>
              </Link>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Confirm"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
