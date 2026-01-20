"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { updatePollAnonymity } from "@/app/actions/polls";

interface AnonymityToggleProps {
  pollId: string;
  initialValue: boolean;
}

export function AnonymityToggle({ pollId, initialValue }: AnonymityToggleProps) {
  const [isAnonymous, setIsAnonymous] = useState(initialValue);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setIsUpdating(true);
    const result = await updatePollAnonymity(pollId, checked);
    if (!result.error) {
      setIsAnonymous(checked);
    }
    setIsUpdating(false);
  };

  return (
    <Switch
      checked={isAnonymous}
      onCheckedChange={handleToggle}
      disabled={isUpdating}
    />
  );
}
