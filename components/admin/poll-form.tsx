"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createPollWithCustomOptions } from "@/app/actions/polls";
import { Loader2, Plus, X } from "lucide-react";

export function PollForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pairCount = options.filter(o => o.trim()).length > 1
    ? (options.filter(o => o.trim()).length * (options.filter(o => o.trim()).length - 1)) / 2
    : 0;

  const addOption = () => {
    setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Please enter a poll title");
      return;
    }

    const validOptions = options.map(o => o.trim()).filter(o => o);

    if (validOptions.length < 2) {
      setError("Please enter at least 2 options");
      return;
    }

    // Check for duplicates
    const uniqueOptions = new Set(validOptions.map(o => o.toLowerCase()));
    if (uniqueOptions.size !== validOptions.length) {
      setError("Option names must be unique");
      return;
    }

    setIsSubmitting(true);

    const result = await createPollWithCustomOptions({
      title: title.trim(),
      optionNames: validOptions,
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.push("/admin/polls");
  };

  const validOptionCount = options.filter(o => o.trim()).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Poll Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Poll Title *
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter poll title"
              disabled={isSubmitting}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Poll Options</CardTitle>
            <Badge variant="outline">
              {validOptionCount} options → {pairCount} pairs
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter the names for each option in this poll. Users will compare each pair.
          </p>

          <div className="space-y-3">
            {options.map((option, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2"
              >
                <span className="text-sm text-muted-foreground w-6">
                  {index + 1}.
                </span>
                <Input
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  disabled={isSubmitting}
                  className="flex-1"
                />
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(index)}
                    disabled={isSubmitting}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </motion.div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addOption}
            disabled={isSubmitting}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Option
          </Button>
        </CardContent>
      </Card>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm"
        >
          {error}
        </motion.div>
      )}

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || validOptionCount < 2}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Create Poll
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
