"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { updateAnonymousMode } from "@/app/actions/profile";
import { EyeOff, Eye, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AnonymousToggleProps {
  initialValue: boolean;
}

export function AnonymousToggle({ initialValue }: AnonymousToggleProps) {
  const [isAnonymous, setIsAnonymous] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (checked: boolean) => {
    setIsAnonymous(checked);
    startTransition(async () => {
      const result = await updateAnonymousMode(checked);
      if (result.error) {
        // Revert on error
        setIsAnonymous(!checked);
        console.error(result.error);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={isAnonymous ? "hidden" : "visible"}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {isAnonymous ? (
                  <EyeOff className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Eye className="w-5 h-5 text-primary" />
                )}
              </motion.div>
            </AnimatePresence>
            <div>
              <CardTitle className="text-lg">Anonymous Mode</CardTitle>
              <CardDescription>
                Hide your individual votes from other users
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <Switch
              checked={isAnonymous}
              onCheckedChange={handleToggle}
              disabled={isPending}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          <motion.div
            key={isAnonymous ? "anon" : "public"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-lg bg-muted"
          >
            {isAnonymous ? (
              <div className="space-y-2">
                <Badge variant="secondary" className="mb-2">
                  <EyeOff className="w-3 h-3 mr-1" /> Anonymous
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Your votes are private. Other users cannot see your individual
                  preferences, but your votes still count toward the global
                  totals.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Badge className="mb-2">
                  <Eye className="w-3 h-3 mr-1" /> Public
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Your votes are visible to other users. They can see your
                  individual preferences and conviction levels in the results
                  dashboard.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
